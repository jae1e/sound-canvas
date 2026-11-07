import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { getDb } from '../../src/db/client';
import { takes } from '../../src/db/schema';
import { Button, Card, Chip } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n';
import { LANGUAGE_SETTINGS, type AppSettings } from '../../src/settings/schema';
import { useSettings } from '../../src/settings/store';
import { shared } from '../../src/theme';
import { UpdateSettingsSection } from '../../src/update/UpdateSection';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_SERVER_URL, enroll, getPairing } from '../../src/update/pairing';
import { checkForUpdate } from '../../src/update/updater';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const [storageBytes, setStorageBytes] = useState(0);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [pairCode, setPairCode] = useState('');
  const [serverState, setServerState] = useState('');
  const [showLabs, setShowLabs] = useState(false);
  const [hiddenModes, setHiddenModes] = useState(settings.showHiddenModes);
  const [enrolling, setEnrolling] = useState(false);
  const [paired, setPaired] = useState(false);
  const checkingServerRef = useRef(false);

  useEffect(() => {
    void SecureStore.getItemAsync('vc.serverUrl').then((value) => {
      if (value) setServerUrl(value);
    });
  }, []);

  const checkServer = useCallback(async () => {
    if (checkingServerRef.current) return;
    checkingServerRef.current = true;
    setServerState(t('common.server.checking'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const pairing = await getPairing();
      setPaired(!!pairing.token);
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
      setServerState(
        failure.name === 'AbortError'
          ? t('common.server.timeout')
          : failure.name === 'TypeError' || failure.message === 'Network request failed'
            ? t('common.server.networkError')
            : t('common.server.errorDetail', { message: failure.message ?? t('common.server.unreachable') }),
      );
    } finally {
      clearTimeout(timeout);
      checkingServerRef.current = false;
    }
  }, [serverUrl, t]);

  useFocusEffect(
    useCallback(() => {
      void checkServer();
      try {
        setStorageBytes(
          getDb()
            .select()
            .from(takes)
            .all()
            .reduce(
              (sum, row) =>
                sum +
                (new File(row.fileUri).size ?? 0) +
                (row.asrPath ? (new File(row.asrPath).size ?? 0) : 0),
              0,
            ),
        );
      } catch {
        setStorageBytes(0);
      }
    }, [checkServer]),
  );

  const submitEnrollment = async () => {
    setEnrolling(true);
    setServerState(t('common.server.enrolling'));
    try {
      await enroll(serverUrl, pairCode.trim());
      setPairCode('');
      setPaired(true);
      setServerState(t('common.server.enrolled'));
      void checkForUpdate(false);
    } catch (error) {
      const failure = error as { name?: string; message?: string };
      setServerState(
        failure.name === 'AbortError'
          ? t('common.server.timeout')
          : failure.name === 'TypeError' || failure.message === 'Network request failed'
            ? t('common.server.networkError')
            : t('common.server.errorDetail', { message: failure.message ?? t('common.error') }),
      );
    } finally {
      setEnrolling(false);
    }
  };

  const langLabel = (l: AppSettings['language']) =>
    l === 'auto' ? t('settings.language.auto') : l === 'ko' ? '한국어' : 'English';

  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.content}>
      <UpdateSettingsSection paired={paired} />
      <View>
        <Card>
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
            style={{ borderWidth: 1, borderColor: '#bbb', padding: 10, marginVertical: 8 }}
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
          <Text style={shared.body}>{serverState}</Text>
        </Card>
      </View>
      <Card>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowLabs(!showLabs)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={shared.h2}>{t('common.labs.title')}</Text>
          <Ionicons name={showLabs ? 'chevron-down' : 'chevron-forward'} size={20} color="#6C6F78" />
        </Pressable>
        {showLabs && (
          <View style={[shared.row, { justifyContent: 'space-between' }]}>
            <Text style={shared.body}>{t('common.labs.showHidden')}</Text>
            <Switch
              value={hiddenModes}
              onValueChange={(v) => {
                setHiddenModes(v);
                update({ showHiddenModes: v });
              }}
            />
          </View>
        )}
      </Card>
      <Card>
        <Text style={shared.h2}>{t('settings.language.title')}</Text>
        <View style={[shared.row, { flexWrap: 'wrap' }]}>
          {LANGUAGE_SETTINGS.map((l) => (
            <Chip
              key={l}
              label={langLabel(l)}
              selected={settings.language === l}
              onPress={() => update({ language: l })}
            />
          ))}
        </View>
        <Text style={shared.muted}>{t('settings.language.hint')}</Text>
      </Card>

      <Card>
        <Text style={shared.h2}>{t('common.coach.voiceDefaults')}</Text>
        <View style={[shared.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={shared.body}>{t('speak.baseline')}</Text>
            <Text style={shared.muted}>{t('speak.baselineHint')}</Text>
          </View>
          <Switch
            accessibilityLabel={t('speak.baseline')}
            value={settings.learnSpeechBaseline}
            onValueChange={(value) => update({ learnSpeechBaseline: value })}
          />
        </View>
        <View style={[shared.row, { justifyContent: 'space-between' }]}>
          <Text style={shared.body}>{t('speak.hidePace')}</Text>
          <Switch
            accessibilityLabel={t('speak.hidePace')}
            value={settings.hideSpeechPace}
            onValueChange={(value) => update({ hideSpeechPace: value })}
          />
        </View>
      </Card>
      <Card>
        <Text style={shared.h2}>{t('common.coach.storage')}</Text>
        <Text style={shared.body}>{(storageBytes / 1048576).toFixed(1)} MB</Text>
      </Card>
    </ScrollView>
  );
}
