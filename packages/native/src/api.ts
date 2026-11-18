import { createApiClient } from '@goclient/api/client';
import type { Platform as GoClientPlatform } from '@goclient/core';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Descobre a URL da API.
 *
 * 1. `EXPO_PUBLIC_API_URL`, se definida (staging/produção ou rede específica).
 * 2. Em desenvolvimento, o mesmo host que serve o bundle do Expo: assim um celular ou
 *    central multimídia na mesma rede Wi-Fi alcança a API do computador sem configuração.
 * 3. No emulador Android, `10.0.2.2` aponta para o computador hospedeiro.
 */
export function resolveApiUrl(port = 4000): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${port}`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${port}`;
  return `http://localhost:${port}`;
}

export function createNativeApiClient(platform: GoClientPlatform) {
  const baseUrl = resolveApiUrl();
  return { baseUrl, client: createApiClient({ baseUrl, platform }) };
}
