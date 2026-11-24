import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

/**
 * Pedidos de permissão reais: abrem o pop-up do próprio sistema (Android/iOS) ou do navegador.
 *
 * O Android só mostra o pop-up enquanto a pessoa não recusou duas vezes (ou marcou "não
 * perguntar de novo"). Depois disso o pedido volta "negado" na hora, sem mostrar nada — era o
 * que acontecia no aparelho: o botão "Permitir" parecia não fazer nada. Nesse caso abrimos a
 * página de permissões do GoClient nos Ajustes do aparelho.
 */
export type PermissionKind = 'location' | 'microphone';

/** `granted` = liberada; `settings` = só dá para liberar nos Ajustes; `denied` = recusada agora. */
export type PermissionResult = 'granted' | 'denied' | 'settings';

interface Status {
  granted: boolean;
  canAskAgain: boolean;
}

const get = (kind: PermissionKind): Promise<Status> =>
  kind === 'location' ? Location.getForegroundPermissionsAsync() : getRecordingPermissionsAsync();

const ask = (kind: PermissionKind): Promise<Status> =>
  kind === 'location'
    ? Location.requestForegroundPermissionsAsync()
    : requestRecordingPermissionsAsync();

/** Já está liberada? (para a tela mostrar "Permitido" sem pedir de novo). */
export async function hasPermission(kind: PermissionKind): Promise<boolean> {
  try {
    return (await get(kind)).granted;
  } catch {
    return false;
  }
}

export async function requestPermission(kind: PermissionKind): Promise<PermissionResult> {
  try {
    const before = await get(kind);
    if (before.granted) return 'granted';
    // Recusada de vez: o sistema não mostra mais o pop-up. Abre os Ajustes do app.
    if (!before.canAskAgain && Platform.OS !== 'web') {
      await Linking.openSettings().catch(() => {});
      return 'settings';
    }
    const after = await ask(kind);
    if (after.granted) return 'granted';
    return after.canAskAgain ? 'denied' : 'settings';
  } catch {
    return 'denied';
  }
}

/** Abre a página do GoClient nos Ajustes do aparelho (permissões). */
export const openAppSettings = () => Linking.openSettings().catch(() => {});
