import { Platform } from 'react-native';

/**
 * Chaves das integrações, embutidas na compilação a partir de variáveis de ambiente
 * (ver app.config.js). Sem chave, cada integração fica em modo de demonstração.
 *
 * As variáveis precisam ser lidas exatamente como `process.env.EXPO_PUBLIC_…` para o
 * Expo conseguir substituí-las na compilação.
 */
export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/** As integrações reais só existem no app Android (o Preview continua de demonstração). */
const android = Platform.OS === 'android';
export const SPOTIFY_ENABLED = android && SPOTIFY_CLIENT_ID.length > 0;
export const GOOGLE_MAPS_ENABLED = android && GOOGLE_MAPS_KEY.length > 0;

/**
 * Identidade do APK, enviada ao Google para que a chave possa ficar restrita a este app.
 * O certificado é o da chave de depuração do modelo do Expo, usada pelo CI.
 */
export const ANDROID_PACKAGE = 'com.goclient.automotive';
export const ANDROID_CERT_SHA1 = '5E8F16062EA3CD2C4A0D547876BAA6F38CABF625';
