import { Link, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { autoTitle, dateLabel, displayTitle, durationLabel, formatPlace, previewLine } from '../src/core';
import { useRecorder } from '../src/state/recorder';
import { listMemos, type MemoSummary } from '../src/db/queries';
import { useLang, useT } from '../src/i18n';
import { confirmDeleteMemo } from '../src/memo/confirmDelete';
import { useSettings } from '../src/state/settings';
import { useSyncStatus } from '../src/state/syncStatus';
import { BigButton, RouteBadge, TrustChips, labelKey } from '../src/ui/components';
import { formatTime } from '../src/ui/format';
import { colors, s } from '../src/ui/theme';
import { useDbQuery } from '../src/ui/useQuery';

function ConnectionIndicator() {
  const t = useT();
  const st = useSyncStatus();
  const label =
    st.connection === 'online'
      ? t('connected')
      : st.connection === 'unenrolled'
        ? t('notEnrolled')
        : st.connection === 'offline'
          ? t('offline')
          : st.connection === 'connecting'
            ? t('connecting')
            : t('syncError');
  const glyph = st.connection === 'online' ? '●' : st.connection === 'unenrolled' ? '○' : st.connection === 'offline' ? '◌' : '✕';
  const pending = st.pendingEvents + st.pendingObjects;
  return (
    <Link href="/settings" asChild>
      <Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }}>
        <Text style={s.small}>
          {`${glyph} ${label}${pending > 0 ? ` · ${pending} ${t('pending')}` : ''}  ›  ${t('settings')}`}
        </Text>
      </Pressable>
    </Link>
  );
}

function MemoRow({ m }: { m: MemoSummary }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const draftText = useRecorder((r) => {
    if (r.memoId !== m.memoId || !r.recordingId) return null;
    const list = r.drafts[r.recordingId];
    return list && list.length ? list[list.length - 1].text : null;
  });
  const auto = autoTitle({
    firstFinalText: m.firstText,
    draftText,
    kind: m.kind,
    fallbacks: { voice: t('memoVoice'), photo: t('memoPhoto') },
  });
  const line1 = displayTitle(m.title, auto);
  const preview = previewLine(line1, m.transcript);
  const meta = [
    dateLabel(m.createdWallMs, Date.now(), lang),
    m.durationMs > 0 ? durationLabel(m.durationMs) : null,
    m.photoCount > 0 ? `📷${m.photoCount > 1 ? ` ×${m.photoCount}` : ''}` : null,
    m.location ? `📍 ${formatPlace(m.location)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/memo/${m.memoId}`)}
      onLongPress={() => confirmDeleteMemo(t, m.memoId)}
      style={[s.card, { flexDirection: 'row', minHeight: 96 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[s.body, { fontWeight: '700' }]} numberOfLines={1}>
          {line1}
        </Text>
        <Text style={s.small} numberOfLines={1}>
          {meta}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <RouteBadge type={m.routeType} />
        </View>
        <TrustChips
          isRecording={m.openRecordings > 0}
          segmentCount={m.segmentCount}
          segmentsDone={m.segmentsDone}
          segmentsFailed={m.segmentsFailed}
          pendingEvents={m.pendingEvents}
          pendingObjects={m.pendingObjects}
        />
        {preview ? (
          <Text style={[s.body, { marginTop: 6, color: colors.muted }]} numberOfLines={2}>
            {preview}
          </Text>
        ) : null}
      </View>
      {m.photoPath ? (
        <Image source={{ uri: m.photoPath }} style={{ width: 72, height: 72, borderRadius: 8, marginLeft: 12 }} />
      ) : null}
    </Pressable>
  );
}

export default function Home() {
  const t = useT();
  const router = useRouter();
  const memos = useDbQuery(() => listMemos());
  const enrolled = useSettings((s) => !!s.deviceId);
  return (
    <View style={s.screen}>
      <View style={s.pad}>
        <ConnectionIndicator />
        <BigButton label={t('newMemo')} onPress={() => router.push('/new')} />
        {!enrolled && <Text style={{ fontSize: 16, color: colors.danger }}>{t('enrolFirst')}</Text>}
      </View>
      <FlatList
        data={memos ?? []}
        keyExtractor={(m) => m.memoId}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => <MemoRow m={item} />}
        ListEmptyComponent={memos ? <Text style={s.small}>{t('noMemos')}</Text> : undefined}
      />
    </View>
  );
}
