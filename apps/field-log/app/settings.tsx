import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { KNOWN_LANGUAGES, moveLanguage, toggleLanguage } from '../src/core';
import { useLang, useT } from '../src/i18n';
import FlNative, { type Capabilities } from '../src/native';
import { updateSetting, useSettings, type SourceChoice, type UiLang } from '../src/state/settings';
import { useSyncStatus } from '../src/state/syncStatus';
import { InputOptions, useInputChipText } from '../src/ui/inputUi';
import { enrol } from '../src/sync/enrol';
import { triggerSync } from '../src/sync/engine';
import { BigButton, Row, useRouteText } from '../src/ui/components';
import { formatTime } from '../src/ui/format';
import { colors, s } from '../src/ui/theme';

function Choices<T extends string | number | null>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View>
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <BigButton
            key={String(o.value)}
            label={`${on ? '◉' : '○'} ${o.label}`}
            variant={on ? 'solid' : 'outline'}
            onPress={() => props.onChange(o.value)}
            style={{ minHeight: 52, marginVertical: 3, alignItems: 'flex-start' }}
          />
        );
      })}
    </View>
  );
}

function LanguageList() {
  const t = useT();
  const languages = useSettings((x) => x.languages);
  const enabled = languages;
  const disabled = KNOWN_LANGUAGES.filter((l) => !enabled.includes(l.code));
  const rows = [...enabled.map((code) => ({ code, on: true })), ...disabled.map((l) => ({ code: l.code, on: false }))];
  const label = (code: string) => KNOWN_LANGUAGES.find((l) => l.code === code)?.label ?? code;
  return (
    <View>
      {rows.map(({ code, on }, i) => (
        <View key={code} style={[s.card, s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.body}>{`${on ? i + 1 : '–'}. ${label(code)}`}</Text>
          <View style={s.row}>
            {on && (
              <>
                <MiniButton label="▲" a11y={t('moveUp')} disabled={i === 0} onPress={() => void updateSetting('languages', moveLanguage(languages, code, -1))} />
                <MiniButton label="▼" a11y={t('moveDown')} disabled={i === enabled.length - 1} onPress={() => void updateSetting('languages', moveLanguage(languages, code, 1))} />
              </>
            )}
            <Switch value={on} disabled={on && languages.length <= 1} onValueChange={() => void updateSetting('languages', toggleLanguage(languages, code))} />
          </View>
        </View>
      ))}
    </View>
  );
}

function MiniButton(props: { label: string; a11y: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.a11y}
      disabled={props.disabled}
      onPress={props.onPress}
      style={{ minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', opacity: props.disabled ? 0.3 : 1 }}
    >
      <Text style={{ fontSize: 24, color: colors.primary }}>{props.label}</Text>
    </Pressable>
  );
}

export default function Settings() {
  const t = useT();
  const routeText = useRouteText();
  const inputText = useInputChipText();
  const lang = useLang();
  const st = useSettings();
  const sync = useSyncStatus();
  const [url, setUrl] = useState(st.serverUrl);
  const [code, setCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    FlNative.getCapabilities().then(setCaps, () => setCaps(null));
  }, []);

  const doEnrol = async () => {
    setEnrolling(true);
    try {
      await updateSetting('serverUrl', url.trim());
      await enrol(code);
      setCode('');
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 64 }]} keyboardShouldPersistTaps="handled">
      <Text style={s.h2}>{t('server')}</Text>
      <Text style={s.small}>{t('serverUrl')}</Text>
      <TextInput
        style={s.input}
        value={url}
        onChangeText={setUrl}
        onEndEditing={() => void updateSetting('serverUrl', url.trim())}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Text style={s.h2}>{t('enrolment')}</Text>
      {st.deviceId ? (
        <>
          <Row label={t('enrolled')} value="✓" />
          <Row label={t('deviceId')} value={st.deviceId} />
        </>
      ) : (
        <>
          <Text style={s.small}>{t('pairingCode')}</Text>
          <TextInput
            style={[s.input, { letterSpacing: 4 }]}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />
          <BigButton label={enrolling ? t('enrolling') : t('enrol')} onPress={doEnrol} disabled={enrolling || code.trim().length < 8} />
        </>
      )}

      <Text style={s.h2}>{t('liveDraft')}</Text>
      <View style={[s.row, { justifyContent: 'space-between', minHeight: 56 }]}>
        <Text style={s.body}>{st.liveEnabled ? t('on') : t('off')}</Text>
        <Switch value={st.liveEnabled} onValueChange={(v) => void updateSetting('liveEnabled', v)} />
      </View>

      <Text style={s.h2}>{t('languagePriority')}</Text>
      <Text style={s.small}>{t('languagesHint')}</Text>
      <LanguageList />
      <Text style={s.h2}>{t('uiLanguage')}</Text>
      <Choices<UiLang>
        value={st.uiLang}
        options={[
          { value: 'auto', label: t('auto') },
          { value: 'ko', label: '한국어' },
          { value: 'en', label: 'English' },
        ]}
        onChange={(v) => void updateSetting('uiLang', v)}
      />

      <Text style={s.h2}>{t('inputDevice')}</Text>
      <Text style={s.body}>{inputText}</Text>
      <Text style={s.small}>{t('inputBtNote')}</Text>
      <InputOptions />

      <Text style={s.h2}>{t('audioSource')}</Text>
      <Choices<SourceChoice>
        value={st.source}
        options={[
          { value: 'AUTO', label: t('auto') },
          { value: 'UNPROCESSED', label: 'UNPROCESSED' },
          { value: 'VOICE_RECOGNITION', label: 'VOICE_RECOGNITION' },
          { value: 'MIC', label: 'MIC' },
        ]}
        onChange={(v) => void updateSetting('source', v)}
      />

      <Text style={s.h2}>{t('locationOn')}</Text>
      <View style={[s.row, { justifyContent: 'space-between', minHeight: 56 }]}>
        <Text style={s.body}>{st.locationEnabled ? t('on') : t('off')}</Text>
        <Switch value={st.locationEnabled} onValueChange={(v) => void updateSetting('locationEnabled', v)} />
      </View>

      <Text style={s.h2}>{t('outbox')}</Text>
      <View style={s.card}>
        <Row label={t('pendingEvents')} value={String(sync.pendingEvents)} />
        <Row label={t('pendingObjects')} value={String(sync.pendingObjects)} />
        {sync.objectErrors > 0 && <Row label={t('fileErrors')} value={String(sync.objectErrors)} />}
        <Row label={t('lastSync')} value={sync.lastSyncMs ? formatTime(sync.lastSyncMs, lang) : t('never')} />
        <Row
          label={t('clock')}
          value={sync.clock ? `${sync.clock.offsetMs} ms / ${sync.clock.rttMs} ms` : t('unknown')}
        />
        {sync.serverVersion && <Row label={t('server')} value={`v${sync.serverVersion}`} />}
        {sync.stuck && <Text style={{ color: colors.danger, fontSize: 16 }}>{`${t('stuck')}: ${sync.stuck}`}</Text>}
        {sync.error && <Text style={{ color: colors.danger, fontSize: 16 }}>{`${t('syncError')}: ${sync.error}`}</Text>}
      </View>
      <BigButton label={sync.syncing ? `${t('syncNow')}…` : t('syncNow')} onPress={() => triggerSync(true)} />

      <Text style={s.h2}>{t('capabilities')}</Text>
      <View style={s.card}>
        {caps ? (
          <>
            <Row label="Device" value={`${caps.manufacturer} ${caps.model}`} />
            <Row label="SDK / boot count" value={`${caps.sdkInt} / ${caps.bootCount}`} />
            <Row label="UNPROCESSED" value={caps.unprocessedSupported ? 'supported' : t('unavailable')} />
            <Row label={t('inputDevice')} value={caps.inputs.map((i) => `#${i.id} ${i.type} ${i.productName}`).join('\n') || '-'} />
          </>
        ) : (
          <Text style={s.small}>{t('unknown')}</Text>
        )}
      </View>
    </ScrollView>
  );
}
