import { Text, View } from 'react-native';
import { centsColor, noteName } from './derive';
export function NoteReadout({ midi, hz, theme, emptyLabel }: { midi: number | null; hz: number | null; theme: 'dark' | 'light'; emptyLabel: string }) {
  const text = theme === 'dark' ? '#E8EBF1' : '#1B1D22';
  if (midi === null || hz === null) return <View style={{ alignItems: 'center', paddingTop: 6 }}><Text style={{ color: text, fontSize: 36, fontWeight: '800' }}>—</Text><Text style={{ color: '#6B7486', fontSize: 12 }}>{emptyLabel}</Text></View>;
  const cents = Math.round((midi - Math.round(midi)) * 100);
  const name = noteName(midi); const octave = name.match(/-?\d+$/)?.[0] ?? '';
  const color = { green: '#34D399', amber: '#FBBF24', red: '#F87171' }[centsColor(cents)];
  return <View style={{ alignItems: 'center', paddingTop: 6 }}><Text style={{ color: text, fontSize: 58, fontWeight: '800', lineHeight: 64 }}>{name.slice(0, name.length - octave.length)}<Text style={{ fontSize: 26 }}>{octave}</Text></Text><Text style={{ color, fontSize: 17, fontWeight: '700' }}>{cents > 0 ? '+' : ''}{cents}¢</Text><Text style={{ color: '#6B7486', fontSize: 12 }}>{hz.toFixed(1)} Hz</Text></View>;
}
