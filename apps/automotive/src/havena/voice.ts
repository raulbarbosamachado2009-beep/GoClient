import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Voz da Havena (síntese do próprio aparelho). Para a fala sair junto com o texto:
 * - prefere uma voz pt-BR **instalada no aparelho** (as "de rede" do Google demoram para
 *   começar, porque baixam o áudio na hora);
 * - "acorda" o motor de voz quando a Havena abre, antes da primeira resposta.
 */
let voiceId: string | undefined;
let picked = false;

async function pickVoice() {
  if (picked) return;
  picked = true;
  try {
    const all = await Speech.getAvailableVoicesAsync();
    const pt = all.filter((v) => /^pt[-_]br/i.test(v.language));
    const score = (v: Speech.Voice) =>
      (/network/i.test(v.identifier) ? 0 : 4) +
      (/local/i.test(v.identifier) ? 2 : 0) +
      (v.quality === Speech.VoiceQuality.Enhanced ? 1 : 0);
    const best = pt.sort((a, b) => score(b) - score(a))[0];
    voiceId = best?.identifier;
  } catch {
    // Sem lista de vozes: usa a padrão do aparelho.
  }
}

/** Prepara o motor de voz (chamar ao abrir a Havena). */
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
  Speech.speak(text, {
    language: 'pt-BR',
    voice: voiceId,
    // Um pouco mais rápida que o normal: respostas curtas, ditas dirigindo.
    rate: 1.08,
    onStart: handlers.onStart,
    onDone: handlers.onDone,
    onStopped: handlers.onStopped,
    onError: handlers.onDone,
  });
}

export const stopVoice = () => Speech.stop();
