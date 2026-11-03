import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { Banner, Button, Card, Chip } from '../../src/components/ui';
import { getDb } from '../../src/db/client';
import { createJournalEntry, listJournalEntries, type JournalEntry } from '../../src/db/repos/journal';
import type { JournalSource } from '../../src/db/schema';
import { useTranslation } from '../../src/i18n';
import { formatDateTime } from '../../src/journal/format';
import { newId } from '../../src/journal/id';
import { shareJournal } from '../../src/journal/share';
import type { ExportFormat } from '../../src/journal/export';
import { useSettings } from '../../src/settings/store';
import { colors, shared, space } from '../../src/theme';

const MODES = ['work', 'travel', 'coach', 'general'] as const;
const SOURCES: JournalSource[] = ['user_note', 'transcript', 'generated_summary'];

export default function JournalList() {
  const { t } = useTranslation();
  const router = useRouter();
  const lang = useSettings((s) => s.language);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<string | null>(null);
  const [source, setSource] = useState<JournalSource | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const h = setTimeout(() => setQuery(input), 250);
    return () => clearTimeout(h);
  }, [input]);

  const reload = useCallback(() => {
    setEntries(listJournalEntries(getDb(), { query, mode: mode ?? undefined, source: source ?? undefined }));
  }, [query, mode, source]);

  useFocusEffect(reload);

  const filtered = query.trim() !== '' || mode !== null || source !== null;

  const saveNote = () => {
    const text = draft.trim();
    if (!text) return;
    try {
      createJournalEntry(getDb(), { id: newId(), mode: 'general', source: 'user_note', text, createdAt: Date.now() });
      setDraft('');
      setComposing(false);
      reload();
    } catch {
      Alert.alert(t('journal.saveFailed'));
    }
  };

  const doExport = async (format: ExportFormat) => {
    setExporting(false);
    try {
      const ok = await shareJournal(entries, format, lang, t('journal.exportTitle'));
      if (!ok) setMessage(t('journal.exportUnavailable'));
    } catch {
      setMessage(t('journal.exportFailed'));
    }
  };

  const header = (
    <View style={{ gap: space.md }}>
      <View style={shared.row}>
        <View style={{ flex: 1 }}>
          <Button label={t('journal.newNote')} kind="primary" onPress={() => setComposing((v) => !v)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('journal.export')} onPress={() => setExporting((v) => !v)} disabled={entries.length === 0} />
        </View>
      </View>
      {message ? <Banner kind="warn" text={message} /> : null}
      {composing ? (
        <Card>
          <TextInput
            style={[shared.input, { minHeight: 90, textAlignVertical: 'top' }]}
            multiline
            value={draft}
            onChangeText={setDraft}
            placeholder={t('journal.newNotePlaceholder')}
            autoFocus
          />
          <View style={shared.row}>
            <Button label={t('common.save')} kind="primary" disabled={!draft.trim()} onPress={saveNote} />
            <Button label={t('common.cancel')} onPress={() => { setComposing(false); setDraft(''); }} />
          </View>
        </Card>
      ) : null}
      {exporting ? (
        <Card>
          <Text style={shared.body}>{t('journal.exportCount', { count: entries.length })}</Text>
          <View style={shared.row}>
            <Button label={t('journal.exportMarkdown')} onPress={() => void doExport('markdown')} />
            <Button label={t('journal.exportJson')} onPress={() => void doExport('json')} />
          </View>
        </Card>
      ) : null}
      <TextInput style={shared.input} value={input} onChangeText={setInput} placeholder={t('journal.searchPlaceholder')} returnKeyType="search" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Chip label={t('journal.filterAll')} selected={mode === null} onPress={() => setMode(null)} />
        {MODES.map((m) => (
          <Chip key={m} label={t(`common.mode.${m}`)} selected={mode === m} onPress={() => setMode(mode === m ? null : m)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Chip label={t('journal.sourceAll')} selected={source === null} onPress={() => setSource(null)} />
        {SOURCES.map((s) => (
          <Chip key={s} label={t(`journal.source.${s}`)} selected={source === s} onPress={() => setSource(source === s ? null : s)} />
        ))}
      </View>
    </View>
  );

  return (
    <FlatList
      style={shared.screen}
      contentContainerStyle={shared.content}
      data={entries}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={[shared.muted, { textAlign: 'center', marginTop: space.xl }]}>{filtered ? t('journal.noResults') : t('journal.empty')}</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/journal/${item.id}`)} accessibilityRole="button">
          <Card>
            <Text style={shared.body} numberOfLines={2}>{item.text}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{t(`journal.source.${item.source}`)}</Text>
              <Text style={shared.muted}>{t(`common.mode.${item.mode}`, { defaultValue: item.mode })}</Text>
              {item.taskLabel ? <Text style={shared.muted} numberOfLines={1}>{t('journal.step', { label: item.taskLabel })}</Text> : null}
            </View>
            <Text style={shared.muted}>{formatDateTime(item.createdAt, lang)}</Text>
          </Card>
        </Pressable>
      )}
    />
  );
}
