import { matchWakePhrase } from '@goclient/core';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { usePrototype } from '../prototype/state';
import { useContinuousListener } from './listener';
import { mic } from './mic';
import { HavenaPanel } from './panel';
import { useWakeEnabled } from './settings';

/**
 * Ativação por voz: com o app aberto e o Lucas fechado, o microfone fica ouvindo só para
 * reconhecer uma das chamadas (qualquer cumprimento + "Lucas": "olá Lucas", "boa tarde Lucas", "salve Lucas"; "bom dia", "oh IA", "olá
 * inteligência artificial"; regras em `matchWakePhrase`, @goclient/core). Ao ouvir, abre o
 * Lucas, que já responde ao que veio junto ("olá Lucas, que horas são").
 *
 * Nada do que é ouvido aqui sai do aparelho além do próprio reconhecimento de voz do
 * sistema; frases sem a chamada são descartadas. Liga e desliga em Ajustes.
 */
export function WakeListener() {
  const [enabled] = useWakeEnabled();
  const { setOverlay } = usePrototype();
  const opening = useRef(false);
  const listener = useContinuousListener('wake', {
    onUtterance: (text) => {
      const m = matchWakePhrase(text);
      if (!m || opening.current) return;
      opening.current = true;
      setOverlay(
        <HavenaPanel
          wakeStart={m}
          onClose={() => {
            opening.current = false;
            setOverlay(null);
          }}
        />,
      );
    },
  });
  const ref = useRef(listener);
  ref.current = listener;

  useEffect(() => {
    if (Platform.OS === 'web' || !enabled) {
      ref.current.release();
      return;
    }
    const sync = () => {
      const active = AppState.currentState === 'active';
      // O Lucas aberto (por toque ou voz) tem o microfone; quando ele fecha, volta a ouvir.
      if (active && mic.owner() === null) {
        opening.current = false;
        ref.current.start();
      } else if (!active) ref.current.release();
    };
    sync();
    const unMic = mic.subscribe(() => {
      // Espera o reconhecimento do Lucas fechar antes de reabrir.
      if (mic.owner() === null) setTimeout(sync, 400);
    });
    const app = AppState.addEventListener('change', sync);
    return () => {
      unMic();
      app.remove();
      ref.current.release();
    };
  }, [enabled]);

  return null;
}
