import { desc, eq } from 'drizzle-orm';

import { places, routes } from '../schema';
import type { AppDb } from '../types';

export interface SavedPlace {
  id: string;
  externalId: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  source: string | null;
  createdAt: number;
}

/** Saves a place once per provider id; saving it again returns the existing row. */
export function savePlace(
  db: AppDb,
  p: { id: string; externalId?: string | null; name: string; address?: string | null; latitude: number; longitude: number; category?: string | null; source?: string | null; now: number },
): SavedPlace {
  if (p.externalId) {
    const dup = db.select().from(places).where(eq(places.externalId, p.externalId)).get();
    if (dup) return dup;
  }
  db.insert(places)
    .values({
      id: p.id,
      externalId: p.externalId ?? null,
      name: p.name,
      address: p.address ?? null,
      latitude: p.latitude,
      longitude: p.longitude,
      category: p.category ?? null,
      source: p.source ?? null,
      createdAt: p.now,
    })
    .run();
  return db.select().from(places).where(eq(places.id, p.id)).get() as SavedPlace;
}

export function listPlaces(db: AppDb, limit = 200): SavedPlace[] {
  return db.select().from(places).orderBy(desc(places.createdAt)).limit(limit).all();
}

export function getPlace(db: AppDb, id: string): SavedPlace | null {
  return db.select().from(places).where(eq(places.id, id)).get() ?? null;
}

export interface WalkPoint {
  lat: number;
  lng: number;
  /** Fix time, epoch ms. */
  t: number;
}

export interface StoredRoute {
  id: string;
  sessionId: string | null;
  kind: string;
  fromPlaceId: string | null;
  toPlaceId: string | null;
  distanceM: number | null;
  durationMs: number | null;
  polyline: WalkPoint[];
  startedAt: number | null;
  endedAt: number | null;
  createdAt: number;
}

/** Stores a route; the polyline goes to `geometry_json` as `[lat, lng, t]` triples to keep long walks small. */
export function saveRoute(
  db: AppDb,
  r: {
    id: string;
    sessionId?: string | null;
    kind: 'walked' | 'planned';
    fromPlaceId?: string | null;
    toPlaceId?: string | null;
    distanceM: number;
    durationMs: number;
    polyline: WalkPoint[];
    startedAt: number;
    endedAt: number;
    now: number;
  },
): void {
  db.insert(routes)
    .values({
      id: r.id,
      sessionId: r.sessionId ?? null,
      kind: r.kind,
      fromPlaceId: r.fromPlaceId ?? null,
      toPlaceId: r.toPlaceId ?? null,
      distanceM: r.distanceM,
      durationMs: Math.round(r.durationMs),
      geometryJson: JSON.stringify(r.polyline.map((p) => [p.lat, p.lng, p.t])),
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      createdAt: r.now,
    })
    .run();
}

export function getRoute(db: AppDb, id: string): StoredRoute | null {
  const r = db.select().from(routes).where(eq(routes.id, id)).get();
  if (!r) return null;
  let polyline: WalkPoint[] = [];
  try {
    const raw = JSON.parse(r.geometryJson ?? '[]') as [number, number, number][];
    polyline = raw.map(([lat, lng, t]) => ({ lat, lng, t }));
  } catch {
    polyline = [];
  }
  return {
    id: r.id,
    sessionId: r.sessionId,
    kind: r.kind,
    fromPlaceId: r.fromPlaceId,
    toPlaceId: r.toPlaceId,
    distanceM: r.distanceM,
    durationMs: r.durationMs,
    polyline,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    createdAt: r.createdAt,
  };
}

export function listRoutes(db: AppDb, limit = 50): { id: string; kind: string; distanceM: number | null; durationMs: number | null; startedAt: number | null }[] {
  return db
    .select({ id: routes.id, kind: routes.kind, distanceM: routes.distanceM, durationMs: routes.durationMs, startedAt: routes.startedAt })
    .from(routes)
    .orderBy(desc(routes.createdAt))
    .limit(limit)
    .all();
}
