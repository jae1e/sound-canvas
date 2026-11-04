/**
 * Background synthesis queue for the session voice. Items are keyed like the native clip cache (language + text), so a
 * phrase enqueued twice is synthesized once. Order: priority, then the time the audio is needed by, then arrival.
 * The queue only decides order and bookkeeping; synthesis itself runs natively, one item at a time.
 */
export type SynthPriority = 'urgent' | 'soon' | 'normal' | 'background';
const RANK: Record<SynthPriority, number> = { urgent: 0, soon: 1, normal: 2, background: 3 };

export type SynthRequest = {
  text: string;
  lang: string;
  priority?: SynthPriority;
  /** Epoch ms by which the clip must exist. Overdue items are dropped (nobody will play them). */
  needByMs?: number;
  /** Ordering inside the same priority and deadline (for example the narration sentence index). */
  order?: number;
};

export type SynthItem = {
  key: string;
  text: string;
  lang: string;
  priority: SynthPriority;
  needByMs: number | null;
  order: number;
  attempts: number;
  seq: number;
};

export const synthKey = (lang: string, text: string): string => `${lang.startsWith('en') ? 'en' : 'ko'}|${text.trim()}`;

/** Priority from how soon the clip is needed. */
export function priorityForDeadline(needByMs: number | undefined, nowMs: number): SynthPriority {
  if (needByMs === undefined) return 'normal';
  const left = needByMs - nowMs;
  if (left <= 15_000) return 'urgent';
  if (left <= 120_000) return 'soon';
  return 'normal';
}

export type EnqueueResult = 'added' | 'upgraded' | 'duplicate' | 'cached' | 'empty';

export class SynthQueue {
  private waiting = new Map<string, SynthItem>();
  private done = new Set<string>();
  private failedKeys = new Set<string>();
  private known = new Map<string, SynthRequest>();
  private seq = 0;

  constructor(private readonly maxAttempts = 3) {}

  get size(): number {
    return this.waiting.size;
  }
  isCached(lang: string, text: string): boolean {
    return this.done.has(synthKey(lang, text));
  }
  failed(): string[] {
    return [...this.failedKeys];
  }

  enqueue(req: SynthRequest, nowMs: number): EnqueueResult {
    const text = req.text.trim();
    if (!text) return 'empty';
    const key = synthKey(req.lang, text);
    this.known.set(key, { ...req, text });
    if (this.done.has(key)) return 'cached';
    const priority = req.priority ?? priorityForDeadline(req.needByMs, nowMs);
    const existing = this.waiting.get(key);
    if (existing) {
      const higher = RANK[priority] < RANK[existing.priority];
      const earlier = req.needByMs !== undefined && (existing.needByMs === null || req.needByMs < existing.needByMs);
      if (!higher && !earlier) return 'duplicate';
      if (higher) existing.priority = priority;
      if (earlier) existing.needByMs = req.needByMs ?? null;
      return 'upgraded';
    }
    this.failedKeys.delete(key);
    this.waiting.set(key, { key, text, lang: req.lang, priority, needByMs: req.needByMs ?? null, order: req.order ?? 0, attempts: 0, seq: this.seq++ });
    return 'added';
  }

  private static compare(a: SynthItem, b: SynthItem): number {
    return (
      RANK[a.priority] - RANK[b.priority] ||
      (a.needByMs ?? Infinity) - (b.needByMs ?? Infinity) ||
      a.order - b.order ||
      a.seq - b.seq
    );
  }

  /** Removes and returns overdue items. */
  pruneStale(nowMs: number): SynthItem[] {
    const out: SynthItem[] = [];
    for (const [k, it] of this.waiting) {
      if (it.needByMs !== null && it.needByMs < nowMs) {
        out.push(it);
        this.waiting.delete(k);
      }
    }
    return out;
  }

  /** The next item to synthesize (removed from the waiting set; report back with [complete]). */
  next(nowMs: number): SynthItem | null {
    this.pruneStale(nowMs);
    let best: SynthItem | null = null;
    for (const it of this.waiting.values()) if (!best || SynthQueue.compare(it, best) < 0) best = it;
    if (!best) return null;
    this.waiting.delete(best.key);
    return best;
  }

  /** Records a result. A failed item is retried with the same engine until [maxAttempts]; returns true when it was re-queued. */
  complete(item: SynthItem, ok: boolean): boolean {
    if (ok) {
      this.done.add(item.key);
      return false;
    }
    item.attempts += 1;
    if (item.attempts >= this.maxAttempts) {
      this.failedKeys.add(item.key);
      return false;
    }
    this.waiting.set(item.key, item);
    return true;
  }

  /** Marks a phrase as already available (cache hit reported by the native side). */
  markCached(lang: string, text: string): void {
    const key = synthKey(lang, text);
    this.done.add(key);
    this.waiting.delete(key);
  }

  /** The session voice changed: nothing synthesized so far is usable. Everything still relevant is queued again. */
  resetForNewVoice(nowMs: number): number {
    this.done.clear();
    this.failedKeys.clear();
    this.waiting.clear();
    let n = 0;
    for (const req of this.known.values()) {
      if (req.needByMs !== undefined && req.needByMs < nowMs) continue;
      if (this.enqueue(req, nowMs) === 'added') n++;
    }
    return n;
  }

  clear(): void {
    this.waiting.clear();
    this.done.clear();
    this.failedKeys.clear();
    this.known.clear();
  }
}
