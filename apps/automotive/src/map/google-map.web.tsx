import type { LatLng } from './google';

export interface MapPin {
  id: string;
  coordinate: LatLng;
  label?: string;
  kind: 'stop' | 'client';
}

/** No Preview (web) o mapa real não é usado: a tela mostra o mapa de demonstração. */
export function GoogleMap(_props: {
  dark: boolean;
  user: LatLng | null;
  path: LatLng[];
  pins: MapPin[];
}) {
  return null;
}
