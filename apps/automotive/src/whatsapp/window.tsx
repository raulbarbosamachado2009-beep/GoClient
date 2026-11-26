import { WHATSAPP_WEB_URL } from '@goclient/core';
import { type ComponentRef, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DESKTOP_USER_AGENT } from '../kyte/config';
import { Spinner } from '../ui/spinner';
import { WHATSAPP_SCRIPT, type WhatsAppMessage } from './bridge';

/**
 * WhatsApp Web dentro do GoClient (Android: WebView do sistema), como o Kyte. A pessoa usa o
 * WhatsApp normalmente; o primeiro acesso é pelo QR code (ou código do número), lido no
 * celular dono do número em Aparelhos conectados. Cookies e dados ficam salvos no aparelho,
 * então o vínculo continua valendo. O WhatsApp só mostra a versão web a navegadores de
 * computador, por isso a janela se apresenta como Chrome de desktop.
 *
 * `url` troca a página (ex.: a conversa com a mensagem pronta, `/send?phone=…&text=…`).
 */
export function WhatsAppWindow({
  url,
  watchSend,
  onMessage,
}: {
  url: string | null;
  /** Conversa aberta pelo Lucas: avisa quando a mensagem sair. */
  watchSend: boolean;
  onMessage: (m: WhatsAppMessage) => void;
}) {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  useEffect(() => {
    if (watchSend)
      web.current?.injectJavaScript('window.__gcWatchSend && window.__gcWatchSend(); true;');
  }, [watchSend]);
  return (
    <WebView
      ref={web}
      source={{ uri: url ?? WHATSAPP_WEB_URL }}
      userAgent={DESKTOP_USER_AGENT}
      domStorageEnabled
      javaScriptEnabled
      // Sessão salva no aparelho (cookies, localStorage e IndexedDB, onde o WhatsApp Web guarda
      // o vínculo): o QR code só aparece na primeira vez ou se o vínculo cair.
      incognito={false}
      cacheEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      setSupportMultipleWindows={false}
      // Microfone e câmera para áudios e fotos, quando a pessoa usar.
      mediaPlaybackRequiresUserAction={false}
      injectedJavaScript={WHATSAPP_SCRIPT}
      onLoadEnd={() => {
        if (watchSend)
          web.current?.injectJavaScript('window.__gcWatchSend && window.__gcWatchSend(); true;');
      }}
      onMessage={(e) => {
        try {
          onMessage(JSON.parse(e.nativeEvent.data) as WhatsAppMessage);
        } catch {
          // Mensagem que não é do GoClient: ignora.
        }
      }}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <Spinner />
        </View>
      )}
      style={styles.web}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
