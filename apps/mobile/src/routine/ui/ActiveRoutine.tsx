import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PACING_LEVELS } from '../../settings/schema';

import { Banner, Button, Card, Chip } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { useSettings } from '../../settings/store';
import { colors, shared, space } from '../../theme';
import { routineController, useRoutine } from '../instance';
import { deriveRoutineView } from '../view';

/** The running routine: big current item, next item, tempo, large controls, pacing level and live transcript. */
export function ActiveRoutine() {
  const { t } = useTranslation();
  const s = useRoutine();
  const update = useSettings((x) => x.update);
  const [note, setNote] = useState('');
  const run = s.run!;
  const v = deriveRoutineView(run, run.lang);
  const paused = s.phase === 'paused';
  const preparing = s.phase === 'preparing';

  const setLevel = (level: (typeof PACING_LEVELS)[number]) => {
    update({ pacingLevel: level });
    void routineController.setLevel(level);
  };
  const confirmEnd = () =>
    Alert.alert(t('routine.active.endConfirmTitle'), t('routine.active.endConfirmBody'), [
      { text: t('routine.active.cancel'), style: 'cancel' },
      { text: t('routine.active.end'), style: 'destructive', onPress: () => routineController.end() },
    ]);

  if (preparing) {
    const p = s.prepare;
    return (
      <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
        <Text style={shared.h1}>{t('routine.prepare.title')}</Text>
        <Text style={shared.muted}>{t('routine.prepare.hint')}</Text>
        <Text style={styles.big}>{p && p.total > 0 ? `${p.done} / ${p.total}` : '...'}</Text>
        {s.notice ? <Banner kind="warn" text={s.notice} /> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content} keyboardShouldPersistTaps="handled">
      {paused ? <Banner kind="warn" text={t('routine.active.paused')} /> : null}
      {s.notice ? <Banner kind="warn" text={`${t('routine.active.notice')}: ${s.notice}`} /> : null}

      <Card>
        {v.setLabel ? <Text style={shared.muted}>{v.setLabel}</Text> : null}
        <Text style={styles.title} accessibilityLiveRegion="polite">
          {v.title}
        </Text>
        {v.subtitle ? <Text style={styles.sub}>{v.subtitle}</Text> : null}
        {v.count ? <Text style={styles.count}>{v.count}</Text> : null}
        {v.movement ? (
          <Text style={shared.body}>
            {t('routine.active.facing', { dir: t(`routine.facing.${v.movement.facing}`) })}
            {v.movement.kihap ? ` · ${t('routine.active.kihap')}` : ''}
          </Text>
        ) : null}
        <View style={styles.tempoRow}>
          <Text style={[shared.h2, { color: colors.primary }]}>{t('routine.active.tempo', { percent: v.tempoPercent })}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(5, (v.tempoPercent / 200) * 100))}%` }]} />
          </View>
        </View>
        {v.next ? (
          <Text style={shared.body}>
            {t('routine.active.next')}: {v.next}
          </Text>
        ) : null}
      </Card>

      <View style={styles.grid}>
        <Button big kind={paused ? 'primary' : 'secondary'} label={paused ? t('routine.active.resume') : t('routine.active.pause')} onPress={() => routineController.exec({ kind: paused ? 'resume' : 'pause' })} />
        <Button big label={t('routine.active.skip')} onPress={() => routineController.exec({ kind: 'skip' })} disabled={paused} />
        <Button big label={t('routine.active.back')} onPress={() => routineController.exec({ kind: 'back' })} disabled={paused} />
        <Button big label={t('routine.active.slower')} onPress={() => routineController.exec({ kind: 'tempo', dir: 'slower' })} />
        <Button big label={t('routine.active.faster')} onPress={() => routineController.exec({ kind: 'tempo', dir: 'faster' })} />
        <Button big kind="danger" label={t('routine.active.end')} onPress={confirmEnd} />
      </View>

      <Card>
        <Text style={shared.h2}>{t('routine.active.pacing')}</Text>
        <View style={[shared.row, { flexWrap: 'wrap' }]}>
          {PACING_LEVELS.map((l) => (
            <Chip key={l} label={t(`routine.active.level.${l}`)} selected={s.level === l} onPress={() => setLevel(l)} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={shared.h2}>{s.listen === 'on' ? t('routine.active.mic') : t('routine.active.micOff')}</Text>
        <Text style={styles.partial} accessibilityLiveRegion="polite">
          {s.partial || (s.listen === 'on' ? t('routine.active.micHint') : '')}
        </Text>
        {s.listenError ? <Banner kind="warn" text={s.listenError} /> : null}
        {s.turns.slice(0, 3).map((row) => (
          <View key={row.id} style={{ gap: 2 }}>
            <Text style={shared.body}>{row.heard}</Text>
            {row.reply ? <Text style={shared.muted}>{row.reply}</Text> : null}
          </View>
        ))}
        <TextInput style={shared.input} value={note} onChangeText={setNote} placeholder={t('routine.active.noteBox')} accessibilityLabel={t('routine.active.noteBox')} />
        <Button
          label={t('routine.active.noteAdd')}
          disabled={!note.trim()}
          onPress={() => {
            routineController.addCorrectionFromText(note.trim());
            setNote('');
          }}
        />
      </Card>

      {s.pick ? (
        <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
          <Text style={shared.h2}>{t('routine.active.pickTitle')}</Text>
          <Text style={shared.muted}>{s.pick.text}</Text>
          <View style={[shared.row, { flexWrap: 'wrap' }]}>
            {s.pick.candidates.map((c, i) => (
              <Chip key={i} label={c.kind === 'movement' ? t('routine.editor.target.movement', { no: c.no }) : t('routine.editor.target.routine')} onPress={() => routineController.pickTarget(c)} />
            ))}
            <Chip label={t('routine.editor.target.routine')} onPress={() => routineController.pickTarget({ kind: 'routine' })} />
            <Chip label={t('routine.active.cancel')} onPress={() => routineController.cancelPick()} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 40, fontWeight: '700', color: colors.text, textAlign: 'center' },
  title: { fontSize: 40, fontWeight: '800', color: colors.text },
  sub: { fontSize: 20, color: colors.text },
  count: { fontSize: 56, fontWeight: '800', color: colors.primary },
  tempoRow: { gap: space.xs },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  partial: { fontSize: 18, color: colors.text, minHeight: 28 },
});
