/** Native recorder status fields the leave check needs. */
export interface LeaveStatus {
  recording: boolean;
  paused?: boolean;
  memoId?: string;
}

/** Stop when the native recorder is recording (paused included) this very memo. */
export function shouldStopOnLeave(status: LeaveStatus, memoId: string): boolean {
  return status.recording === true && status.memoId === memoId;
}

export type NoSpeechReason = 'silent' | 'no_voice' | 'stock_phrase' | 'echo';

/** i18n key and optional filtered text for a no-speech segment chip. */
export function noSpeechChip(reason: string | null, filteredText: string): { key: 'noSpeechSilent' | 'noSpeechNoVoice' | 'noSpeechStock' | 'noSpeechStockPlain' | 'noSpeechEcho' | 'noSpeechGeneric'; text?: string } {
  switch (reason) {
    case 'silent':
      return { key: 'noSpeechSilent' };
    case 'no_voice':
      return { key: 'noSpeechNoVoice' };
    case 'echo':
      return { key: 'noSpeechEcho' };
    case 'stock_phrase': {
      const t = filteredText.trim();
      return t ? { key: 'noSpeechStock', text: t } : { key: 'noSpeechStockPlain' };
    }
    default:
      return { key: 'noSpeechGeneric' };
  }
}
