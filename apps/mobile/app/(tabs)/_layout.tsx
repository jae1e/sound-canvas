import { Tabs } from 'expo-router';

import { useTranslation } from '../../src/i18n';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="sing" options={{ title: t('tabs.sing') }} />
      <Tabs.Screen name="speak" options={{ title: t('tabs.speak') }} />
      <Tabs.Screen name="takes" options={{ title: t('tabs.takes') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
