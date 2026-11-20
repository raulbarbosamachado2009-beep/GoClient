import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_ENABLED } from '../integrations/env';
import type { MockClient } from '../mocks/data';
import { computeRoute, geocode, type LatLng, type LiveRoute } from './google';

/** Posição do carro pelo GPS (pede a permissão na primeira vez). */
export function useCarPosition(enabled = GOOGLE_MAPS_ENABLED) {
  const [position, setPosition] = useState<LatLng | null>(null);
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
        { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 3000 },
        (p) => alive && setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      );
    })().catch(() => setDenied(true));
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [enabled]);
  return { position, denied };
}

export const clientAddress = (c: MockClient) =>
  `${c.address}, ${c.district.split(' · ').slice(1).join(' ') || c.district}, Brasil`;

/** Coordenadas dos clientes (pelo endereço cadastrado). */
export function useClientPlaces(clients: MockClient[], enabled = GOOGLE_MAPS_ENABLED) {
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
 * Rota real do carro até `stops` (na ordem dada; com `optimize`, o Google reordena as
 * paradas do meio). Recalcula quando as paradas mudam ou quando o carro já andou ~2 km
 * desde o último cálculo (para o tempo de chegada acompanhar o trânsito sem gastar a
 * cota gratuita de rotas a cada quarteirão).
 */
export function useLiveRoute(origin: LatLng | null, stops: LatLng[], optimize: boolean) {
  const [route, setRoute] = useState<LiveRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const anchor = useRef<LatLng | null>(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (origin && (!anchor.current || distance(origin, anchor.current) > 2000)) {
      anchor.current = origin;
      setEpoch((e) => e + 1);
    }
  }, [origin]);

  const stopsKey = stops.map((s) => `${s.latitude.toFixed(5)},${s.longitude.toFixed(5)}`).join('|');

  // biome-ignore lint/correctness/useExhaustiveDependencies: recalcula por paradas ou deslocamento
  useEffect(() => {
    const from = anchor.current;
    if (!from || stops.length === 0) {
      setRoute(null);
      return;
    }
    let alive = true;
    computeRoute(from, stops, optimize)
      .then((r) => {
        if (!alive) return;
        setRoute(r);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Falha na rota'));
    return () => {
      alive = false;
    };
  }, [stopsKey, optimize, epoch]);

  return { route: stops.length > 0 ? route : null, error };
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
