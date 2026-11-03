import type { LatLng, WalkRoute } from '@vlc/travel';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

/**
 * Minimal route drawing: the polyline, step dots and the current position, no map tiles.
 * Follow-up options for a real map: MapLibre (@maplibre/maplibre-react-native) with OpenFreeMap tiles,
 * or the Kakao/Naver map SDKs (check licence terms for drawing provider geometry first).
 */
export function RoutePreview({ route, position, size = 240 }: { route: WalkRoute; position?: LatLng | null; size?: number }) {
  const pts = [...route.polyline, ...(position ? [position] : [])];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const w = Math.max(1e-9, (maxLng - minLng) * k);
  const h = Math.max(1e-9, maxLat - minLat);
  const pad = 14;
  const scale = (size - pad * 2) / Math.max(w, h);
  const x = (lng: number) => pad + (lng - minLng) * k * scale;
  const y = (lat: number) => size - pad - (lat - minLat) * scale;
  const points = route.polyline.map((p) => `${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`).join(' ');

  return (
    <View style={styles.box}>
      <Svg width={size} height={size} accessibilityLabel="route preview">
        <Polyline points={points} fill="none" stroke="#2563eb" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        {route.steps.map((s, i) => (
          <Circle key={i} cx={x(s.point.lng)} cy={y(s.point.lat)} r={i === 0 ? 6 : 4} fill={i === 0 ? '#16a34a' : i === route.steps.length - 1 ? '#dc2626' : '#fff'} stroke="#2563eb" strokeWidth={2} />
        ))}
        {position && <Circle cx={x(position.lng)} cy={y(position.lat)} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center', backgroundColor: '#eef2f7', borderRadius: 8, overflow: 'hidden' },
});
