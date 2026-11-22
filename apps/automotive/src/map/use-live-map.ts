import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { MAPS_ENABLED } from '../integrations/env';
import type { MockClient } from '../mocks/data';
import { computeRoute, geocode, type LatLng, type LiveRoute } from './routing';

/** Posição do carro pelo GPS (pede a permissão na primeira vez). */
export function useCarPosition(enabled = MAPS_ENABLED) {
  const [position, setPosition] = useState<LatLng | null>(null);
  // Direção do carro (graus a partir do norte), para girar o mapa na navegação.
  const [heading, setHeading] = useState<number | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let alive = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!alive) return;
      if (status !== 'granted') {
        setDenied(true);
        return;
      }
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last && alive) setPosition(last.coords);
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 1000 },
        (p) => {
          if (!alive) return;
          setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude });
          // Parado, o GPS não sabe a direção (vem -1): mantém a última.
          if (p.coords.heading != null && p.coords.heading >= 0 && (p.coords.speed ?? 0) > 1)
            setHeading(p.coords.heading);
        },
      );
    })().catch(() => setDenied(true));
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [enabled]);
  return { position, heading, denied };
}

export const clientAddress = (c: MockClient) =>
  `${c.address}, ${c.district.split(' · ').slice(1).join(' ') || c.district}, Brasil`;

/** Coordenadas dos clientes (pelo endereço cadastrado). */
export function useClientPlaces(clients: MockClient[], enabled = MAPS_ENABLED) {
  const [places, setPlaces] = useState<Record<string, LatLng>>({});
  const key = clients.map((c) => c.id).join(',');
  // biome-ignore lint/correctness/useExhaustiveDependencies: refaz só quando a lista muda
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      for (const c of clients) {
        const p = await geocode(clientAddress(c)).catch(() => null);
        if (!alive) return;
        if (p) setPlaces((cur) => ({ ...cur, [c.id]: p }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [key, enabled]);
  return places;
}

/**
 * Rota real do carro até `stops` (na ordem dada; com `optimize`, as paradas do meio são
 * reordenadas). É **uma** rota para todas as paradas, calculada uma vez — ao escolher o
 * cliente ou montar a rota do dia — e de novo só quando as paradas mudam ou, com `reroute`
 * (navegando), quando o carro **sai do caminho** (errou uma rua ou a rotatória): mais de
 * 60 m longe da linha da rota em duas leituras seguidas do GPS, para um salto do sinal não
 * contar como erro. Assim cada rota gasta um pedido da cota gratuita.
 */
export function useLiveRoute(
  origin: LatLng | null,
  stops: LatLng[],
  optimize: boolean,
  reroute = false,
) {
  const [route, setRoute] = useState<LiveRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const originRef = useRef<LatLng | null>(null);
  originRef.current = origin;
  const [epoch, setEpoch] = useState(0);
  const started = useRef(false);
  const off = useRef(0);
  const lastAt = useRef(0);
  const pathRef = useRef<LatLng[]>([]);
  pathRef.current = route?.path ?? [];

  useEffect(() => {
    if (!origin) return;
    // Primeira posição conhecida: calcula a partir dela.
    if (!started.current) {
      started.current = true;
      setEpoch((e) => e + 1);
      return;
    }
    if (!reroute) return;
    const path = pathRef.current;
    if (path.length < 2) return;
    off.current = distanceToPath(origin, path) > OFF_ROUTE_M ? off.current + 1 : 0;
    // Saiu do caminho: recalcula a partir de onde o carro está (no máximo a cada 15 s).
    if (off.current >= 2 && Date.now() - lastAt.current > 15000) {
      off.current = 0;
      setRerouting(true);
      setEpoch((e) => e + 1);
    }
  }, [origin, reroute]);

  const stopsKey = stops.map((s) => `${s.latitude.toFixed(5)},${s.longitude.toFixed(5)}`).join('|');

  // biome-ignore lint/correctness/useExhaustiveDependencies: recalcula por paradas ou ao sair do caminho
  useEffect(() => {
    const from = originRef.current;
    if (!from || stops.length === 0 || !started.current) {
      setRoute(null);
      return;
    }
    let alive = true;
    lastAt.current = Date.now();
    computeRoute(from, stops, optimize)
      .then((r) => {
        if (!alive) return;
        setRoute(r);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Falha na rota'))
      .finally(() => alive && setRerouting(false));
    return () => {
      alive = false;
    };
  }, [stopsKey, optimize, epoch]);

  return { route: stops.length > 0 ? route : null, error, rerouting };
}

/** Distância aproximada em metros entre dois pontos. */
export function distance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distância (m) a partir da qual o carro é considerado fora do caminho. */
const OFF_ROUTE_M = 60;

/** Menor distância aproximada (m) de um ponto até a linha da rota. */
export function distanceToPath(p: LatLng, path: LatLng[]): number {
  // Projeção plana local (suficiente para dezenas de metros).
  const k = Math.cos((p.latitude * Math.PI) / 180);
  const M = 111320;
  const xy = (q: LatLng) => ({
    x: (q.longitude - p.longitude) * M * k,
    y: (q.latitude - p.latitude) * M,
  });
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < path.length; i++) {
    const a = xy(path[i - 1] as LatLng);
    const b = xy(path[i] as LatLng);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = dx * dx + dy * dy;
    const t = len > 0 ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len)) : 0;
    const d = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (d < best) best = d;
  }
  return best;
}
