import { createElement, forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '../theme';
import { Icon, Text } from '../ui/primitives';
import { KYTE_ORIGIN, type KyteMessage } from './bridge';
import { KYTE_WEB_URL } from './config';

export interface KyteWindowHandle {
  reload: () => void;
  go: (path: string) => void;
  search: (text: string) => void;
}

/** Verdadeiro no Preview publicado (marcado pelo empacotador em scripts/single-file-preview.mjs). */
const IN_PREVIEW = Boolean((globalThis as { __GOCLIENT_PREVIEW__?: boolean }).__GOCLIENT_PREVIEW__);

/**
 * Janela do Kyte Web na versão Web do GoClient: um iframe. O Kyte não envia cabeçalhos que
 * proíbam isso (verificado em 19/11/2026). A página do Preview publicado, porém, bloqueia
 * iframes de outros sites; ali mostramos um aviso com link para abrir o Kyte fora.
 * Na multimídia (Android) a janela é a WebView de window.tsx, sem esse bloqueio.
 */
export const KyteWindow = forwardRef<
  KyteWindowHandle,
  { dark: boolean; phone: boolean; onMessage?: (m: KyteMessage) => void }
>(function KyteWindow({ onMessage }, ref) {
  const [key, setKey] = useState(0);
  const [path, setPath] = useState('/');
  useImperativeHandle(
    ref,
    () => ({
      reload: () => setKey((k) => k + 1),
      // Num iframe de outro site o app não lê nem altera a página: só troca o endereço.
      go: (p) => {
        setPath(p);
        setKey((k) => k + 1);
      },
      search: () => {},
    }),
    [],
  );
  // Sem acesso à página, a versão web considera a sessão aberta para mostrar os botões.
  // biome-ignore lint/correctness/useExhaustiveDependencies: avisa uma vez ao abrir
  useEffect(() => {
    onMessage?.({ type: 'route', host: 'web.kyteapp.com', path: '/', logged: true });
  }, []);
  if (IN_PREVIEW) return <PreviewNotice />;
  return createElement('iframe', {
    key,
    src: `${KYTE_ORIGIN}${path}`,
    title: 'Kyte',
    allow: 'clipboard-read; clipboard-write',
    style: { flex: 1, width: '100%', height: '100%', border: 0, background: '#FFFFFF' },
  });
});

function PreviewNotice() {
  const c = useColors();
  return (
    <View style={styles.notice}>
      <Icon name="browsers-outline" size={72} color={c.textTertiary} />
      <Text variant="title2" style={{ textAlign: 'center' }}>
        O Kyte abre aqui no app da multimídia
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 760 }}>
        Esta página de visualização não permite abrir outros sites dentro dela. No GoClient
        instalado na multimídia, o Kyte aparece nesta área normalmente.
      </Text>
      {createElement(
        'a',
        {
          href: KYTE_WEB_URL,
          target: '_blank',
          rel: 'noreferrer',
          style: {
            marginTop: 16,
            padding: '20px 40px',
            borderRadius: 18,
            background: c.accent,
            color: '#FFFFFF',
            fontFamily: 'SFProDisplay-Semibold',
            fontSize: 26,
            textDecoration: 'none',
          },
        },
        'Abrir o Kyte em outra aba',
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 48 },
});
