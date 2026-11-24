import { pickAssistantVoice } from '@goclient/core';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Voz do Lucas (síntese do próprio aparelho; a voz gerada por IA vem depois). Para a fala
 * sair junto com o texto e com voz de homem:
 * - prefere uma voz pt-BR **masculina e instalada no aparelho** (as "de rede" do Google
 *   demoram para começar, porque baixam o áudio na hora). A escolha está em
 *   `pickAssistantVoice` (@goclient/core), com testes;
 * - se o aparelho só tiver voz feminina, engrossa um pouco a voz padrão (tom mais grave);
 * - "acorda" o motor de voz quando o app abre, antes da primeira resposta.
 */
let voiceId: string | undefined;
let pitch = 1;
let picked: Promise<void> | null = null;

function pickVoice() {
  if (!picked)
    picked = (async () => {
      try {
        const all = await Speech.getAvailableVoicesAsync();
        const r = pickAssistantVoice(all);
        voiceId = r.voice?.identifier;
        pitch = r.male ? 1 : 0.82;
      } catch {
        // Sem lista de vozes: usa a padrão do aparelho, mais grave.
        pitch = 0.82;
      }
    })();
  return picked;
}

/** Prepara o motor de voz (chamar ao abrir o app e o Lucas). */
export function warmVoice() {
  if (Platform.OS === 'web') return;
  // Pedir a lista de vozes já liga o motor de voz do Android (sem tocar nada, para não
  // atrapalhar o microfone, que abre ao mesmo tempo).
  pickVoice().catch(() => {});
}

export function say(
  text: string,
  handlers: { onStart: () => void; onDone: () => void; onStopped: () => void },
) {
  Speech.stop();
  const go = () =>
    Speech.speak(text, {
      language: 'pt-BR',
      voice: voiceId,
      pitch,
      // Um pouco mais rápida que o normal: respostas curtas, ditas dirigindo.
      rate: 1.05,
      onStart: handlers.onStart,
      onDone: handlers.onDone,
      onStopped: handlers.onStopped,
      onError: handlers.onDone,
    });
  // A primeira fala espera a voz masculina ser escolhida (é rápido; só acontece uma vez).
  if (Platform.OS === 'web') go();
  else
    pickVoice()
      .catch(() => {})
      .then(go);
}

export const stopVoice = () => Speech.stop();
