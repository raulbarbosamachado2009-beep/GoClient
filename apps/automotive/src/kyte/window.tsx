import { forwardRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DESKTOP_USER_AGENT, KYTE_WEB_URL } from './config';

export interface KyteWindowHandle {
  reload: () => void;
}

/**
 * Janela do Kyte Web dentro do GoClient (Android: WebView do sistema).
 * Cookies e armazenamento ficam salvos no aparelho, então o login continua valendo entre
 * usos. Nada da página é lido pelo GoClient.
 */
export const KyteWindow = forwardRef<KyteWindowHandle>(function KyteWindow(_props, ref) {
  return (
    <WebView
      ref={(w) => {
        if (typeof ref === 'function') ref(w ? { reload: () => w.reload() } : null);
        else if (ref) ref.current = w ? { reload: () => w.reload() } : null;
      }}
      source={{ uri: KYTE_WEB_URL }}
      userAgent={DESKTOP_USER_AGENT}
      domStorageEnabled
      javaScriptEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      setSupportMultipleWindows={false}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      )}
      style={styles.web}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
