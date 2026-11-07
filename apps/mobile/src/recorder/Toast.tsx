import { Text, View } from 'react-native';
export function Toast({ message }: { message: string | null }) { return message ? <View accessibilityRole="alert" style={{ position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: '#333842', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 }}><Text style={{ color: 'white' }}>{message}</Text></View> : null; }
