import type { SpeechPlan } from './types';

/** Fill null section budgets proportional to key-point count. Floors to 5s, then distributes remainder in 5s steps and final milliseconds so the total is exact; each allocation is at least 15s when feasible. Existing budgets are preserved. */
export function autoSplitBudgets(plan: SpeechPlan): SpeechPlan {
  const open = plan.sections.map((s, i) => ({ s, i })).filter(({ s }) => s.budgetMs === null);
  if (!open.length)
    return { ...plan, sections: plan.sections.map((s) => ({ ...s, keyPoints: [...s.keyPoints] })) };
  const fixed = plan.sections.reduce((n, s) => n + (s.budgetMs ?? 0), 0);
  const remaining = Math.max(0, plan.targetMs - fixed);
  const weights = open.map(({ s }) => Math.max(1, s.keyPoints.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (remaining * w) / totalWeight);
  const alloc = raw.map((n) => Math.max(15000, Math.floor(n / 5000) * 5000));
  // If minimums/rounding overshoot, remove 5s chunks from the largest eligible allocations.
  while (alloc.reduce((a, b) => a + b, 0) > remaining && alloc.some((n) => n > 15000)) {
    const i = alloc.indexOf(Math.max(...alloc));
    if (alloc[i]! <= 15000) break;
    alloc[i]! -= 5000;
  }
  // Exact-sum guarantee: remaining milliseconds are applied to the last section; if infeasible
  // (less than 15s per section), proportional allocation takes precedence over the minimum.
  if (alloc.reduce((a, b) => a + b, 0) > remaining) {
    let left = remaining;
    for (let i = 0; i < alloc.length; i++) {
      const n = i === alloc.length - 1 ? left : Math.floor((remaining * weights[i]!) / totalWeight);
      alloc[i] = n;
      left -= n;
    }
  } else alloc[alloc.length - 1]! += remaining - alloc.reduce((a, b) => a + b, 0);
  const sections = plan.sections.map((s) => ({ ...s, keyPoints: [...s.keyPoints] }));
  open.forEach(({ i }, j) => {
    sections[i]!.budgetMs = alloc[j]!;
  });
  return { ...plan, sections };
}
