import { apply, createSession } from '../src/engine';
import type { Action, ActionEnvelope } from '../src/actions';
import type { Session } from '../src/types';

export const T0 = 1_000_000;
export const MIN = 60_000;

export function harness(start = T0) {
  let n = 0;
  let now = start;
  const newId = () => `id${++n}`;
  let session: Session = createSession({ id: 's1', mode: 'activity', lang: 'en', now });
  return {
    get session() {
      return session;
    },
    set session(s: Session) {
      session = s;
    },
    get now() {
      return now;
    },
    at(t: number) {
      now = t;
    },
    advance(ms: number) {
      now += ms;
    },
    /** Applies an action, expecting success, and commits the new session. */
    do(action: Action, extra: Partial<ActionEnvelope> = {}) {
      const r = apply(session, { action, source: 'voice', ...extra }, { now, newId });
      if (!r.ok) throw new Error(`rejected: ${r.reason} ${r.message ?? ''}`);
      session = r.session;
      return r;
    },
    try(action: Action, extra: Partial<ActionEnvelope> = {}) {
      return apply(session, { action, source: 'voice', ...extra }, { now, newId });
    },
  };
}

export function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}
