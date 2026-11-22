/**
 * Configuração do Expo a partir do app.json, com as chaves das integrações vindas de
 * variáveis de ambiente (no GitHub: Settings → Secrets and variables → Actions).
 *
 * - EXPO_PUBLIC_ORS_API_KEY: chave gratuita do OpenRouteService (rotas e endereços). Sem ela
 *   o app usa o mapa de demonstração. O desenho do mapa (OpenFreeMap) não usa chave.
 * - EXPO_PUBLIC_SPOTIFY_CLIENT_ID: Client ID do app no Spotify for Developers. Sem ele a
 *   Música continua em modo de demonstração.
 *
 * Nenhuma chave fica gravada no repositório.
 */
module.exports = ({ config }) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      [
        'expo-audio',
        { microphonePermission: 'O GoClient usa o microfone para você conversar com a Havena.' },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'O GoClient usa a sua localização para traçar o caminho até os clientes.',
        },
      ],
    ],
  };
};
