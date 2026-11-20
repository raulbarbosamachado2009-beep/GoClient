import { Linking } from 'react-native';
import { ANDROID_CERT_SHA1, ANDROID_PACKAGE, GOOGLE_MAPS_KEY } from '../integrations/env';

/**
 * Serviços web do Google Maps Platform usados pelo mapa real:
 * - Places API (New) · Text Search: endereço do cliente → coordenadas;
 * - Routes API · computeRoutes: caminho, tempo, distância e manobras (com trânsito).
 *
 * Os cabeçalhos X-Android-* permitem restringir a chave a este app no Google Cloud.
 * A navegação curva a curva com voz fica com o app do Google Maps (sem custo): o GoClient
 * monta o trajeto e abre o Maps (ver openInGoogleMaps).
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

const headers = (fieldMask: string) => ({
  'Content-Type': 'application/json',
  'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
  'X-Goog-FieldMask': fieldMask,
  'X-Android-Package': ANDROID_PACKAGE,
  'X-Android-Cert': ANDROID_CERT_SHA1,
});

async function post<T>(url: string, fieldMask: string, body: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(fieldMask),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: { message?: string; status?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Google Maps: erro ${res.status}`);
  }
  return json;
}

// Endereços já encontrados nesta sessão (os clientes mudam pouco).
const geocodeCache = new Map<string, LatLng | null>();

/** Coordenadas de um endereço (Brasil, em português). */
export async function geocode(address: string): Promise<LatLng | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address) ?? null;
  const json = await post<{ places?: { location?: { latitude: number; longitude: number } }[] }>(
    'https://places.googleapis.com/v1/places:searchText',
    'places.location',
    { textQuery: address, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 1 },
  );
  const loc = json.places?.[0]?.location ?? null;
  const value = loc ? { latitude: loc.latitude, longitude: loc.longitude } : null;
  geocodeCache.set(address, value);
  return value;
}

export interface RouteStep {
  instruction: string;
  maneuver?: string;
  distanceMeters: number;
}

export interface LiveRoute {
  path: LatLng[];
  durationSeconds: number;
  distanceMeters: number;
  /** Ordem otimizada das paradas intermediárias (índices da lista enviada). */
  order: number[];
  steps: RouteStep[];
}

const waypoint = (p: LatLng) => ({ location: { latLng: p } });

/**
 * Caminho de carro com trânsito. Com `optimize`, o Google reordena as paradas
 * intermediárias para o menor tempo (o destino final continua o último).
 */
export async function computeRoute(
  origin: LatLng,
  stops: LatLng[],
  optimize = false,
): Promise<LiveRoute> {
  const destination = stops[stops.length - 1];
  if (!destination) throw new Error('Rota sem destino');
  const intermediates = stops.slice(0, -1);
  const json = await post<{
    routes?: {
      duration?: string;
      distanceMeters?: number;
      polyline?: { encodedPolyline?: string };
      optimizedIntermediateWaypointIndex?: number[];
      legs?: {
        steps?: {
          distanceMeters?: number;
          navigationInstruction?: { instructions?: string; maneuver?: string };
        }[];
      }[];
    }[];
  }>(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    [
      'routes.duration',
      'routes.distanceMeters',
      'routes.polyline.encodedPolyline',
      'routes.optimizedIntermediateWaypointIndex',
      'routes.legs.steps.distanceMeters',
      'routes.legs.steps.navigationInstruction',
    ].join(','),
    {
      origin: waypoint(origin),
      destination: waypoint(destination),
      intermediates: intermediates.map(waypoint),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      optimizeWaypointOrder: optimize && intermediates.length > 1,
      languageCode: 'pt-BR',
      units: 'METRIC',
    },
  );
  const r = json.routes?.[0];
  if (!r?.polyline?.encodedPolyline) throw new Error('O Google não encontrou um caminho');
  return {
    path: decodePolyline(r.polyline.encodedPolyline),
    durationSeconds: Number.parseInt(r.duration ?? '0', 10),
    distanceMeters: r.distanceMeters ?? 0,
    order:
      r.optimizedIntermediateWaypointIndex?.filter((i) => i >= 0) ?? intermediates.map((_, i) => i),
    steps:
      r.legs?.flatMap(
        (leg) =>
          leg.steps?.map((s) => ({
            instruction: s.navigationInstruction?.instructions ?? '',
            maneuver: s.navigationInstruction?.maneuver,
            distanceMeters: s.distanceMeters ?? 0,
          })) ?? [],
      ) ?? [],
  };
}

/** Polilinha codificada do Google → lista de coordenadas. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/** Abre o app do Google Maps já navegando (com as paradas intermediárias, se houver). */
export function openInGoogleMaps(stops: LatLng[]) {
  const destination = stops[stops.length - 1];
  if (!destination) return;
  const fmt = (p: LatLng) => `${p.latitude},${p.longitude}`;
  const params = new URLSearchParams({
    api: '1',
    destination: fmt(destination),
    travelmode: 'driving',
    dir_action: 'navigate',
  });
  if (stops.length > 1) params.set('waypoints', stops.slice(0, -1).map(fmt).join('|'));
  Linking.openURL(`https://www.google.com/maps/dir/?${params}`).catch(() => {});
}

export function formatDuration(seconds: number): { value: string; unit: string } {
  const min = Math.round(seconds / 60);
  if (min < 60) return { value: String(min), unit: 'min' };
  return { value: `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`, unit: 'hrs' };
}

export function formatKm(meters: number): string {
  return (meters / 1000).toFixed(1).replace('.', ',');
}

export function formatArrival(seconds: number): string {
  const d = new Date(Date.now() + seconds * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatStepDistance(meters: number): string {
  return meters >= 1000 ? `${formatKm(meters)} km` : `${Math.round(meters / 10) * 10} m`;
}
