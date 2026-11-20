import { type ComponentRef, forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { KYTE_HOME, type KyteMessage, kyteScript } from './bridge';
import { DESKTOP_USER_AGENT } from './config';

export interface KyteWindowHandle {
  reload: () => void;
  /** Abre uma tela do Kyte Web (rota real do sistema). */
  go: (path: string) => void;
  /** Preenche a busca da tela aberta no Kyte. */
  search: (text: string) => void;
}

/**
 * Janela do Kyte Web dentro do GoClient (Android: WebView do sistema), com a ponte de
 * bridge.ts: o visual do app é aplicado na página e as mensagens dela (tela atual, login)
 * chegam em `onMessage`. Cookies e armazenamento ficam salvos no aparelho, então o login
 * continua valendo entre usos. A senha é digitada só na página do Kyte.
 */
export const KyteWindow = forwardRef<
  KyteWindowHandle,
  { dark: boolean; phone: boolean; onMessage?: (m: KyteMessage) => void }
>(function KyteWindow({ dark, phone, onMessage }, ref) {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  const script = useMemo(() => kyteScript({ dark, phone }), [dark, phone]);

  useImperativeHandle(
    ref,
    () => ({
      reload: () => web.current?.reload(),
      go: (path) =>
        web.current?.injectJavaScript(
          `window.__goclientGo && window.__goclientGo(${JSON.stringify(path)}); true;`,
        ),
      search: (text) =>
        web.current?.injectJavaScript(
          `window.__goclientSearch && window.__goclientSearch(${JSON.stringify(text)}); true;`,
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
