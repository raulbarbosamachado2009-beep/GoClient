import { ORS_API_KEY } from '../integrations/env';

/**
 * Rotas e endereços pelo OpenRouteService (plano gratuito, dados do OpenStreetMap):
 * - endereço do cliente → coordenadas (Pelias): 3.000 por dia;
 * - caminho, tempo, distância e manobras em português (directions): 2.000 por dia;
 * - melhor ordem das paradas da rota do dia (VROOM): 500 por dia.
 *
 * Preferência de caminho: a rota **mais curta**, evitando vias expressas. Na prática ela
 * corta por dentro dos bairros em vez de dar a volta pelas avenidas (é o objetivo do
 * GoClient: chegar às barbearias da periferia). Não há trânsito em tempo real.
 *
 * Endereço da API: api.heigit.org (o antigo api.openrouteservice.org foi desligado em set/2026).
 */

const BASE = 'https://api.heigit.org';

/** Como o caminho é escolhido (ver comentário acima). */
export const ROUTE_PREFERENCE: 'shortest' | 'recommended' | 'fastest' = 'shortest';

export interface LatLng {
  latitude: number;
  longitude: number;
}

const toLngLat = (p: LatLng): [number, number] => [p.longitude, p.latitude];

async function request<T>(url: string, body?: object): Promise<T> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: ORS_API_KEY,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : null),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string } | string;
  };
  if (!res.ok) {
    const e = json.error;
    if (res.status === 403 || res.status === 429)
      throw new Error('Mapa indisponível: limite diário atingido ou chave recusada.');
    throw new Error(typeof e === 'string' ? e : (e?.message ?? `Mapa: erro ${res.status}`));
  }
  return json;
}

// Endereços já encontrados nesta sessão (os clientes mudam pouco).
const geocodeCache = new Map<string, LatLng | null>();

/** Coordenadas de um endereço no Brasil. */
export async function geocode(address: string): Promise<LatLng | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address) ?? null;
  const q = new URLSearchParams({
    text: address,
    'boundary.country': 'BR',
    size: '1',
    lang: 'pt',
  });
  const json = await request<{ features?: { geometry?: { coordinates?: [number, number] } }[] }>(
    `${BASE}/pelias/v1/search?${q}`,
  );
  const c = json.features?.[0]?.geometry?.coordinates;
  const value = c ? { latitude: c[1], longitude: c[0] } : null;
  geocodeCache.set(address, value);
  return value;
}

export interface PlaceHit {
  /** Nome completo (ex.: "Avenida Alvarenga, Butantã, São Paulo, SP"). */
  label: string;
  coordinate: LatLng;
  /** Distância (km) do ponto de referência, quando houver. */
  km: number | null;
}

/**
 * Procura lugares (ruas, bairros, cidades, estabelecimentos) para a Havena, com preferência
 * pelos mais perto de `near` (a posição do carro).
 */
export async function searchPlaces(text: string, near?: LatLng | null): Promise<PlaceHit[]> {
  const q = new URLSearchParams({ text, 'boundary.country': 'BR', size: '4', lang: 'pt' });
  if (near) {
    q.set('focus.point.lat', String(near.latitude));
    q.set('focus.point.lon', String(near.longitude));
  }
  const json = await request<{
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: { label?: string; name?: string; distance?: number };
    }[];
  }>(`${BASE}/pelias/v1/search?${q}`);
  const hits: PlaceHit[] = [];
  for (const f of json.features ?? []) {
    const c = f.geometry?.coordinates;
    const label = f.properties?.label ?? f.properties?.name;
    if (!c || !label) continue;
    const coordinate = { latitude: c[1], longitude: c[0] };
    // Guarda no cache: a rota depois geocodifica pelo mesmo texto e cai no mesmo ponto.
    geocodeCache.set(label, coordinate);
    geocodeCache.set(`${label}, Brasil`, coordinate);
    hits.push({
      label,
      coordinate,
      km: f.properties?.distance != null ? Math.round(f.properties.distance * 10) / 10 : null,
    });
  }
  return hits;
}

/**
 * Manobra no formato do OpenRouteService. `type`: 0 esquerda, 1 direita, 2 esquerda
 * fechada, 3 direita fechada, 4 levemente à esquerda, 5 levemente à direita, 6 em frente,
 * 7 entrar na rotatória, 8 sair da rotatória, 9 retorno, 10 chegada, 11 partida,
 * 12 manter à esquerda, 13 manter à direita.
 */
export interface RouteStep {
  instruction: string;
  type: number;
  /** Nome da rua (quando houver). */
  name: string;
  distanceMeters: number;
  /** Trecho da linha da rota coberto por esta manobra (índices em `path`). */
  from: number;
  to: number;
}

export interface LiveRoute {
  path: LatLng[];
  durationSeconds: number;
  distanceMeters: number;
  /** Ordem otimizada das paradas intermediárias (índices da lista enviada). */
  order: number[];
  steps: RouteStep[];
}

/**
 * Melhor ordem das paradas do meio (o destino final continua o último). Se o serviço de
 * ordem falhar ou o limite diário acabar, segue a ordem planejada.
 */
async function bestOrder(origin: LatLng, middle: LatLng[], end: LatLng): Promise<number[]> {
  const planned = middle.map((_, i) => i);
  if (middle.length < 2) return planned;
  try {
    const json = await request<{ routes?: { steps?: { type: string; id?: number }[] }[] }>(
      `${BASE}/vroom/v0`,
      {
        jobs: middle.map((p, i) => ({ id: i + 1, location: toLngLat(p) })),
        vehicles: [{ id: 1, profile: 'driving-car', start: toLngLat(origin), end: toLngLat(end) }],
      },
    );
    const ids =
      json.routes?.[0]?.steps
        ?.filter((s) => s.type === 'job' && s.id)
        .map((s) => (s.id as number) - 1) ?? [];
    return ids.length === middle.length ? ids : planned;
  } catch {
    return planned;
  }
}

/**
 * Caminho de carro do ponto de partida até as paradas. Com `optimize`, as paradas
 * intermediárias são reordenadas para a menor viagem (o destino final continua o último).
 * É **uma** rota para todas as paradas.
 */
export async function computeRoute(
  origin: LatLng,
  stops: LatLng[],
  optimize = false,
): Promise<LiveRoute> {
  const destination = stops[stops.length - 1];
  if (!destination) throw new Error('Rota sem destino');
  const middle = stops.slice(0, -1);
  const order = optimize ? await bestOrder(origin, middle, destination) : middle.map((_, i) => i);
  const ordered = [...order.map((i) => middle[i] as LatLng), destination];

  const json = await request<{
    routes?: {
      summary?: { distance?: number; duration?: number };
      geometry?: string;
      segments?: {
        steps?: {
          distance?: number;
          type?: number;
          instruction?: string;
          name?: string;
          way_points?: [number, number];
        }[];
      }[];
    }[];
  }>(`${BASE}/openrouteservice/v2/directions/driving-car`, {
    coordinates: [origin, ...ordered].map(toLngLat),
    preference: ROUTE_PREFERENCE,
    options: { avoid_features: ['highways'] },
    language: 'pt',
    instructions: true,
    units: 'm',
  });
  const r = json.routes?.[0];
  if (!r?.geometry) throw new Error('Não foi encontrado um caminho até o cliente');
  return {
    path: decodePolyline(r.geometry),
    durationSeconds: r.summary?.duration ?? 0,
    distanceMeters: r.summary?.distance ?? 0,
    order,
    steps:
      r.segments?.flatMap(
        (seg) =>
          seg.steps?.map((s) => ({
            instruction: s.instruction ?? '',
            type: s.type ?? 6,
            name: s.name && s.name !== '-' ? s.name : '',
            distanceMeters: s.distance ?? 0,
            from: s.way_points?.[0] ?? 0,
            to: s.way_points?.[1] ?? 0,
          })) ?? [],
      ) ?? [],
  };
}

/** Polilinha codificada (precisão de 5 casas, mesmo formato do Google) → coordenadas. */
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
