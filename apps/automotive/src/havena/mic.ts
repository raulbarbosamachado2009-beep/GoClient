import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * O microfone (reconhecimento de voz do aparelho) é um só. Dois usuários disputam ele:
 * a conversa com o Lucas (`session`) e a escuta da palavra de ativação (`wake`). Quem
 * "tem" o microfone recebe os eventos; o outro ignora. A conversa tem prioridade: ao abrir,
 * ela toma o microfone; ao fechar, devolve, e a escuta da ativação volta.
 */
export type MicUser = 'session' | 'wake';

let owner: MicUser | null = null;
const listeners = new Set<() => void>();

export const mic = {
  owner: () => owner,
  owns: (u: MicUser) => owner === u,
  /** Toma o microfone. Devolve se trocou de dono (aí o reconhecimento anterior foi fechado). */
  claim(u: MicUser): 'same' | 'switched' | 'denied' {
    if (owner === 'session' && u === 'wake') return 'denied';
    if (owner === u) return 'same';
    const had = owner;
    owner = u;
    if (had) ExpoSpeechRecognitionModule.abort?.();
    for (const l of listeners) l();
    return had ? 'switched' : 'same';
  },
  release(u: MicUser) {
    if (owner !== u) return;
    owner = null;
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
