import {
  classifyPace,
  paceBand,
  rollingEnglishWpm,
  rollingPace,
  type PaceBand,
  type SpeechPlan,
} from '@vlc/voice-analysis';
import { useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { FrameEvent } from '../../modules/vc-audio/src/VcAudio.types';
import { useTranslation } from '../i18n';
import { RecordButton } from '../recorder/RecordButton';
import { formatDuration } from '../recorder/SingControls';
import type { RingBuffer } from '../recorder/ringBuffer';
import { VoiceStrip } from './VoiceStrip';

export function ActivePractice({
  plan,
  target,
  startMs,
  sectionIndex,
  sectionStart,
  frames,
  busy,
  onNext,
  onStop,
  hidePace,
  baseline,
  prompt,
  language,
}: {
  plan: SpeechPlan | null;
  target: number;
  startMs: number;
  sectionIndex: number;
  sectionStart: number;
  frames: RefObject<RingBuffer<FrameEvent>>;
  busy: boolean;
  onNext: () => void;
  onStop: () => void;
  hidePace: boolean;
  baseline: PaceBand | null;
  prompt?: string;
  language: 'ko' | 'en';
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => VcAudio.nowMs());
  const [scrolling, setScrolling] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scriptScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const lastTick = useRef(startMs);
  useEffect(() => {
    const timer = setInterval(() => setNow(VcAudio.nowMs()), 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const delta = Math.max(0, now - lastTick.current);
    lastTick.current = now;
    if (!scrolling || !target) return;
    offset.current = Math.min(
      Math.max(0, contentHeight - viewportHeight),
      offset.current + (delta / target) * Math.max(0, contentHeight - viewportHeight),
    );
    scriptScroll.current?.scrollTo({ y: offset.current, animated: false });
  }, [now, scrolling, target, contentHeight, viewportHeight]);
  const elapsed = Math.max(0, now - startMs);
  const ratio = target ? elapsed / target : 0;
  const color = ratio > 1 ? '#FF3B30' : ratio >= 0.9 ? '#D97706' : '#1B1D22';
  const current = plan?.sections[sectionIndex];
  const nuclei = frames.current
    .values()
    .filter((f) => f.syllable && !f.beatMasked && f.tMs >= startMs)
    .map((f) => f.tMs);
  const lang = plan?.lang === 'en' || plan?.lang === 'ko' ? plan.lang : language;
  const syllables = rollingPace(nuclei, now);
  const pace = lang === 'en' ? rollingEnglishWpm(syllables) : syllables;
  const band = baseline ?? paceBand(lang);
  const paceStatus = classifyPace(pace, band);
  const progress = plan?.sections.length
    ? Math.min(
        1,
        sectionIndex / plan.sections.length +
          (current?.budgetMs
            ? Math.min(1, Math.max(0, elapsed - sectionStart) / current.budgetMs) / plan.sections.length
            : 0),
      )
    : 0;
  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <View style={{ alignItems: 'center', paddingTop: 20 }}>
        <Text style={{ color, fontSize: 66, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {formatDuration(elapsed)}
          <Text style={{ color: '#9A9DA6', fontSize: 20 }}>
            {' '}
            {target ? `/ ${formatDuration(target)}` : ''}
          </Text>
        </Text>
      </View>
      {!!plan?.sections.length && (
        <View style={{ height: 7, backgroundColor: '#E3E1DC', borderRadius: 5, marginVertical: 12 }}>
          <View
            style={{ height: 7, width: `${progress * 100}%`, borderRadius: 5, backgroundColor: '#4F46E5' }}
          />
        </View>
      )}
      {plan?.kind === 'script' && !!plan.script ? (
        <Pressable
          onPress={() => {
            setScrolling(!scrolling);
          }}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: '#FFF',
            borderRadius: 20,
            padding: 16,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: '#6C6F78', fontSize: 12 }}>
            {t(scrolling ? 'speak.scrollRunning' : 'speak.scrollPaused')}
          </Text>
          <ScrollView
            ref={scriptScroll}
            scrollEnabled={false}
            onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => setContentHeight(h)}
          >
            <Text style={{ color: '#1B1D22', fontSize: 27, lineHeight: 42, fontWeight: '700' }}>
              {plan.script}
            </Text>
          </ScrollView>
        </Pressable>
      ) : current ? (
        <Pressable
          onPress={onNext}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: '#FFF',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#ECE9E2',
            padding: 18,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#4F46E5', fontWeight: '800' }}>
              {sectionIndex + 1} / {plan?.sections.length}
            </Text>
            {current.budgetMs !== null && (
              <Text style={{ color: '#6C6F78' }}>
                {t('speak.remaining', {
                  time: formatDuration(Math.max(0, current.budgetMs - (elapsed - sectionStart))),
                })}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1B1D22', marginVertical: 12 }}>
            {current.name}
          </Text>
          {current.keyPoints.filter(Boolean).map((point, i) => (
            <Text key={i} style={{ fontSize: 18, lineHeight: 30, color: '#1B1D22' }}>
              • {point}
            </Text>
          ))}
          <Text style={{ color: '#9A9DA6', marginTop: 'auto', textAlign: 'center' }}>
            {t('speak.nextSection')}
          </Text>
        </Pressable>
      ) : prompt ? (
        <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 18 }}>
          <Text style={{ color: '#1B1D22', fontSize: 23, fontWeight: '800', lineHeight: 34 }}>{prompt}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {!hidePace && (
        <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', color: '#1B1D22' }}>{t('speak.pace')}</Text>
            <Text style={{ color: paceStatus === 'good' ? '#059669' : '#D97706' }}>
              {t(`speak.${paceStatus}`)} · {pace.toFixed(1)}{' '}
              {t(lang === 'ko' ? 'speak.syllablesPerSecond' : 'speak.wordsPerMinute')}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#F3D778', marginTop: 14 }}>
            <View
              style={{
                position: 'absolute',
                left: '33%',
                width: '34%',
                height: 8,
                backgroundColor: '#6DD2AE',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: `${Math.min(98, Math.max(0, (pace / (band.fastAbove * 1.5)) * 100))}%`,
                top: -4,
                width: 3,
                height: 16,
                backgroundColor: '#1B1D22',
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            {(['slow', 'good', 'fast'] as const).map((key) => (
              <Text key={key} style={{ color: '#9A9DA6', fontSize: 11 }}>
                {t(`speak.${key}`)}
              </Text>
            ))}
          </View>
        </View>
      )}
      <VoiceStrip frames={frames} />
      <View style={{ alignItems: 'center', paddingBottom: 16 }}>
        <RecordButton theme="light" recording disabled={busy} label={t('speak.stop')} onPress={onStop} />
        <Text style={{ color: '#6C6F78', marginTop: 5 }}>{t('speak.stop')}</Text>
      </View>
    </View>
  );
}
