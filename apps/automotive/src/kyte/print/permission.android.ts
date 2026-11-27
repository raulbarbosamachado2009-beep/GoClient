import { PermissionsAndroid, Platform } from 'react-native';

/** Android 12+: pede a permissão de "Dispositivos por perto" (Bluetooth) para a impressora. */
export async function allowBluetooth(): Promise<void> {
  if (Number(Platform.Version) < 31) return;
  const r = await PermissionsAndroid.request(
    'android.permission.BLUETOOTH_CONNECT' as Parameters<typeof PermissionsAndroid.request>[0],
  );
  if (r !== PermissionsAndroid.RESULTS.GRANTED)
    throw new Error(
      'Sem a permissão de Bluetooth ("Dispositivos por perto") o app não fala com a impressora.',
    );
}
