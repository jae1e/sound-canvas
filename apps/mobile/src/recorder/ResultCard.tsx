import { Pressable, Text, View } from 'react-native';
import type { TakeAnalysis } from '../../modules/vc-audio/src/VcAudio.types';
import { useTranslation } from '../i18n';
import { nextTip, rangeLabel, stabilityLabel } from './derive';
import { formatDuration } from './SingControls';
function ResultChip({
  children,
  color,
  background,
}: {
  children: string;
  color: string;
  background: string;
}) {
  return (
    <Text
      style={{
        color,
        backgroundColor: background,
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        fontSize: 11,
        fontWeight: '700',
        overflow: 'hidden',
      }}
    >
      {children}
    </Text>
  );
}
export function ResultCard({
  analysis,
  durationMs,
  onPress,
}: {
  analysis: TakeAnalysis;
  durationMs: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        padding: 12,
        marginBottom: 4,
        backgroundColor: '#171C25',
        borderColor: '#293243',
        borderWidth: 1,
        borderRadius: 18,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
        <Text style={{ color: '#E8EBF1', fontWeight: '700', fontSize: 12 }}>
          {t('common.coach.justRecorded')} · {formatDuration(durationMs)}
        </Text>
        <Text style={{ color: '#8A93A5', fontSize: 12 }}>{t('common.coach.details')} ›</Text>
      </View>
      <ResultDetails analysis={analysis} theme="dark" />
    </Pressable>
  );
}

export function ResultDetails({ analysis, theme }: { analysis: TakeAnalysis; theme: 'dark' | 'light' }) {
  const { t } = useTranslation();
  const stable = analysis.stabilityCents !== null && analysis.stabilityCents <= 25;
  const offsetGood = analysis.beatOffsetMs !== null && Math.abs(analysis.beatOffsetMs) <= 80;
  const dark = theme === 'dark';
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        <ResultChip
          color={dark ? '#CBD1DC' : '#55585F'}
          background={dark ? '#27303D' : '#E8E6E0'}
        >{`${t('common.coach.range')} ${rangeLabel(analysis.rangeLowMidi, analysis.rangeHighMidi) ?? '—'}`}</ResultChip>
        <ResultChip color={stable ? '#5EEAD4' : '#FBBF24'} background={stable ? '#173A33' : '#40371E'}>
          {t(`common.coach.stability.${stabilityLabel(analysis.stabilityCents)}`)}
        </ResultChip>
        {analysis.beatOffsetMs !== null && (
          <ResultChip
            color={offsetGood ? '#5EEAD4' : '#FBBF24'}
            background={offsetGood ? '#173A33' : '#40371E'}
          >{`${t('common.coach.beat')} ${analysis.beatOffsetMs >= 0 ? '+' : ''}${Math.round(analysis.beatOffsetMs)} ms`}</ResultChip>
        )}
      </View>
      <Text style={{ color: dark ? '#AAB2C1' : '#6C6F78', fontSize: 12, marginTop: 7 }}>
        <Text style={{ fontWeight: '800', color: dark ? '#E8EBF1' : '#1B1D22' }}>
          {t('common.coach.next')}{' '}
        </Text>
        {t(`common.coach.tip.${nextTip(analysis.stabilityCents, analysis.beatOffsetMs)}`)}
      </Text>
    </View>
  );
}
