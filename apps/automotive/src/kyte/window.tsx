import { type ComponentRef, forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  type HomeData,
  KYTE_HOME,
  type KyteMessage,
  type KyteSectionKey,
  kyteScript,
} from './bridge';
import { DESKTOP_USER_AGENT } from './config';

export interface KyteWindowHandle {
  reload: () => void;
  /** Abre uma seção (Início, Vender, Produtos, Clientes, Histórico) dentro do Kyte. */
  select: (key: KyteSectionKey) => void;
  /** Entrega os números do Início para a página. */
  home: (data: HomeData) => void;
}

/**
 * Janela do Kyte Web dentro do GoClient (Android: WebView do sistema), com a ponte de
 * bridge.ts: o visual e o menu do app são postos dentro da própria página, e as mensagens
 * dela (tela atual, login, Início, botões de rota) chegam em `onMessage`. Cookies e
 * armazenamento ficam salvos no aparelho, então o login continua valendo entre usos. A senha
 * é digitada só na página do Kyte.
 */
export const KyteWindow = forwardRef<
  KyteWindowHandle,
  { dark: boolean; phone: boolean; minimal?: boolean; onMessage?: (m: KyteMessage) => void }
>(function KyteWindow({ dark, phone, minimal = false, onMessage }, ref) {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  const script = useMemo(() => kyteScript({ dark, phone, minimal }), [dark, phone, minimal]);

  useImperativeHandle(
    ref,
    () => ({
      reload: () => web.current?.reload(),
      select: (key) =>
        web.current?.injectJavaScript(
          `window.__goclientSelect && window.__goclientSelect(${JSON.stringify(key)}); true;`,
        ),
      home: (data) =>
        web.current?.injectJavaScript(
          `window.__gcHomeData && window.__gcHomeData(${JSON.stringify(data)}); true;`,
        ),
    }),
    [],
  );

  return (
    <WebView
      ref={web}
      source={{ uri: KYTE_HOME }}
      userAgent={DESKTOP_USER_AGENT}
      domStorageEnabled
      javaScriptEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      setSupportMultipleWindows={false}
      injectedJavaScript={script}
      // Repete o script quando o tema muda (sem recarregar a página).
      key={script.length}
      onMessage={(e) => {
        try {
          onMessage?.(JSON.parse(e.nativeEvent.data) as KyteMessage);
        } catch {
          // Mensagem que não é do GoClient: ignora.
        }
      }}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      )}
      style={[styles.web, { backgroundColor: dark ? '#141414' : '#FFFFFF' }]}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
