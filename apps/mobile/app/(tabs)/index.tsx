import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
export default function Index() {
  const [tab, setTab] = useState<'sing' | 'speak' | 'takes' | null>(null);
  useEffect(() => {
    void SecureStore.getItemAsync('vc.lastTab').then(
      (v) => setTab(v === 'speak' || v === 'takes' ? v : 'sing'),
      () => setTab('sing'),
    );
  }, []);
  return tab ? <Redirect href={`/${tab}`} /> : null;
}
