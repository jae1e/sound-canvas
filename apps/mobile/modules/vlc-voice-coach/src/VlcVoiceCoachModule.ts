import { NativeModule, requireNativeModule } from 'expo';

import type {
  AnalyzeOptions,
  CaptureInfo,
  NativeTakeAnalysis,
  StartedTake,
  TakeInfo,
  VlcVoiceCoachModuleEvents,
} from './VlcVoiceCoach.types';

declare class VlcVoiceCoachNative extends NativeModule<VlcVoiceCoachModuleEvents> {
  /** Starts the live tracker (`frame` events). Needs RECORD_AUDIO. */
  startMonitor(): Promise<CaptureInfo>;
  stopMonitor(): Promise<void>;
  /** Starts writing a WAV take (also starts the tracker if it is not running). */
  startTake(): Promise<StartedTake>;
  stopTake(): Promise<TakeInfo>;
  listTakes(): Promise<TakeInfo[]>;
  deleteTake(id: string): Promise<boolean>;
  /** Plays on the system route with media attributes. Call only from a user action. */
  playTake(id: string): Promise<void>;
  stopPlayback(): Promise<void>;
  analyzeTake(id: string, options: AnalyzeOptions): Promise<NativeTakeAnalysis>;
}

export default requireNativeModule<VlcVoiceCoachNative>('VlcVoiceCoach');
