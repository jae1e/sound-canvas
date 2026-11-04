import type { Lang, LatLng, Landmark, LandmarkDetail, Place, WalkRoute, WhereAmI } from '@vlc/travel';
import { readTravelConfig, type TravelConfig } from './config';
import { MockTravelClient } from './mock';

export type SearchParams = {
  lat: number;
  lng: number;
  query?: string;
  category?: string;
  radiusM?: number;
  limit?: number;
};

export type LandmarkParams = { lat: number; lng: number; radiusM?: number; lang: Lang; limit?: number; theme?: 'historic' | 'any' };
/** `name` lets the Worker try Wikipedia when the provider has no text. */
export type LandmarkDetailParams = { id: string; lang: Lang; name?: string };

/** Everything the Travel Guide needs from the network. Swap implementations freely. */
export interface TravelClient {
  readonly mode: 'worker' | 'mock';
  searchPlaces(p: SearchParams, signal?: AbortSignal): Promise<Place[]>;
  where(p: LatLng, signal?: AbortSignal): Promise<WhereAmI>;
  walkRoute(p: { from: LatLng; to: LatLng; via?: LatLng[] }, signal?: AbortSignal): Promise<WalkRoute>;
  nearbyLandmarks(p: LandmarkParams, signal?: AbortSignal): Promise<Landmark[]>;
  landmarkDetail(p: LandmarkDetailParams, signal?: AbortSignal): Promise<LandmarkDetail>;
}

export class TravelClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class WorkerTravelClient implements TravelClient {
  readonly mode = 'worker' as const;
  constructor(
    private readonly cfg: TravelConfig,
    private readonly doFetch: typeof fetch = fetch,
  ) {}

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    let res: Response;
    try {
      res = await this.doFetch(`${this.cfg.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.token}` },
        body: JSON.stringify(body),
        signal,
      });
    } catch {
      throw new TravelClientError(0, 'network');
    }
    if (!res.ok) throw new TravelClientError(res.status, `worker ${res.status}`);
    return (await res.json()) as T;
  }

  async searchPlaces(p: SearchParams, signal?: AbortSignal): Promise<Place[]> {
    const body = { radiusM: 500, limit: 5, ...p };
    return (await this.post<{ places: Place[] }>('/places/search', body, signal)).places;
  }

  async where(p: LatLng, signal?: AbortSignal): Promise<WhereAmI> {
    return (await this.post<{ where: WhereAmI }>('/places/where', p, signal)).where;
  }

  async walkRoute(p: { from: LatLng; to: LatLng; via?: LatLng[] }, signal?: AbortSignal): Promise<WalkRoute> {
    return (await this.post<{ route: WalkRoute }>('/route/walk', p, signal)).route;
  }

  async nearbyLandmarks(p: LandmarkParams, signal?: AbortSignal): Promise<Landmark[]> {
    return (await this.post<{ landmarks: Landmark[] }>('/landmarks/nearby', { radiusM: 1500, limit: 3, theme: 'historic', ...p }, signal)).landmarks;
  }

  async landmarkDetail(p: LandmarkDetailParams, signal?: AbortSignal): Promise<LandmarkDetail> {
    return (await this.post<{ detail: LandmarkDetail }>('/landmarks/detail', p, signal)).detail;
  }
}

/** Worker client when configured, otherwise the fixture client. */
export function createTravelClient(cfg: TravelConfig = readTravelConfig()): TravelClient {
  return cfg.mock ? new MockTravelClient() : new WorkerTravelClient(cfg);
}
