import { createElement, forwardRef, useImperativeHandle, useState } from 'react';
import { KYTE_WEB_URL } from './config';

export interface KyteWindowHandle {
  reload: () => void;
}

/**
 * Janela do Kyte Web na versão Web do GoClient (Preview): um iframe. O Kyte não envia
 * cabeçalhos que proíbam isso (verificado em 19/11/2026); se passar a enviar, a janela
 * fica em branco e o caminho é abrir em outra aba.
 */
export const KyteWindow = forwardRef<KyteWindowHandle>(function KyteWindow(_props, ref) {
  const [key, setKey] = useState(0);
  useImperativeHandle(ref, () => ({ reload: () => setKey((k) => k + 1) }), []);
  return createElement('iframe', {
    key,
    src: KYTE_WEB_URL,
    title: 'Kyte',
    allow: 'clipboard-read; clipboard-write',
    style: { flex: 1, width: '100%', height: '100%', border: 0, background: '#FFFFFF' },
  });
});
