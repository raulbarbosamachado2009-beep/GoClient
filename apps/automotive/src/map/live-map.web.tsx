import type { LatLng } from './routing';

export interface MapPin {
  id: string;
  coordinate: LatLng;
  label?: string;
  kind: 'stop' | 'client';
}

/** No Preview (web) o mapa real não é usado: a tela mostra o mapa de demonstração. */
export function LiveMap(_props: {
  dark: boolean;
  user: LatLng | null;
  heading?: number | null;
  path: LatLng[];
  pins: MapPin[];
  follow?: boolean;
}) {
  return null;
}
