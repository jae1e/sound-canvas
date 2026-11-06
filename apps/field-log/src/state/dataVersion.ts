import { create } from 'zustand';

/** Screens re-query the database when this changes. */
export const useDataVersion = create<{ version: number }>(() => ({ version: 0 }));

let timer: ReturnType<typeof setTimeout> | null = null;

/** Coalesces bursts of writes into one refresh. */
export function bump(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    useDataVersion.setState((s) => ({ version: s.version + 1 }));
  }, 50);
}
