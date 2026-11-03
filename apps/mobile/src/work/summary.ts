import { create } from 'zustand';

/** What the Home screen needs to know about the Work Partner session. The controller keeps it current. */
export interface WorkSummary {
  /** True while a session exists that has not ended (including paused and restored-after-kill sessions). */
  active: boolean;
  status: 'none' | 'ready' | 'active' | 'paused' | 'ended';
  title: string | null;
  stepLabel: string | null;
  stepIndex: number;
  stepTotal: number;
  timersRunning: number;
  /** True while the native foreground session (microphone) is running. */
  listening: boolean;
}

export const EMPTY_WORK_SUMMARY: WorkSummary = {
  active: false,
  status: 'none',
  title: null,
  stepLabel: null,
  stepIndex: 0,
  stepTotal: 0,
  timersRunning: 0,
  listening: false,
};

export const useWorkSummary = create<WorkSummary>(() => EMPTY_WORK_SUMMARY);
