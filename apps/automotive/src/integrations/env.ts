import { Platform } from 'react-native';

/**
 * Chaves das integrações, embutidas na compilação a partir de variáveis de ambiente
 * (ver app.config.js). Sem chave, cada integração fica em modo de demonstração.
 *
 * As variáveis precisam ser lidas exatamente como `process.env.EXPO_PUBLIC_…` para o
 * Expo conseguir substituí-las na compilação.
 */
/** Chave da NVIDIA (modelos de IA na nuvem para a Havena; plano gratuito). */
export const NVIDIA_API_KEY = process.env.EXPO_PUBLIC_NVIDIA_API_KEY ?? '';
/** Chave do OpenRouteService (rotas, endereços e ordem das paradas; plano gratuito). */
export const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY ?? '';

/** As integrações reais só existem no app Android (o Preview continua de demonstração). */
const android = Platform.OS === 'android';
/** Mapa real: OpenFreeMap (desenho, sem chave) + OpenRouteService (rotas, com chave). */
export const MAPS_ENABLED = android && ORS_API_KEY.length > 0;
