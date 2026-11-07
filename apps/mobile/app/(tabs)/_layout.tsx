import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Pressable, View } from 'react-native';
import { useTranslation } from '../../src/i18n';
import { useUpdater } from '../../src/update/updater';

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const newer = useUpdater((s) => !!s.build?.newer);
  return (
    <Tabs
      screenOptions={({ route }) => {
        const dark = route.name === 'sing';
        return {
          headerStyle: { backgroundColor: dark ? '#0E1117' : '#F6F5F1' },
          headerTintColor: dark ? '#E8EBF1' : '#1B1D22',
          headerTitleStyle: { fontSize: 21, fontWeight: '800' },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.settings')}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => ({ padding: 18, opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="settings-outline" size={22} color={dark ? '#8A93A5' : '#55585F'} />
              {newer && (
                <View
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: 15,
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: '#FF3B30',
                  }}
                />
              )}
            </Pressable>
          ),
          sceneStyle: { backgroundColor: dark ? '#0E1117' : '#F6F5F1' },
          tabBarActiveTintColor: dark ? '#5EEAD4' : '#4F46E5',
          tabBarInactiveTintColor: dark ? '#6B7486' : '#9A9DA6',
          tabBarStyle: {
            backgroundColor: dark ? '#0E1117' : '#FFFFFF',
            borderTopColor: dark ? '#1D222C' : '#E8E6E0',
            height: 64,
            paddingBottom: 8,
          },
        };
      }}
      screenListeners={({ route }) => ({
        focus: () => {
          if (['sing', 'speak', 'takes'].includes(route.name))
            void SecureStore.setItemAsync('vc.lastTab', route.name);
        },
      })}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="sing"
        options={{
          title: t('common.tabs.sing'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="musical-notes-outline" size={22} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="speak"
        options={{
          title: t('common.tabs.speak'),
          tabBarIcon: ({ color }) => <Ionicons name="mic-outline" size={22} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="takes"
        options={{
          title: t('common.tabs.takes'),
          tabBarIcon: ({ color }) => <Ionicons name="list-outline" size={22} color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
