import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';

import { Banner, Button, Card } from '../../src/components/ui';
import { getDb } from '../../src/db/client';
import { deleteJournalEntry, getJournalEntry, updateJournalText, type JournalEntry } from '../../src/db/repos/journal';
import { useTranslation } from '../../src/i18n';
import type { ExportFormat } from '../../src/journal/export';
import { formatDateTime } from '../../src/journal/format';
import { shareJournal } from '../../src/journal/share';
import { useSettings } from '../../src/settings/store';
import { shared } from '../../src/theme';

export default function JournalDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const lang = useSettings((s) => s.language);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(() => getJournalEntry(getDb(), String(id)));
  const [text, setText] = useState(entry?.text ?? '');
  const [message, setMessage] = useState<string | null>(null);

  if (!entry) {
    return (
      <View style={[shared.screen, shared.content]}>
        <Banner kind="warn" text={t('journal.notFound')} />
        <Button label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  const unchanged = text.trim() === entry.text;
  const save = () => {
    try {
      const updated = updateJournalText(getDb(), entry.id, text, Date.now());
      if (updated) {
        setEntry(updated);
        setText(updated.text);
        setMessage(t('journal.saved'));
      }
    } catch {
      setMessage(t('journal.saveFailed'));
    }
  };
  const remove = () => {
    Alert.alert(t('common.confirmDelete'), t('journal.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteJournalEntry(getDb(), entry.id);
          router.back();
        },
      },
    ]);
  };
  const exportOne = async (format: ExportFormat) => {
    try {
      const ok = await shareJournal([entry], format, lang, t('journal.exportTitle'));
      if (!ok) setMessage(t('journal.exportUnavailable'));
    } catch {
      setMessage(t('journal.exportFailed'));
    }
  };

  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={shared.h2}>{t(`journal.source.${entry.source}`)}</Text>
        <Text style={shared.muted}>{t(`common.mode.${entry.mode}`, { defaultValue: entry.mode })}</Text>
        {entry.taskLabel ? <Text style={shared.body}>{t('journal.step', { label: entry.taskLabel })}</Text> : null}
        <Text style={shared.muted}>{`${t('journal.created')}: ${formatDateTime(entry.createdAt, lang)}`}</Text>
        {entry.updatedAt !== entry.createdAt ? <Text style={shared.muted}>{`${t('journal.updated')}: ${formatDateTime(entry.updatedAt, lang)}`}</Text> : null}
        {entry.sessionId ? <Text style={shared.muted}>{`${t('journal.session')}: ${entry.sessionId.slice(0, 8)}`}</Text> : null}
        {entry.location ? <Text style={shared.muted}>{`${t('journal.location')}: ${entry.location.latitude.toFixed(5)}, ${entry.location.longitude.toFixed(5)}`}</Text> : null}
      </Card>
      {entry.originalText !== entry.text ? (
        <Card>
          <Text style={shared.muted}>{t('journal.original')}</Text>
          <Text style={shared.body} selectable>{entry.originalText}</Text>
        </Card>
      ) : null}
      <Text style={shared.muted}>{t('journal.edited')}</Text>
      <TextInput style={[shared.input, { minHeight: 140, textAlignVertical: 'top' }]} multiline value={text} onChangeText={(v) => { setText(v); setMessage(null); }} />
      {message ? <Banner text={message} /> : null}
      <View style={shared.row}>
        <Button label={t('common.save')} kind="primary" disabled={!text.trim() || unchanged} onPress={save} />
        <Button label={t('common.delete')} kind="danger" onPress={remove} />
      </View>
      <Text style={shared.muted}>{t('journal.exportEntry')}</Text>
      <View style={shared.row}>
        <Button label={t('journal.exportMarkdown')} onPress={() => void exportOne('markdown')} />
        <Button label={t('journal.exportJson')} onPress={() => void exportOne('json')} />
      </View>
    </ScrollView>
  );
}
