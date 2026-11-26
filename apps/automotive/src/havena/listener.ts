import { commitSegment, joinTranscript } from '@goclient/core';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef } from 'react';
import { type MicUser, mic } from './mic';

/**
 * Escuta contínua com o reconhecimento de voz do aparelho, usada pela conversa com o Lucas
 * e pela palavra de ativação.
 *
 * - Modo contínuo: o microfone não fecha sozinho depois de uma frase (no Android 13+ ele
 *   também não apita a cada vez). Se o aparelho fechar mesmo assim (silêncio longo, erro de
 *   rede), reabre logo em seguida, enquanto a escuta estiver ligada.
 * - Frase completa: no modo contínuo cada trecho chega como "final" separado ("bom", depois
 *   "dia"). Os trechos são juntados e a frase só é entregue depois de um instante de silêncio,
 *   então "bom dia" chega inteiro, e não só "bom".
 */
const SILENCE_MS = 1100;
const RESTART_MS = 250;
const MAX_FAILS = 6;

export type MicProblem = 'permission' | 'unavailable';

export function useContinuousListener(
  user: MicUser,
  handlers: {
    /** Frase em andamento (para a legenda acompanhar a fala). */
    onPartial?: (text: string) => void;
    /** Frase completa, com as outras formas que o reconhecimento entendeu. */
    onUtterance: (text: string, alternatives: string[]) => void;
    onProblem?: (p: MicProblem) => void;
  },
) {
  const h = useRef(handlers);
  h.current = handlers;
  const wanted = useRef(false);
  const running = useRef(false);
  const committed = useRef<string[]>([]);
  const partial = useRef('');
  const alts = useRef<string[]>([]);
  const silence = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restart = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fails = useRef(0);
  const retry = useRef<() => void>(() => {});

  const clearTimers = useCallback(() => {
    if (silence.current) clearTimeout(silence.current);
    if (restart.current) clearTimeout(restart.current);
    silence.current = null;
    restart.current = null;
  }, []);

  const reset = useCallback(() => {
    committed.current = [];
    partial.current = '';
    alts.current = [];
  }, []);

  const flush = useCallback(() => {
    if (silence.current) clearTimeout(silence.current);
    silence.current = null;
    const text = joinTranscript(committed.current, partial.current);
    const others = alts.current;
    reset();
    if (text) h.current.onUtterance(text, others);
  }, [reset]);

  const begin = useCallback(async () => {
    if (!wanted.current || running.current || !mic.owns(user)) return;
    // Marca já como ligado: duas chamadas seguidas não abrem o microfone duas vezes.
    running.current = true;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
    if (!perm?.granted) {
      running.current = false;
      wanted.current = false;
      h.current.onProblem?.('permission');
      return;
    }
    if (!wanted.current || !mic.owns(user)) {
      running.current = false;
      return;
    }
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        // Outras formas de entender a mesma fala (nomes e ruas costumam sair errados).
        maxAlternatives: 3,
        // Ativação e nome do assistente: ajudam o reconhecimento a escrever certo (iOS).
        contextualStrings: [
          'Lucas',
          'olá Lucas',
          'oi Lucas',
          'boa tarde Lucas',
          'boa noite Lucas',
          'bom dia Lucas',
          'oh IA',
          'inteligência artificial',
          'Kyte',
        ],
      });
    } catch {
      running.current = false;
      retry.current();
    }
  }, [user]);

  const scheduleRestart = useCallback(
    (delay?: number) => {
      if (!wanted.current || restart.current) return;
      // Depois de vários erros seguidos (sem internet, serviço ocupado), espera mais.
      const wait = delay ?? RESTART_MS * (fails.current > 2 ? 8 : 1);
      restart.current = setTimeout(() => {
        restart.current = null;
        void begin();
      }, wait);
    },
    [begin],
  );

  retry.current = () => scheduleRestart();

  // Outro tomou o microfone: esta escuta para (sem mexer no reconhecimento, que agora é dele).
  useEffect(
    () =>
      mic.subscribe(() => {
        if (mic.owns(user)) return;
        wanted.current = false;
        running.current = false;
        clearTimers();
        reset();
      }),
    [user, reset, clearTimers],
  );

  /** Liga a escuta (toma o microfone para `user`). */
  const start = useCallback(() => {
    const got = mic.claim(user);
    if (got === 'denied') return;
    wanted.current = true;
    fails.current = 0;
    if (running.current) return;
    // Trocou de dono: espera o reconhecimento anterior fechar antes de abrir de novo.
    if (got === 'switched') scheduleRestart(400);
    else void begin();
  }, [user, begin, scheduleRestart]);

  /** Desliga a escuta (ex.: enquanto o Lucas fala, para não ouvir a própria voz). */
  const pause = useCallback(() => {
    wanted.current = false;
    clearTimers();
    reset();
    if (running.current && mic.owns(user)) ExpoSpeechRecognitionModule.abort?.();
    running.current = false;
  }, [user, reset, clearTimers]);

  /** Desliga e devolve o microfone. */
  const release = useCallback(() => {
    pause();
    mic.release(user);
  }, [pause, user]);

  useSpeechRecognitionEvent('result', (e) => {
    if (!mic.owns(user) || !wanted.current) return;
    fails.current = 0;
    const t = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      committed.current = commitSegment(committed.current, t);
      partial.current = '';
      alts.current = e.results
        .slice(1)
        .map((r) => r.transcript.trim())
        .filter((a) => a && a !== t.trim());
    } else {
      partial.current = t;
    }
    const text = joinTranscript(committed.current, partial.current);
    if (!text) return;
    h.current.onPartial?.(text);
    if (silence.current) clearTimeout(silence.current);
    silence.current = setTimeout(flush, e.isFinal ? SILENCE_MS - 300 : SILENCE_MS);
  });

  useSpeechRecognitionEvent('end', () => {
    if (!mic.owns(user)) return;
    running.current = false;
    // O aparelho fechou o microfone: entrega o que já ouviu e reabre.
    if (joinTranscript(committed.current, partial.current)) flush();
    if (wanted.current) scheduleRestart();
  });

  useSpeechRecognitionEvent('error', (e) => {
    if (!mic.owns(user)) return;
    if (e.error === 'not-allowed') {
      wanted.current = false;
      h.current.onProblem?.('permission');
      return;
    }
    // Silêncio e cancelamento não são falhas: o 'end' reabre o microfone.
    if (e.error === 'no-speech' || e.error === 'speech-timeout' || e.error === 'aborted') return;
    fails.current += 1;
    if (fails.current >= MAX_FAILS) {
      wanted.current = false;
      h.current.onProblem?.('unavailable');
    }
  });

  useEffect(
    () => () => {
      clearTimers();
      if (mic.owns(user)) {
        wanted.current = false;
        ExpoSpeechRecognitionModule.abort?.();
        mic.release(user);
      }
    },
    [user, clearTimers],
  );

  return { start, pause, release, isOn: () => wanted.current };
}
