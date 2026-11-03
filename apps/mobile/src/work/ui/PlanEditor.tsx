import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { builtinTemplates, type PlanTemplate } from '@vlc/session-engine';

import { Button, Card, Chip } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { useSettings } from '../../settings/store';
import { colors, shared, space } from '../../theme';
import { workController } from '../instance';
import type { StepView } from '../view';
import { useTemplates } from './useTemplates';

const MIN = 60_000;

function minutesText(ms?: number): string {
  return ms === undefined ? '' : String(Math.round(ms / MIN));
}

function parseMinutes(text: string): number | null | undefined {
  const t = text.trim();
  if (t === '') return null; // clears the estimate
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n <= 1440 ? Math.round(n * MIN) : undefined; // undefined: invalid, ignore
}

function StepRow({ step, count }: { step: StepView; count: number }) {
  const { t } = useTranslation();
  const editable = step.status === 'pending' || step.status === 'in_progress' || step.status === 'awaiting_confirmation';
  const [label, setLabel] = useState(step.label);
  const [minutes, setMinutes] = useState(minutesText(step.estimateMs));
  useEffect(() => setLabel(step.label), [step.label]);
  useEffect(() => setMinutes(minutesText(step.estimateMs)), [step.estimateMs]);

  const commitLabel = () => {
    const next = label.trim();
    if (!next) return setLabel(step.label);
    if (next !== step.label) workController.dispatch({ type: 'edit_step', task: { id: step.id }, label: next });
  };
  const commitMinutes = () => {
    const parsed = parseMinutes(minutes);
    if (parsed === undefined) return setMinutes(minutesText(step.estimateMs));
    if ((parsed ?? undefined) !== step.estimateMs) workController.dispatch({ type: 'edit_step', task: { id: step.id }, estimateMs: parsed });
  };

  return (
    <View style={styles.stepRow}>
      <Text style={styles.index}>{step.index}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <TextInput
          style={[shared.input, !editable && { opacity: 0.5 }]}
          value={label}
          editable={editable}
          onChangeText={setLabel}
          onEndEditing={commitLabel}
          placeholder={t('work.plan.stepLabel')}
          accessibilityLabel={t('work.plan.stepLabel')}
        />
        <View style={shared.row}>
          <TextInput
            style={[shared.input, { width: 72 }, !editable && { opacity: 0.5 }]}
            value={minutes}
            editable={editable}
            onChangeText={setMinutes}
            onEndEditing={commitMinutes}
            keyboardType="number-pad"
            accessibilityLabel={t('work.plan.minutes')}
          />
          <Text style={shared.muted}>{t('work.plan.minutes')}</Text>
          {!editable ? <Text style={shared.muted}>{t(`work.plan.status.${step.status}`)}</Text> : null}
        </View>
      </View>
      {editable ? (
        <View style={{ gap: 4 }}>
          <Chip label="↑" onPress={() => step.index > 1 && workController.dispatch({ type: 'move_step', task: { id: step.id }, toIndex: step.index - 2 })} />
          <Chip label="↓" onPress={() => step.index < count && workController.dispatch({ type: 'move_step', task: { id: step.id }, toIndex: step.index })} />
          <Chip label="✕" onPress={() => workController.dispatch({ type: 'remove_step', task: { id: step.id } })} />
        </View>
      ) : null}
    </View>
  );
}

/** Add, edit, reorder and remove plan steps; save the plan as a template or load one. Every edit goes through the engine. */
export function PlanEditor({ steps }: { steps: StepView[] }) {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const { templates, save } = useTemplates();
  const [newLabel, setNewLabel] = useState('');
  const [newMinutes, setNewMinutes] = useState('');
  const [tplName, setTplName] = useState('');
  const [showLoad, setShowLoad] = useState(false);

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    const est = parseMinutes(newMinutes);
    workController.dispatch({ type: 'add_step', label, ...(typeof est === 'number' ? { estimateMs: est } : {}) });
    setNewLabel('');
    setNewMinutes('');
  };

  const saveAsTemplate = () => {
    const name = tplName.trim();
    if (!name) return;
    try {
      save(workController.planAsTemplate(name));
      setTplName('');
      Alert.alert(t('work.plan.saved'));
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    }
  };

  const all: PlanTemplate[] = [...builtinTemplates(lang), ...templates];

  return (
    <View style={{ gap: space.md }}>
      {steps.map((s) => (
        <StepRow key={s.id} step={s} count={steps.length} />
      ))}

      <View style={[shared.row, { alignItems: 'flex-start' }]}>
        <TextInput
          style={[shared.input, { flex: 1 }]}
          value={newLabel}
          onChangeText={setNewLabel}
          onSubmitEditing={add}
          placeholder={t('work.plan.stepLabel')}
          accessibilityLabel={t('work.plan.stepLabel')}
        />
        <TextInput
          style={[shared.input, { width: 64 }]}
          value={newMinutes}
          onChangeText={setNewMinutes}
          keyboardType="number-pad"
          placeholder={t('work.plan.minutes')}
          accessibilityLabel={t('work.plan.minutes')}
        />
      </View>
      <Button label={t('work.plan.addStep')} onPress={add} disabled={!newLabel.trim()} />

      <Card>
        <Text style={shared.h2}>{t('work.plan.saveTemplate')}</Text>
        <View style={shared.row}>
          <TextInput style={[shared.input, { flex: 1 }]} value={tplName} onChangeText={setTplName} placeholder={t('work.plan.templateName')} />
          <Button label={t('common.save')} onPress={saveAsTemplate} disabled={!tplName.trim() || steps.length === 0} />
        </View>
        <Button label={t('work.plan.loadTemplate')} onPress={() => setShowLoad((v) => !v)} active={showLoad} />
        {showLoad
          ? all.map((tpl) => (
              <Button
                key={tpl.id}
                label={`${tpl.name} (${t('work.start.steps', { count: tpl.steps.length })})`}
                onPress={() => {
                  workController.loadTemplate(tpl);
                  setShowLoad(false);
                }}
              />
            ))
          : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  index: { width: 24, paddingTop: 12, fontSize: 16, fontWeight: '700', color: colors.muted, textAlign: 'center' },
});
