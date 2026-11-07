import { CATEGORIES, formatDistance, formatDuration, type Lang, type Place } from '@vlc/travel';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Btn, Row, Section } from '../ui';
import { RoutePreview } from './RoutePreview';
import { createTravelClient, type TravelClient } from './client';
import { TravelController, landmarkToPlace, type SpeakFn } from './controller';
import { useGpsFix } from './location';
import { t, type StringKey } from './strings';

export type TravelGuideScreenProps = {
  /** Spoken output goes here. The screen never plays audio itself. */
  onSpeak: SpeakFn;
  /** UI and spoken language. Default 'ko'. A parsed voice intent may switch the spoken language. */
  lang?: Lang;
  /** Defaults to the Worker client from `expo.extra.travel`, or fixtures when not configured. */
  client?: TravelClient;
  /** Pass a shared controller to route voice utterances (`controller.handleUtterance`) into this screen. */
  controller?: TravelController;
  /**
   * Feed this screen's GPS fixes into the controller. Default true. Turn it off when the app already feeds the controller
   * from the session's location events, so fixes are not applied twice.
   */
  feedLocation?: boolean;
  /** Adds a "save place" button to each result; called with the result to store. */
  onSavePlace?: (place: Place) => void;
};

export function TravelGuideScreen({ onSpeak, lang = 'ko', client, controller, feedLocation = true, onSavePlace }: TravelGuideScreenProps) {
  const speakRef = useRef(onSpeak);
  speakRef.current = onSpeak;
  const theClient = useMemo(() => client ?? createTravelClient(), [client]);
  const ctl = useMemo(
    () => controller ?? new TravelController(theClient, (text, l) => speakRef.current(text, l), lang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controller, theClient],
  );
  ctl.lang = lang;
  const s = useSyncExternalStore(ctl.subscribe, ctl.getState);
  const { fix, source, permission } = useGpsFix();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const simIndex = useRef(0);
  const mock = theClient.mode === 'mock';

  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (fix && feedLocation) ctl.setFix(fix);
  }, [fix, ctl, feedLocation]);

  const runSearch = () => ctl.search({ category, query: query.trim() || undefined });
  const dist = (m: number) => formatDistance(m, lang);
  const p = s.progress;

  // Test helper for mock mode: walk the polyline without moving.
  const simulateStep = () => {
    const route = s.route;
    if (!route) return;
    simIndex.current = Math.min(route.polyline.length - 1, simIndex.current + 3);
    const pt = route.polyline[simIndex.current]!;
    ctl.setFix({ lat: pt.lat, lng: pt.lng, accuracyM: 5, timestampMs: Date.now() });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>{t('title', lang)}</Text>

      <Section title={t('position', lang)}>
        {fix ? (
          <Text testID="travel-position">
            {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} · {t('accuracy', lang)} {Math.round(fix.accuracyM)} m
            {fix.accuracyM > 30 ? ` · ${t('weakGps', lang)}` : ''}
          </Text>
        ) : (
          <Text>{permission === 'denied' ? t('permDenied', lang) : t('noFix', lang)}</Text>
        )}
        <Text style={styles.dim}>{source === 'native' ? t('sourceNative', lang) : source === 'expo' ? t('sourceExpo', lang) : ''}</Text>
        {mock && <Text style={styles.warn}>{t('mockMode', lang)}</Text>}
        <Row>
          <Btn label={t('whereAmI', lang)} onPress={() => ctl.whereAmI(true)} testID="travel-where" />
        </Row>
        {s.where && <Text>{s.where.roadAddress || s.where.address || s.where.area}</Text>}
      </Section>

      <Section title={t('search', lang)}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchPlaceholder', lang)}
          returnKeyType="search"
          onSubmitEditing={runSearch}
          testID="travel-query"
        />
        <View style={styles.chips}>
          <Chip label={t('chip_all', lang)} active={!category} onPress={() => setCategory(undefined)} />
          {CATEGORIES.slice(0, 8).map((c) => (
            <Chip key={c.key} label={lang === 'ko' ? c.ko : c.en} active={category === c.key} onPress={() => setCategory(c.key)} />
          ))}
        </View>
        <Btn label={t('search', lang)} onPress={runSearch} disabled={s.busy} testID="travel-search" />
      </Section>

      <Section title={t('landmarks', lang)}>
        <Btn label={t('findLandmarks', lang)} onPress={() => ctl.findLandmarks({}, true)} disabled={s.busy} testID="travel-landmarks" />
        {s.landmarkSearched && s.landmarks.length === 0 && <Text>{t('noLandmarks', lang)}</Text>}
        {s.landmarks.map((l, i) => (
          <View key={l.id} style={[styles.place, s.selectedLandmark?.id === l.id && styles.placeSelected]} accessibilityLabel={`landmark-${i}`}>
            <Text style={styles.placeName}>
              {i + 1}. {l.name}
            </Text>
            <Text style={styles.dim}>
              {formatDistance(l.distanceM, lang)} · {l.category}
            </Text>
            {l.oneLine ? <Text>{l.oneLine}</Text> : null}
            <Text style={styles.dim} testID={`landmark-attribution-${i}`}>
              {l.attribution}
            </Text>
            <Row>
              <Btn label={t('listen', lang)} onPress={() => ctl.describe(l, true)} disabled={s.busy} testID={`landmark-listen-${i}`} />
              <Btn label={t('goThere', lang)} onPress={() => ctl.preview(landmarkToPlace(l), true)} testID={`landmark-go-${i}`} />
            </Row>
          </View>
        ))}
        {s.narration && s.selectedLandmark?.id === s.narration.landmarkId && (
          <Text style={styles.dim} testID="landmark-narration-source">
            {s.narration.detail.attribution}
            {s.narration.detail.sourceUrl ? ` · ${s.narration.detail.sourceUrl}` : ''}
          </Text>
        )}
        {s.narrating && (
          <Row>
            <Text style={styles.dim}>{t('narrating', lang)}</Text>
            <Btn label={t('stopNarration', lang)} onPress={() => ctl.stopNarration()} testID="landmark-stop" />
          </Row>
        )}
        {s.landmarks.length > 0 && <Text style={styles.dim}>{t('voiceHint', lang)}</Text>}
      </Section>

      {s.error && <Text style={styles.err}>{t(`err_${s.error}` as StringKey, lang)}</Text>}

      {s.lastQuery && (
        <Section title={t('results', lang)}>
          {s.places.length === 0 && <Text>{t('noResults', lang)}</Text>}
          {s.places.map((pl, i) => (
            <PlaceRow key={pl.id} place={pl} index={i} lang={lang} selected={s.destination?.id === pl.id} onPress={() => ctl.preview(pl, true)}
              saved={savedIds.has(pl.id)}
              onSave={
                onSavePlace
                  ? () => {
                      onSavePlace(pl);
                      setSavedIds((prev) => new Set(prev).add(pl.id));
                    }
                  : undefined
              }
            />
          ))}
        </Section>
      )}

      {s.route && s.destination && (
        <Section title={`${t('routePreview', lang)}: ${s.destination.name}`}>
          <Text>
            {dist(s.route.distanceM)} · {formatDuration(s.route.durationS, lang)}
          </Text>
          <RoutePreview route={s.route} position={fix} />
          {s.route.steps.map((st, i) => (
            <Text key={i} style={[styles.step, p?.stepIndex === i && styles.stepActive]}>
              {i + 1}. {lang === 'ko' ? st.instruction || st.turn : st.instructionEn || st.turn} · {dist(st.distanceToNextM)}
            </Text>
          ))}
          <Row>
            {!s.navigating ? (
              <Btn label={t('start', lang)} onPress={() => ctl.start()} testID="travel-start" />
            ) : (
              <Btn label={t('stop', lang)} onPress={() => ctl.stop()} testID="travel-stop" />
            )}
            {s.navigating && s.awaitingReroute && <Btn label={t('reroute', lang)} onPress={() => ctl.reroute()} />}
            {mock && s.navigating && <Btn label="▶ test" onPress={simulateStep} />}
          </Row>
        </Section>
      )}

      {s.navigating && p && (
        <Section title={t(`status_${p.status}` as StringKey, lang)}>
          <Text testID="travel-progress">
            {t('remaining', lang)}: {dist(p.remainingM)} · {t('eta', lang)}: {formatDuration(p.etaS, lang)}
          </Text>
          {p.nextStepIndex !== null && s.route?.steps[p.nextStepIndex] && (
            <Text>
              {t('nextTurn', lang)}: {lang === 'ko' ? s.route.steps[p.nextStepIndex]!.instruction : s.route.steps[p.nextStepIndex]!.instructionEn} ({dist(p.distanceToNextManeuverM)})
            </Text>
          )}
          {p.ignored && <Text style={styles.warn}>{t('weakGps', lang)}</Text>}
        </Section>
      )}

      {s.lastSpoken && (
        <Text style={styles.dim}>
          {t('lastSpoken', lang)}: {s.lastSpoken}
        </Text>
      )}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} android_ripple={{ color: '#2a5db024' }} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { backgroundColor: active ? '#214b8d' : '#e8eef8', transform: [{ scale: 0.97 }] }]}>
      <Text style={active ? styles.chipTextActive : undefined}>{label}</Text>
    </Pressable>
  );
}

function PlaceRow({
  place,
  index,
  lang,
  selected,
  onPress,
  saved,
  onSave,
}: {
  place: Place;
  index: number;
  lang: Lang;
  selected: boolean;
  onPress: () => void;
  saved: boolean;
  onSave?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.place, selected && styles.placeSelected, pressed && { opacity: 0.7, transform: [{ scale: 0.99 }] }]} android_ripple={{ color: '#2a5db020' }} accessibilityRole="button" accessibilityLabel={`place-${index}`}>
      <Text style={styles.placeName}>
        {index + 1}. {place.name}
      </Text>
      <Text style={styles.dim}>
        {formatDistance(place.distanceM, lang)} · {place.category} · {place.address}
      </Text>
      {onSave ? (
        <Pressable onPress={onSave} disabled={saved} accessibilityRole="button" accessibilityLabel={`save-place-${index}`} android_ripple={{ color: '#2a5db024' }} style={({ pressed }) => [styles.saveBtn, saved && { opacity: 0.4 }, pressed && !saved && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}>
          <Text style={styles.saveText}>{saved ? t('placeSaved', lang) : t('savePlace', lang)}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: '700' },
  dim: { color: '#666', fontSize: 12 },
  warn: { color: '#b45309' },
  err: { color: '#b91c1c' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTextActive: { color: '#fff' },
  place: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#cbd5e1' },
  placeSelected: { backgroundColor: '#eff6ff' },
  placeName: { fontSize: 16, fontWeight: '600' },
  step: { paddingVertical: 2 },
  saveBtn: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14 },
  saveText: { fontSize: 13, color: '#2563eb' },
  stepActive: { fontWeight: '700', color: '#2563eb' },
});
