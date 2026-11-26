import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Location from 'expo-location';

/**
 * Pedidos de permissão reais: abrem o pop-up do próprio sistema (Android/iOS) ou do navegador.
 * Devolvem se a pessoa permitiu. Uma recusa não bloqueia o app (dá para mudar depois nos
 * ajustes do aparelho).
 */
export type PermissionKind = 'location' | 'microphone';

export async function requestPermission(kind: PermissionKind): Promise<boolean> {
  try {
    if (kind === 'location') {
      const r = await Location.requestForegroundPermissionsAsync();
      return r.granted;
    }
    const r = await requestRecordingPermissionsAsync();
    return r.granted;
  } catch {
    return false;
  }
}
