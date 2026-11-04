import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { poomsaeItem, routineSeconds, type ParsedRoutine, type RoutineItem, type RoutineTemplate } from '@vlc/session-engine';

import { Banner, Button, Card } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { shared, space } from '../../theme';
import { routineController } from '../instance';
import { ItemEditor, newItem } from './ItemEditor';

let counter = 0;
const uid = () => `n${Date.now().toString(36)}${++counter}`;

/** Preview and edit of a parsed routine, then save as a template (and optionally start). */
export function DraftEditor({ draft, onStart }: { draft: ParsedRoutine; onStart: (t: RoutineTemplate) => void }) {
  const { t } = useTranslation();
  const lang = draft.lang;
  const [items, setItems] = useState<RoutineItem[]>(draft.items);
  const [name, setName] = useState('');
  const minutes = Math.max(1, Math.round(routineSeconds(items) / 60));

  const update = (i: number, it: RoutineItem) => setItems((xs) => xs.map((x, k) => (k === i ? it : x)));
  const move = (i: number, dir: -1 | 1) =>
    setItems((xs) => {
      const j = i + dir;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });
  const save = (): RoutineTemplate => routineController.saveDraft(name || t('routine.draft.defaultName'), items, lang);

  return (
    <Card>
      <Text style={shared.h2}>{t('routine.draft.title')}</Text>
      {items.length === 0 ? <Text style={shared.muted}>{t('routine.draft.empty')}</Text> : null}
      <TextInput style={shared.input} value={name} onChangeText={setName} placeholder={t('routine.draft.name')} accessibilityLabel={t('routine.draft.name')} />
      <Text style={shared.muted}>{`${t('routine.home.items', { count: items.length })} · ${t('routine.home.minutes', { count: minutes })}`}</Text>
      {items.map((it, i) => (
        <ItemEditor key={it.id} item={it} onChange={(x) => update(i, x)} onRemove={() => setItems((xs) => xs.filter((_, k) => k !== i))} onMove={(d) => move(i, d)} />
      ))}
      <Text style={shared.muted}>{t('routine.draft.add')}</Text>
      <View style={[shared.row, { flexWrap: 'wrap' }]}>
        <Button label={t('routine.draft.addExercise')} onPress={() => setItems((xs) => [...xs, newItem('exercise', lang, uid())])} />
        <Button label={t('routine.draft.addHold')} onPress={() => setItems((xs) => [...xs, newItem('hold', lang, uid())])} />
        <Button label={t('routine.draft.addRest')} onPress={() => setItems((xs) => [...xs, newItem('rest', lang, uid())])} />
        <Button label={t('routine.draft.addTaegeuk')} onPress={() => setItems((xs) => [...xs, poomsaeItem(lang, uid(), 1)])} />
      </View>
      {draft.unparsed.length > 0 ? (
        <View style={{ gap: space.xs }}>
          <Banner kind="warn" text={t('routine.draft.unparsed')} />
          {draft.unparsed.map((u, i) => (
            <Text key={i} style={shared.body}>
              {`"${u.text}" - ${u.reason}`}
            </Text>
          ))}
          <Text style={shared.muted}>{t('routine.draft.unparsedHint')}</Text>
        </View>
      ) : null}
      {draft.assumed.length > 0 ? (
        <View style={{ gap: space.xs }}>
          <Text style={shared.h2}>{t('routine.draft.assumed')}</Text>
          {draft.assumed.map((a, i) => (
            <Text key={i} style={shared.muted}>
              {a}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button big kind="primary" label={t('routine.draft.saveStart')} disabled={items.length === 0} onPress={() => onStart(save())} />
        <Button label={t('routine.draft.save')} disabled={items.length === 0} onPress={save} />
        <Button label={t('routine.draft.discard')} kind="danger" onPress={() => routineController.setDraft(null)} />
      </View>
    </Card>
  );
}
