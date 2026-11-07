import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, View, type ScrollViewInstance } from 'react-native';

import VlcSessionService from '../../modules/vlc-session-service';
import { useAudioRoute } from '../../src/audio/useAudioRoute';
import { Button, Card, Chip } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n';
import { LANGUAGE_SETTINGS, NUDGE_LEVELS, TTS_ENGINES, type AppSettings } from '../../src/settings/schema';
import { EarconSection } from '../../src/settings/components/EarconSection';
import { ModelSection } from '../../src/settings/components/ModelSection';
import { Stepper } from '../../src/settings/components/Stepper';
import { VoicePreview } from '../../src/settings/components/VoicePreview';
import { useSettings } from '../../src/settings/store';
import { colors, shared } from '../../src/theme';
import { UpdateSettingsSection } from '../../src/update/UpdateSection';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_SERVER_URL, enroll, getPairing } from '../../src/update/pairing';
import { checkForUpdate } from '../../src/update/updater';

const VOICE_NAMES = ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const settings = useSettings((s) => s.settings);
  const language = useSettings((s) => s.language);
  const update = useSettings((s) => s.update);
  const { output, refresh } = useAudioRoute();
  const [routeError, setRouteError] = useState(false);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [pairCode, setPairCode] = useState('');
  const [serverState, setServerState] = useState('');
  const [showLabs, setShowLabs] = useState(false);
  const [hiddenModes, setHiddenModes] = useState(settings.showHiddenModes);
  const [enrolling, setEnrolling] = useState(false);
  const [checkingServer, setCheckingServer] = useState(false);
  const [pairingTop, setPairingTop] = useState(0);
  const [highlightPairing, setHighlightPairing] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const checkingServerRef = useRef(false);

  useEffect(() => {
    void SecureStore.getItemAsync('vc.serverUrl').then((value) => {
      if (value) setServerUrl(value);
    });
  }, []);

  const checkServer = useCallback(async () => {
    if (checkingServerRef.current) return;
    checkingServerRef.current = true;
    setCheckingServer(true);
    setServerState(t('common.server.checking'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const pairing = await getPairing();
      if (!pairing.token) {
        setServerState(t('common.server.notPaired'));
        return;
      }
      const headers: Record<string, string> = {};
      headers.Authorization = `Bearer ${pairing.token}`;
      const response = await fetch(`${serverUrl.replace(/\/+$/, '')}/v1/health`, {
        headers,
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        setServerState(t('common.server.notPaired'));
      } else if (response.ok) {
        setServerState(t('common.server.connected'));
      } else {
        setServerState(t('common.server.httpError', { code: response.status }));
      }
    } catch (error) {
      const failure = error as { name?: string; message?: string };
      setServerState(failure.name === 'AbortError'
        ? t('common.server.timeout')
        : failure.name === 'TypeError' || failure.message === 'Network request failed'
          ? t('common.server.networkError')
          : t('common.server.errorDetail', { message: failure.message ?? t('common.server.unreachable') }));
    } finally {
      clearTimeout(timeout);
      checkingServerRef.current = false;
      setCheckingServer(false);
    }
  }, [serverUrl, t]);

  useFocusEffect(
    useCallback(() => {
      void checkServer();
    }, [checkServer]),
  );

  const submitEnrollment = async () => {
    setEnrolling(true);
    setServerState(t('common.server.enrolling'));
    try {
      await enroll(serverUrl, pairCode.trim());
      setPairCode('');
      setServerState(t('common.server.enrolled'));
      void checkForUpdate(false);
    } catch (error) {
      const failure = error as { name?: string; message?: string };
      setServerState(failure.name === 'AbortError'
        ? t('common.server.timeout')
        : failure.name === 'TypeError' || failure.message === 'Network request failed'
          ? t('common.server.networkError')
          : t('common.server.errorDetail', { message: failure.message ?? t('common.error') }));
    } finally {
      setEnrolling(false);
    }
  };

  const focusPairing = () => {
    setHighlightPairing(true);
    scrollRef.current?.scrollTo({ y: Math.max(0, pairingTop - 12), animated: true });
    setTimeout(() => setHighlightPairing(false), 1800);
  };

  const applyRoute = (mode: AppSettings['outputRoute']) => {
    setRouteError(false);
    try {
      VlcSessionService.setSpeechOutput(mode)
        .then(() => refresh())
        .catch(() => setRouteError(true));
    } catch {
      setRouteError(true);
    }
    update({ outputRoute: mode });
  };

  const chooseRoute = (mode: AppSettings['outputRoute']) => {
    if (mode === settings.outputRoute) return;
    if (mode === 'auto') return applyRoute('auto');
    Alert.alert(t('settings.output.speakerConfirmTitle'), t('settings.output.speakerConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.output.speakerConfirmYes'), onPress: () => applyRoute('speaker') },
    ]);
  };

  const langLabel = (l: AppSettings['language']) => (l === 'auto' ? t('settings.language.auto') : l === 'ko' ? '한국어' : 'English');
  const version = Constants.expoConfig?.version ?? '';

  return (
    <ScrollView ref={scrollRef} style={shared.screen} contentContainerStyle={shared.content}>
      <UpdateSettingsSection onPairPress={focusPairing} />
      <View onLayout={(event) => setPairingTop(event.nativeEvent.layout.y)}>
      <Card style={highlightPairing ? { borderColor: colors.primary, borderWidth: 2 } : undefined}>
        <Text style={shared.h2}>{t('common.server.pairing')}</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: '#bbb', padding: 10, marginVertical: 8 }}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          keyboardType="url"
          onEndEditing={() => void SecureStore.setItemAsync('vc.serverUrl', serverUrl.trim())}
        />
        <TextInput
          style={{ borderWidth: 1, borderColor: '#bbb', padding: 10, marginVertical: 8, letterSpacing: 4 }}
          value={pairCode}
          onChangeText={(value) => setPairCode(value.toUpperCase())}
          maxLength={8}
          autoCapitalize="characters"
          placeholder={t('common.server.pairCode')}
        />
        <Button
          label={enrolling ? t('common.server.enrolling') : t('common.server.enroll')}
          busy={enrolling}
          disabled={pairCode.trim().length !== 8}
          onPress={() => void submitEnrollment()}
        />
        <Button label={checkingServer ? t('common.server.checking') : t('common.server.check')} busy={checkingServer} disabled={checkingServer} onPress={() => void checkServer()} />
        <Text style={shared.body}>{serverState}</Text>
      </Card>
      </View>
      <Card>
        <Text style={shared.h2}>{t('common.labs.title')}</Text>
        <Button label={showLabs ? t('common.labs.hide') : t('common.labs.title')} onPress={() => setShowLabs(!showLabs)} />
        {showLabs && <View style={[shared.row, { justifyContent: 'space-between' }]}><Text style={shared.body}>{t('common.labs.showHidden')}</Text><Switch value={hiddenModes} onValueChange={(v) => { setHiddenModes(v); update({ showHiddenModes: v }); }} /></View>}
      </Card>
      <Card>
        <Text style={shared.h2}>{t('settings.language.title')}</Text>
        <View style={[shared.row, { flexWrap: 'wrap' }]}>
          {LANGUAGE_SETTINGS.map((l) => (
            <Chip key={l} label={langLabel(l)} selected={settings.language === l} onPress={() => update({ language: l })} />
          ))}
        </View>
        <Text style={shared.muted}>{t('settings.language.hint')}</Text>
      </Card>

      <Card>
        <Text style={shared.h2}>{t('settings.voice.title')}</Text>
        <Text style={shared.body}>{t('settings.voice.engine')}</Text>
        <View style={[shared.row, { flexWrap: 'wrap' }]}>
          {TTS_ENGINES.map((e) => (
            <Chip key={e} label={t(`settings.voice.engine.${e}`)} selected={settings.ttsEngine === e} onPress={() => update({ ttsEngine: e })} />
          ))}
        </View>
        {settings.ttsEngine === 'auto' ? <Text style={shared.muted}>{t('settings.voice.engine.autoHint')}</Text> : null}
        <ModelSection />
        <Text style={shared.body}>{t('settings.voice.voice')}</Text>
        <View style={[shared.row, { flexWrap: 'wrap' }]}>
          {VOICE_NAMES.map((name, i) => (
            <Chip key={name} label={name} selected={settings.ttsVoice === i} onPress={() => update({ ttsVoice: i })} />
          ))}
        </View>
        <Text style={shared.body}>{t('settings.voice.steps')}</Text>
        <Stepper value={settings.ttsSteps} min={1} max={32} onChange={(v) => update({ ttsSteps: v })} />
        <Text style={shared.muted}>{t('settings.voice.steps.hint')}</Text>
        <VoicePreview voice={settings.ttsVoice} steps={settings.ttsSteps} language={language} text={t('settings.voice.preview.text')} />
      </Card>

      <EarconSection />

      <Card>
        <Text style={shared.h2}>{t('settings.output.title')}</Text>
        <View style={[shared.row, { flexWrap: 'wrap' }]}>
          <Chip label={t('settings.output.auto')} selected={settings.outputRoute === 'auto'} onPress={() => chooseRoute('auto')} />
          <Chip label={t('settings.output.speaker')} selected={settings.outputRoute === 'speaker'} onPress={() => chooseRoute('speaker')} />
        </View>
        {output.label ? <Text style={shared.body}>{t('settings.output.current', { label: output.label })}</Text> : null}
        <Text style={shared.muted}>{t('settings.output.hint')}</Text>
        {routeError ? <Text style={{ color: '#b3261e' }}>{t('common.error')}</Text> : null}
      </Card>

      <Card>
        <Text style={shared.h2}>{t('settings.nudge.title')}</Text>
        <View style={[shared.row, { flexWrap: 'wrap' }]}>
          {NUDGE_LEVELS.map((n) => (
            <Chip key={n} label={t(`settings.nudge.${n}`)} selected={settings.nudgeLevel === n} onPress={() => update({ nudgeLevel: n })} />
          ))}
        </View>
        <Text style={shared.muted}>{t(`settings.nudge.${settings.nudgeLevel}.hint`)}</Text>
        <View style={[shared.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={shared.body}>{t('settings.focus.title')}</Text>
            <Text style={shared.muted}>{t('settings.focus.hint')}</Text>
          </View>
          <Switch value={settings.focusBreakEnabled} onValueChange={(v) => update({ focusBreakEnabled: v })} />
        </View>
        {settings.focusBreakEnabled ? (
          <Stepper
            value={settings.focusBreakMinutes}
            min={5}
            max={240}
            step={5}
            format={(v) => t('settings.focus.minutes', { minutes: v })}
            onChange={(v) => update({ focusBreakMinutes: v })}
          />
        ) : null}
      </Card>

      <Button label={t('settings.diagnostics')} onPress={() => router.push('/settings/diagnostics')} />

      <Card>
        <Text style={shared.h2}>{t('settings.about.title')}</Text>
        {version ? <Text style={shared.muted}>{t('settings.about.version', { version })}</Text> : null}
      </Card>
    </ScrollView>
  );
}
