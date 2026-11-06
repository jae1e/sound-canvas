import { Link, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { deriveMemoStatus, hasStaleRecording, type MemoFacts, autoTitle, composeRowLines, dateLabel, durationLabel, formatPlace } from '../src/core';
import { useRecorder } from '../src/state/recorder';
import { reconcile } from '../src/sync/reconcile';
import { listMemos, type MemoSummary } from '../src/db/queries';
import { useLang, useT } from '../src/i18n';
import { confirmDeleteMemo } from '../src/memo/confirmDelete';
import { useSettings } from '../src/state/settings';
import { useSyncStatus } from '../src/state/syncStatus';
import { UpdateBanner } from '../src/ui/UpdateSection';
import { LeftAppNotice } from '../src/ui/LeftAppNotice';
import { BigButton, RouteBadge, StatusPill, useLiveFacts } from '../src/ui/components';
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
  const { line1, noteLine, preview } = composeRowLines({ userTitle: m.title, auto, note: m.note, transcript: m.transcript });
  const live = useLiveFacts(m.memoId);
  const facts: MemoFacts = {
    isRecording: live.isRecording,
    paused: live.paused,
    recordedMs: live.recordedMs,
    offline: live.offline,
    segmentCount: m.segmentCount,
    segmentsDone: m.segmentsDone,
    segmentsFailed: m.segmentsFailed,
    segmentsUploaded: m.segmentsUploaded,
    segmentsNoSpeech: m.segmentsNoSpeech,
    recordingCount: m.recordingCount,
    hasOpenRecordingRows: m.openRecordings > 0,
    pendingEvents: m.pendingEvents,
    pendingObjects: m.pendingObjects,
  };
  const status = deriveMemoStatus(facts);
  const stale = hasStaleRecording(facts);
  useEffect(() => {
    if (stale) void reconcile().catch(() => undefined);
  }, [stale]);
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
        <StatusPill status={status} />
        {noteLine ? (
          <Text style={[s.body, { marginTop: 6 }]} numberOfLines={2}>
            {noteLine}
          </Text>
        ) : null}
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
        <LeftAppNotice />
        <UpdateBanner onPress={() => router.push('/settings')} />
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
