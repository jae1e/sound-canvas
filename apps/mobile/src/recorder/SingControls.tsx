import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '../i18n';
import type { BeatSettings } from './BeatSheet';
import { RecordButton } from './RecordButton';

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function BeatDots({ beat, count }: { beat: number; count: number }) {
  return (
    <View
      style={{ height: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: beat === i + 1 ? (i === 0 ? '#FBBF24' : '#5EEAD4') : '#303A4B',
          }}
        />
      ))}
    </View>
  );
}
export function BottomControls({
  beat,
  onBeat,
  recording,
  busy,
  elapsedMs,
  onRecord,
  lastDuration,
  onPlay,
}: {
  beat: BeatSettings;
  onBeat: () => void;
  recording: boolean;
  busy: boolean;
  elapsedMs: number;
  onRecord: () => void;
  lastDuration: number | null;
  onPlay: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ paddingHorizontal: 26, paddingTop: 4, paddingBottom: 12 }}>
      <View style={{ height: 20, alignItems: 'center' }}>
        {recording && (
          <Text style={{ color: '#FF3B30', fontWeight: '700' }}>● {formatDuration(elapsedMs)}</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable
          onPress={onBeat}
          style={({ pressed }) => ({
            width: 76,
            height: 56,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: beat.enabled ? '#288D80' : '#262D3A',
            backgroundColor: '#171C25',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MaterialCommunityIcons name="metronome" size={21} color={beat.enabled ? '#5EEAD4' : '#8A93A5'} />
          <Text style={{ color: beat.enabled ? '#5EEAD4' : '#AAB2C1', fontSize: 11, fontWeight: '700' }}>
            {beat.enabled
              ? `${beat.bpm} · ${t(`common.coach.pattern.${beat.pattern}`)}`
              : t('common.coach.beatOff')}
          </Text>
        </Pressable>
        <RecordButton
          theme="dark"
          recording={recording}
          disabled={busy}
          label={t(recording ? 'common.coach.stop' : 'common.coach.record')}
          onPress={onRecord}
        />
        {lastDuration !== null ? (
          <Pressable
            disabled={recording || busy}
            onPress={onPlay}
            style={({ pressed }) => ({
              width: 76,
              height: 56,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#262D3A',
              backgroundColor: '#171C25',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: recording || busy ? 0.35 : pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="play" size={17} color="#AAB2C1" />
            <Text style={{ color: '#AAB2C1', fontSize: 11, fontWeight: '700' }}>
              {formatDuration(lastDuration)}
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 76 }} />
        )}
      </View>
    </View>
  );
}
