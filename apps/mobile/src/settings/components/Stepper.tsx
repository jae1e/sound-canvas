import { Text, View } from 'react-native';

import { Button } from '../../components/ui';
import { shared } from '../../theme';

/** A minus / value / plus control clamped to [min, max]. */
export function Stepper({ value, min, max, step = 1, format, onChange }: { value: number; min: number; max: number; step?: number; format?: (v: number) => string; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View style={shared.row}>
      <Button label="-" onPress={() => onChange(clamp(value - step))} disabled={value <= min} />
      <Text style={[shared.body, { minWidth: 90, textAlign: 'center' }]}>{format ? format(value) : String(value)}</Text>
      <Button label="+" onPress={() => onChange(clamp(value + step))} disabled={value >= max} />
    </View>
  );
}
