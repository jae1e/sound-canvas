import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native';
import { currentStep, isQuiet, type Session } from '@vlc/session-engine';

import { Banner, Button, Card } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { useSettings } from '../../settings/store';
import { colors, shared, space } from '../../theme';
import { workController, useWork } from '../instance';
import { clock, deriveView } from '../view';
import { PlanEditor } from './PlanEditor';
import { useNow } from './useNow';

const MIN = 60_000;

export function ActiveSession({ session }: { session: Session }) {
  const { t } = useTranslation();
  const now = useNow();
  const level = useSettings((s) => s.settings.nudgeLevel);
  const { listen, listenError, partial, turns, canUndo, missed } = useWork();
  const view = deriveView(session, now, session.lang, level);
  const paused = session.status === 'paused';
  const quiet = isQuiet(session, now);
  const cur = currentStep(session);
  const [editing, setEditing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [fix, setFix] = useState('');
  const [timerLabel, setTimerLabel] = useState('');
  const [timerMin, setTimerMin] = useState('');

  const confirmEnd = () =>
    Alert.alert(t('work.ctl.endConfirmTitle'), t('work.ctl.endConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('work.ctl.end'), style: 'destructive', onPress: () => workController.end() },
    ]);

  const addTimer = () => {
    const minutes = Number(timerMin);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    workController.dispatch({ type: 'start_timer', label: timerLabel.trim() || (session.lang === 'ko' ? '타이머' : 'timer'), durationMs: Math.round(minutes * MIN) }, { speak: true });
    setTimerLabel('');
    setTimerMin('');
  };

  const micState =
    listen === 'on' ? t('work.mic.on') : listen === 'starting' ? t('work.mic.starting') : listen === 'error' ? t('work.mic.error') : t('work.mic.off');

  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content} keyboardShouldPersistTaps="handled">
      {missed.map((m) => (
        <Card key={m.key} style={{ borderColor: colors.warnText, borderWidth: 1 }}>
          <Text style={[shared.h2, { color: colors.warnText }]}>{t('work.session.missed')}</Text>
          <Text style={shared.body}>{m.text}</Text>
          <Button label={t('work.session.dismiss')} onPress={() => workController.acknowledgeMissed(m.key)} kind="primary" />
        </Card>
      ))}

      <View style={shared.row}>
        {paused ? <Banner kind="warn" text={t('work.session.paused')} /> : null}
        {quiet ? (
          <Banner kind="warn" text={view.quietUntil ? t('work.session.quietUntil', { time: new Date(view.quietUntil).toLocaleTimeString() }) : t('work.session.quietOn')} />
        ) : null}
      </View>

      <Card>
        {view.current ? (
          <>
            <Text style={shared.muted}>{t('work.session.stepOf', { index: view.current.index, total: view.steps.length })}</Text>
            <Text style={styles.bigLabel}>{view.current.label}</Text>
            <Text style={shared.body}>
              {t('work.session.elapsed', { elapsed: clock(view.current.elapsedMs) })}
              {view.current.estimateMs !== undefined ? ` · ${t('work.session.estimate', { estimate: clock(view.current.estimateMs) })}` : ''}
            </Text>
            {view.current.estimateMs !== undefined && view.current.elapsedMs > view.current.estimateMs ? (
              <Text style={{ color: colors.warnText, fontWeight: '600' }}>{t('work.session.over')}</Text>
            ) : null}
          </>
        ) : (
          <Text style={shared.h2}>{view.steps.length > 0 ? t('work.session.allDone') : t('work.session.noStep')}</Text>
        )}
        {view.looseTasks.length > 0 ? <Text style={shared.muted}>{view.looseTasks.map((x) => x.label).join(', ')}</Text> : null}
        {view.steps.length > 0 ? (
          <View style={shared.row}>
            <Button label={t('work.ctl.back')} onPress={() => workController.dispatch({ type: 'prev_step' }, { speak: true })} disabled={paused} />
            <Button label={t('work.ctl.skip')} onPress={() => workController.dispatch({ type: 'skip_task', task: { implicit: true } }, { speak: true })} disabled={paused || !cur} />
            <Button label={t('work.ctl.next')} onPress={() => workController.dispatch({ type: 'next_step' }, { speak: true })} kind="primary" disabled={paused} />
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={shared.row}>
          <Text style={[shared.h2, { flex: 1 }]}>{t('work.mic.title')}: {micState}</Text>
          {listen === 'on' ? (
            <Button label={t('work.mic.stop')} onPress={() => void workController.stopListening()} />
          ) : (
            <Button label={t('work.mic.start')} onPress={() => void workController.startListening()} kind="primary" disabled={listen === 'starting'} />
          )}
        </View>
        {listenError ? <Banner kind="warn" text={`${t('work.mic.error')}: ${listenError}`} /> : null}
        <Text style={styles.partial} accessibilityLiveRegion="polite">
          {partial || (listen === 'on' ? t('work.mic.partialHint') : '')}
        </Text>
        {turns.slice(0, 3).map((row) => (
          <View key={row.id} style={styles.turn}>
            <Text style={shared.body}>
              {t('work.mic.heard')}: {row.heard}
            </Text>
            <Text style={shared.muted}>
              {t(`work.mic.outcome.${row.outcome}`)}
              {row.reply ? ` · ${t('work.mic.replied')}: ${row.reply}` : ''}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={shared.h2}>{t('work.session.nextCue')}</Text>
        {view.nextCue ? (
          <>
            <Text style={shared.body}>{view.nextCue.text}</Text>
            <Text style={shared.muted}>{t('work.session.nextCueIn', { time: clock(view.nextCue.atEpochMs - now) })}</Text>
          </>
        ) : (
          <Text style={shared.muted}>{t('work.session.nothingPlanned')}</Text>
        )}
      </Card>

      <Card>
        <Text style={shared.h2}>{t('work.session.timers')}</Text>
        {view.timers.length === 0 ? <Text style={shared.muted}>{t('work.session.noTimers')}</Text> : null}
        {view.timers.map((tm) => (
          <View key={tm.id} style={shared.row}>
            <Text style={[styles.timerClock, tm.state === 'paused' && { opacity: 0.5 }]}>{clock(tm.remainingMs)}</Text>
            <Text style={[shared.body, { flex: 1 }]}>{tm.label}</Text>
            <Button
              label={tm.state === 'running' ? t('work.ctl.pause') : t('work.ctl.resume')}
              onPress={() => workController.dispatch({ type: tm.state === 'running' ? 'pause_timer' : 'resume_timer', timer: { id: tm.id } })}
            />
            <Button label="✕" onPress={() => workController.dispatch({ type: 'cancel_timer', timer: { id: tm.id } })} kind="danger" />
          </View>
        ))}
        <View style={shared.row}>
          <TextInput style={[shared.input, { flex: 1 }]} value={timerLabel} onChangeText={setTimerLabel} placeholder={t('work.session.timerLabel')} />
          <TextInput style={[shared.input, { width: 64 }]} value={timerMin} onChangeText={setTimerMin} keyboardType="number-pad" placeholder={t('work.plan.minutes')} />
          <Button label={t('work.session.addTimer')} onPress={addTimer} disabled={!timerMin} />
        </View>
      </Card>

      {correcting ? (
        <Card>
          <Text style={shared.h2}>{t('work.correct.title')}</Text>
          <Text style={shared.muted}>{t('work.correct.hint')}</Text>
          <TextInput style={shared.input} value={fix} onChangeText={setFix} placeholder={t('work.correct.placeholder')} autoFocus />
          <View style={shared.row}>
            <Button label={t('common.cancel')} onPress={() => setCorrecting(false)} />
            <Button
              label={t('work.correct.apply')}
              kind="primary"
              onPress={() => {
                workController.correct(fix);
                setCorrecting(false);
              }}
            />
          </View>
        </Card>
      ) : null}

      <View style={styles.controls}>
        <Button
          big
          label={quiet ? t('work.ctl.quietOff') : t('work.ctl.quiet')}
          active={quiet}
          onPress={() => workController.setQuiet(!quiet)}
        />
        <Button big label={t('work.ctl.quiet10')} onPress={() => workController.setQuiet(true, 10 * MIN)} />
        <Button
          big
          label={paused ? t('work.ctl.resume') : t('work.ctl.pause')}
          onPress={() => workController.dispatch({ type: paused ? 'resume_session' : 'pause_session' }, { speak: true })}
        />
        <Button big label={t('work.ctl.undo')} onPress={() => workController.undoLast()} disabled={!canUndo} />
        <Button
          big
          label={t('work.ctl.correct')}
          onPress={() => {
            setFix(turns[0]?.heard ?? '');
            setCorrecting(true);
          }}
        />
        <Button big kind="danger" label={t('work.ctl.end')} onPress={confirmEnd} />
      </View>

      <Card>
        <View style={shared.row}>
          <Text style={[shared.h2, { flex: 1 }]}>{t('work.draft.title')}</Text>
          <Button label={editing ? t('work.plan.done') : t('work.plan.edit')} onPress={() => setEditing((v) => !v)} />
        </View>
        {editing ? (
          <PlanEditor steps={view.steps} />
        ) : (
          view.steps.map((s) => (
            <Text key={s.id} style={[shared.body, s.current && { fontWeight: '700' }, (s.status === 'completed' || s.status === 'skipped') && { opacity: 0.5 }]}>
              {s.index}. {s.label} · {t(`work.plan.status.${s.status}`)}
            </Text>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bigLabel: { fontSize: 28, fontWeight: '800', color: colors.text },
  partial: { fontSize: 18, color: colors.muted, minHeight: 28, marginVertical: space.xs },
  turn: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: space.xs },
  timerClock: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 72 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
