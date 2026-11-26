/**
 * Configuração do Expo a partir do app.json, com as chaves das integrações vindas de
 * variáveis de ambiente (no GitHub: Settings → Secrets and variables → Actions).
 *
 * - EXPO_PUBLIC_ORS_API_KEY: chave gratuita do OpenRouteService (rotas e endereços). Sem ela
 *   o app usa o mapa de demonstração. O desenho do mapa (OpenFreeMap) não usa chave.
 * - EXPO_PUBLIC_NVIDIA_API_KEY: chave da NVIDIA (IA da Havena). Sem ela, a Havena só entende
 *   comandos fixos.
 *
 * Nenhuma chave fica gravada no repositório.
 */
module.exports = ({ config }) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      // Barra de botões do Android (fica na lateral com o aparelho deitado): sem a faixa
      // clara que o sistema põe por padrão; o fundo escuro do app aparece por trás dela.
      ['expo-navigation-bar', { style: 'dark', enforceContrast: false }],
      [
        'expo-audio',
        { microphonePermission: 'O GoClient usa o microfone para você conversar com o Lucas.' },
      ],
      // Havena: reconhecimento de voz do aparelho (serviço do Google no Android).
      [
        'expo-speech-recognition',
        {
          microphonePermission: 'O GoClient usa o microfone para você conversar com o Lucas.',
          speechRecognitionPermission: 'O GoClient reconhece a sua voz para o Lucas.',
          androidSpeechServicePackages: [
            'com.google.android.googlequicksearchbox',
            'com.google.android.as',
            'com.google.android.tts',
          ],
        },
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
