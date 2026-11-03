import { categoryCodeFor, cumulativeDistances, destinationPoint, haversineM } from '@vlc/travel';
import type { LatLng, Place, RouteStep, WalkRoute, WhereAmI } from '@vlc/travel';
import type { SearchParams, TravelClient } from './client';

/** Fixture places laid out around the caller so the UI works anywhere without keys. */
const FIXTURES: Array<{ name: string; code: string; category: string; bearing: number; distanceM: number }> = [
  { name: '모의 카페 A', code: 'CE7', category: '카페', bearing: 20, distanceM: 120 },
  { name: '모의 카페 B', code: 'CE7', category: '카페', bearing: 140, distanceM: 260 },
  { name: '모의 카페 C', code: 'CE7', category: '카페', bearing: 250, distanceM: 410 },
  { name: '모의 편의점', code: 'CS2', category: '편의점', bearing: 80, distanceM: 90 },
  { name: '모의 편의점 2', code: 'CS2', category: '편의점', bearing: 200, distanceM: 330 },
  { name: '모의 식당', code: 'FD6', category: '음식점', bearing: 310, distanceM: 180 },
  { name: '모의 약국', code: 'PM9', category: '약국', bearing: 45, distanceM: 150 },
  { name: '모의 지하철역', code: 'SW8', category: '지하철역', bearing: 170, distanceM: 480 },
];

export class MockTravelClient implements TravelClient {
  readonly mode = 'mock' as const;

  async searchPlaces(p: SearchParams): Promise<Place[]> {
    const here = { lat: p.lat, lng: p.lng };
    const code = categoryCodeFor(p.category);
    return FIXTURES.filter((f) => (!code || f.code === code) && (!p.query || code || f.name.includes(p.query) || f.category.includes(p.query)))
      .map((f, i): Place => {
        const pt = destinationPoint(here, f.bearing, f.distanceM);
        return {
          id: `mock:${i}:${f.name}`,
          name: f.name,
          category: f.category,
          categoryCode: f.code,
          distanceM: Math.round(haversineM(here, pt)),
          lat: pt.lat,
          lng: pt.lng,
          address: '모의 주소 1',
          source: 'mock',
        };
      })
      .filter((pl) => pl.distanceM <= (p.radiusM ?? 500))
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, p.limit ?? 5);
  }

  async where(): Promise<WhereAmI> {
    return { area: '모의 시 모의구 모의동', roadAddress: '모의로 1', source: 'mock' };
  }

  /** Dog-leg route: north first, then toward the target's longitude, then the rest of the way. */
  async walkRoute(p: { from: LatLng; to: LatLng }): Promise<WalkRoute> {
    const corner: LatLng = { lat: p.to.lat, lng: p.from.lng };
    const line: LatLng[] = [p.from];
    const addLeg = (a: LatLng, b: LatLng) => {
      const n = Math.max(1, Math.round(haversineM(a, b) / 10));
      for (let i = 1; i <= n; i++) {
        line.push({ lat: a.lat + ((b.lat - a.lat) * i) / n, lng: a.lng + ((b.lng - a.lng) * i) / n });
      }
    };
    addLeg(p.from, corner);
    const cornerIdx = line.length - 1;
    addLeg(corner, p.to);
    const cum = cumulativeDistances(line);
    const total = cum[cum.length - 1] ?? 0;
    const east = p.to.lng >= p.from.lng;
    const northward = p.to.lat >= p.from.lat;
    const turn = northward === east ? 'right' : 'left';
    const steps: RouteStep[] = [
      { point: p.from, pathIndex: 0, instruction: '출발', instructionEn: 'Start walking', turn: 'start', distanceToNextM: Math.round(cum[cornerIdx] ?? 0) },
    ];
    if (cornerIdx > 0 && cornerIdx < line.length - 1) {
      steps.push({
        point: corner,
        pathIndex: cornerIdx,
        instruction: turn === 'right' ? '우회전' : '좌회전',
        instructionEn: turn === 'right' ? 'Turn right' : 'Turn left',
        turn,
        distanceToNextM: Math.round(total - (cum[cornerIdx] ?? 0)),
      });
    }
    steps.push({ point: p.to, pathIndex: line.length - 1, instruction: '도착', instructionEn: 'Arrive', turn: 'arrive', distanceToNextM: 0 });
    return { provider: 'mock', polyline: line, distanceM: Math.round(total), durationS: Math.round(total / 1.3), steps };
  }
}
