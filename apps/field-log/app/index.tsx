import { Link, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { formatPlace } from '../src/core';
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
  const kind = labelKey(m.kind);
  const place = formatPlace(m.location) ?? t('noLocation');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/memo/${m.memoId}`)}
      onLongPress={() => confirmDeleteMemo(t, m.memoId)}
      style={[s.card, { flexDirection: 'row' }]}
    >
      {m.photoPath ? (
        <Image source={{ uri: m.photoPath }} style={{ width: 72, height: 72, borderRadius: 8, marginRight: 12 }} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.body, { fontWeight: '700' }]}>
          {`${kind ? t(kind) : m.kind} · ${formatTime(m.createdWallMs, lang)}`}
        </Text>
        <Text style={s.small}>{place}</Text>
        <View style={{ flexDirection: 'row' }}>
          <RouteBadge type={m.routeType} />
        </View>
        <Text style={m.firstText ? s.body : s.small} numberOfLines={2}>
          {m.firstText ?? t('noText')}
        </Text>
        <TrustChips
          isRecording={m.openRecordings > 0}
          segmentCount={m.segmentCount}
          segmentsDone={m.segmentsDone}
          segmentsFailed={m.segmentsFailed}
          pendingEvents={m.pendingEvents}
          pendingObjects={m.pendingObjects}
        />
      </View>
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
