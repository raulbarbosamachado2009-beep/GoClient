import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { LatLng } from './routing';

/**
 * Endereços já encontrados, guardados no aparelho: os clientes quase não mudam de endereço,
 * então da segunda vez em diante os pinos do mapa aparecem na hora, sem pedir à internet
 * (e sem gastar a cota diária do OpenRouteService). Só guarda os endereços achados.
 */
const MAX = 3000;
const file = () => new File(Paths.document, 'enderecos.json');
const saved = new Map<string, LatLng>();
let loaded: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Lê o arquivo do aparelho (uma vez; as próximas chamadas devolvem a mesma promessa). */
export function loadGeoCache(): Promise<void> {
  if (!loaded)
    loaded = (async () => {
      if (Platform.OS === 'web') return;
      try {
        const f = file();
        if (!f.exists) return;
        const data = JSON.parse(await f.text()) as Record<string, LatLng>;
        for (const [k, v] of Object.entries(data))
          if (v && typeof v.latitude === 'number') saved.set(k, v);
      } catch {
        // Arquivo velho ou corrompido: os endereços são buscados de novo.
      }
    })();
  return loaded;
}

export const savedPlace = (address: string): LatLng | undefined => saved.get(address);

export function savePlace(address: string, p: LatLng) {
  saved.set(address, p);
  if (saved.size > MAX) {
    const first = saved.keys().next().value;
    if (first !== undefined) saved.delete(first);
  }
  if (Platform.OS === 'web' || timer) return;
  // Junta várias gravações seguidas numa só.
  timer = setTimeout(() => {
    timer = null;
    try {
      file().write(JSON.stringify(Object.fromEntries(saved)));
    } catch {}
  }, 1000);
}
