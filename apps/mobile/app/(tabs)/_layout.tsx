import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from '../../src/i18n';
import { colors } from '../../src/theme';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
      sceneStyle: { backgroundColor: colors.bg },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
    }}>
      <Tabs.Screen name="index" options={{ title: t('common.tabs.home'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} color={String(color)} /> }} />
      <Tabs.Screen name="sing" options={{ title: t('common.tabs.sing'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'musical-notes' : 'musical-notes-outline'} color={String(color)} /> }} />
      <Tabs.Screen name="speak" options={{ title: t('common.tabs.speak'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'mic' : 'mic-outline'} color={String(color)} /> }} />
      <Tabs.Screen name="takes" options={{ title: t('common.tabs.takes'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'albums' : 'albums-outline'} color={String(color)} /> }} />
      <Tabs.Screen name="settings" options={{ title: t('common.tabs.settings'), tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} color={String(color)} /> }} />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons name={name} size={22} color={String(color)} />;
}
