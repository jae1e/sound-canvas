import { Text, View } from 'react-native';
import { EARCON_NAMES, type EarconName } from '@vlc/session-engine';

import { Card, Chip } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { applyEarconSettings } from '../../speech/earconSettings';
import { earcon } from '../../speech/sessionSpeech';
import { shared } from '../../theme';
import { EARCON_VIBRATION } from '../schema';
import { useSettings } from '../store';
import { Stepper } from './Stepper';

/**
 * Earcon volume (relative to speech), vibration preference and a preview. A tone plays only when the user taps its chip;
 * it follows the system route (earbuds when connected), never the phone speaker by force.
 */
export function EarconSection() {
  const { t } = useTranslation();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  const change = (patch: { earconVolume?: number; earconVibration?: (typeof EARCON_VIBRATION)[number] }) => {
    update(patch);
    applyEarconSettings({ ...settings, ...patch });
  };

  const preview = (name: EarconName) => {
    applyEarconSettings(settings);
    earcon(name, settings.earconVibration !== 'off');
  };

  return (
    <Card>
      <Text style={shared.h2}>{t('settings.earcon.title')}</Text>
      <Text style={shared.muted}>{t('settings.earcon.hint')}</Text>
      <Text style={shared.body}>{t('settings.earcon.volume')}</Text>
      <Stepper value={settings.earconVolume} min={10} max={100} step={10} format={(v) => `${v}%`} onChange={(v) => change({ earconVolume: v })} />
      <Text style={shared.body}>{t('settings.earcon.vibration')}</Text>
      <View style={[shared.row, { flexWrap: 'wrap' }]}>
        {EARCON_VIBRATION.map((v) => (
          <Chip key={v} label={t(`settings.earcon.vibration.${v}`)} selected={settings.earconVibration === v} onPress={() => change({ earconVibration: v })} />
        ))}
      </View>
      <Text style={shared.muted}>{t('settings.earcon.preview')}</Text>
      <View style={[shared.row, { flexWrap: 'wrap' }]}>
        {EARCON_NAMES.map((name) => (
          <Chip key={name} label={t(`settings.earcon.name.${name}`)} selected={false} onPress={() => preview(name)} />
        ))}
      </View>
    </Card>
  );
}
