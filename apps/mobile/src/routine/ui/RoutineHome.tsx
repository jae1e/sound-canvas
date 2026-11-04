import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { routineSeconds, type RoutineTemplate } from '@vlc/session-engine';

import { Banner, Button, Card } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { getDb } from '../../db/client';
import { deleteRoutine } from '../../db/repos/routines';
import { useSettings } from '../../settings/store';
import { shared, space } from '../../theme';
import { routineController, useRoutine } from '../instance';
import { CorrectionEditor } from './CorrectionEditor';
import { DraftEditor } from './DraftEditor';

function Row({ tpl, onStart, onNotes, onDelete }: { tpl: RoutineTemplate; onStart: () => void; onNotes: () => void; onDelete?: () => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <Text style={shared.h2}>{tpl.name}</Text>
      <Text style={shared.muted}>{`${t('routine.home.items', { count: tpl.items.length })} · ${t('routine.home.minutes', { count: Math.max(1, Math.round(routineSeconds(tpl.items) / 60)) })}`}</Text>
      <Text style={shared.muted} numberOfLines={2}>
        {tpl.items.map((i) => i.name).join(' → ')}
      </Text>
      <View style={shared.row}>
        <View style={{ flex: 1 }}>
          <Button kind="primary" label={t('routine.home.start')} onPress={onStart} />
        </View>
        <Button label={t('routine.home.notes')} onPress={onNotes} />
        {onDelete ? <Button kind="danger" label={t('routine.home.delete')} onPress={onDelete} /> : null}
      </View>
    </Card>
  );
}

/** Routine start screen: type or speak a routine, preview and save it, start a built-in or saved one, or the last one. */
export function RoutineHome() {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const draft = useRoutine((s) => s.draft);
  const voice = useRoutine((s) => s.voiceSetup);
  const listen = useRoutine((s) => s.listen);
  const partial = useRoutine((s) => s.partial);
  const turns = useRoutine((s) => s.turns);
  const listenError = useRoutine((s) => s.listenError);
  const [text, setText] = useState('');
  const [list, setList] = useState<RoutineTemplate[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<RoutineTemplate | null>(null);

  const reload = () => setList(routineController.allRoutines(lang));
  useEffect(reload, [lang, draft]);

  const start = (tpl: RoutineTemplate) => {
    void routineController.start(tpl).catch((e) => Alert.alert(t('common.error'), String(e)));
  };
  const startLast = async () => {
    const ok = await routineController.startLast(lang);
    if (!ok) setNotice(t('routine.home.noLast'));
  };
  const confirmDelete = (tpl: RoutineTemplate) =>
    Alert.alert(t('routine.home.deleteConfirm'), tpl.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteRoutine(getDb(), tpl.id);
          reload();
        },
      },
    ]);

  if (editing) return <CorrectionEditor template={editing} onBack={() => setEditing(null)} />;

  return (
    <View style={{ gap: space.md }}>
      <Text style={shared.h1}>{t('routine.home.title')}</Text>
      <Text style={shared.muted}>{t('routine.home.hint')}</Text>

      <Button big kind="primary" label={t('routine.home.last')} onPress={() => void startLast()} />
      {notice ? <Banner kind="warn" text={notice} /> : null}

      <Card>
        <Text style={shared.h2}>{t('routine.home.textLabel')}</Text>
        <TextInput style={shared.input} value={text} onChangeText={setText} placeholder={t('routine.home.textPlaceholder')} accessibilityLabel={t('routine.home.textLabel')} multiline />
        <Button kind="primary" label={t('routine.home.parse')} disabled={!text.trim()} onPress={() => routineController.parseText(text)} />
        <Button
          label={voice ? t('routine.home.voiceStop') : t('routine.home.voice')}
          kind={voice ? 'danger' : 'secondary'}
          onPress={() => void (voice ? routineController.stopVoiceSetup() : routineController.startVoiceSetup(lang))}
        />
        {voice ? (
          <View style={{ gap: space.xs }}>
            <Text style={shared.muted}>{listen === 'starting' ? '...' : t('routine.home.voiceHint')}</Text>
            <Text style={shared.body} accessibilityLiveRegion="polite">
              {partial}
            </Text>
            {turns.slice(0, 2).map((row) => (
              <Text key={row.id} style={shared.muted}>{`${t('routine.home.heard')}: ${row.heard}${row.reply ? ` -> ${row.reply}` : ''}`}</Text>
            ))}
          </View>
        ) : null}
        {listenError ? <Banner kind="warn" text={listenError} /> : null}
      </Card>

      {draft ? <DraftEditor key={draft.items.map((i) => i.id).join(',') + draft.unparsed.length} draft={draft} onStart={start} /> : null}

      <Text style={shared.h2}>{t('routine.home.builtin')}</Text>
      {list.filter((r) => r.builtin).map((tpl) => (
        <Row key={tpl.id} tpl={tpl} onStart={() => start(tpl)} onNotes={() => setEditing(tpl)} />
      ))}
      {list.some((r) => !r.builtin) ? <Text style={shared.h2}>{t('routine.home.saved')}</Text> : null}
      {list.filter((r) => !r.builtin).map((tpl) => (
        <Row key={tpl.id} tpl={tpl} onStart={() => start(tpl)} onNotes={() => setEditing(tpl)} onDelete={() => confirmDelete(tpl)} />
      ))}
    </View>
  );
}
