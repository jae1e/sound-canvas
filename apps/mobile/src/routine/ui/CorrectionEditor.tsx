import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { attachCorrection, type Correction, type RoutineTemplate, type Target } from '@vlc/session-engine';

import { Button, Card, Chip } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { colors, shared, space } from '../../theme';
import { routineController } from '../instance';

function targetLabel(c: Correction, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (c.movementNo !== undefined) return t('routine.editor.target.movement', { no: c.movementNo });
  if (c.itemId) return t('routine.editor.target.item');
  return t('routine.editor.target.routine');
}

/** Correction notes of one routine: add (typed), edit state (fixed), delete. Typed notes use the same attachment rules as voice. */
export function CorrectionEditor({ template, onBack }: { template: RoutineTemplate; onBack: () => void }) {
  const { t } = useTranslation();
  const [list, setList] = useState<Correction[]>([]);
  const [text, setText] = useState('');
  const [pick, setPick] = useState<{ text: string; candidates: Target[] } | null>(null);
  const reload = () => setList(routineController.loadCorrections(template.id));
  useEffect(reload, [template.id]);

  const add = () => {
    const body = text.trim();
    if (!body) return;
    const a = attachCorrection(body, template.items, template.lang);
    if (a.target === null) {
      setPick({ text: body, candidates: a.candidates });
      return;
    }
    routineController.addCorrectionFromText(body, { practice: false, template });
    setText('');
    reload();
  };
  const choose = (target: Target) => {
    if (!pick) return;
    // The controller stores the chosen target; the editor works outside a run, so go through its public API.
    routineController.storeCorrectionFor(pick.text, target, template);
    setPick(null);
    setText('');
    reload();
  };

  return (
    <View style={{ gap: space.md }}>
      <Button label={t('routine.editor.back')} onPress={onBack} />
      <Text style={shared.h1}>{template.name}</Text>
      <Card>
        <Text style={shared.h2}>{t('routine.editor.title')}</Text>
        <Text style={shared.muted}>{t('routine.editor.hint')}</Text>
        {list.length === 0 ? <Text style={shared.muted}>{t('routine.editor.none')}</Text> : null}
        {list.map((c) => (
          <View key={c.id} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: space.sm, gap: space.xs }}>
            <Text style={[shared.body, c.fixed && { textDecorationLine: 'line-through', color: colors.muted }]}>{c.text}</Text>
            <Text style={shared.muted}>{`${targetLabel(c, t)} · ${t('routine.editor.cue')}: ${c.cue}${c.shown > 0 ? ` · ${t('routine.editor.shown', { count: c.shown })}` : ''}${c.fixed ? ` · ${t('routine.editor.fixed')}` : ''}`}</Text>
            <View style={shared.row}>
              <Button
                label={c.fixed ? t('routine.editor.reopen') : t('routine.editor.markFixed')}
                onPress={() => {
                  routineController.fixCorrection(c.id, !c.fixed);
                  reload();
                }}
              />
              <Button
                label={t('routine.home.delete')}
                kind="danger"
                onPress={() => {
                  routineController.deleteCorrection(c.id);
                  reload();
                }}
              />
            </View>
          </View>
        ))}
        <TextInput style={shared.input} value={text} onChangeText={setText} placeholder={t('routine.editor.addPlaceholder')} accessibilityLabel={t('routine.editor.add')} multiline />
        <Button kind="primary" label={t('routine.editor.add')} onPress={add} disabled={!text.trim()} />
        {pick ? (
          <View style={{ gap: space.sm }}>
            <Text style={shared.h2}>{t('routine.editor.pickMovement')}</Text>
            <View style={[shared.row, { flexWrap: 'wrap' }]}>
              {pick.candidates.map((c, i) => (
                <Chip key={i} label={c.kind === 'movement' ? t('routine.editor.target.movement', { no: c.no }) : t('routine.editor.target.routine')} onPress={() => choose(c)} />
              ))}
              <Chip label={t('routine.editor.target.routine')} onPress={() => choose({ kind: 'routine' })} />
            </View>
          </View>
        ) : null}
      </Card>
    </View>
  );
}
