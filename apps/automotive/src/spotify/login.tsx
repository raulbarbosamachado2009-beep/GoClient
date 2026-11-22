import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { usePhone } from '../layout/form-factor';
import { spacing } from '../theme';
import { Button, IconButton, Text } from '../ui/primitives';
import { Unscaled } from '../ui/unscaled';
import {
  createAuthRequest,
  exchangeCode,
  type PkceRequest,
  parseRedirect,
  REDIRECT_URI,
} from './auth';
import { useSpotify } from './provider';

/**
 * Janela de login do Spotify, por cima de todo o app (montada no layout raiz).
 * A senha é digitada na página do próprio Spotify: o GoClient só recebe o código de
 * autorização no endereço de retorno e o troca pelos tokens.
 *
 * Limitação: o Google bloqueia login dentro de janelas de app (WebView), então
 * "Continuar com o Google" não funciona aqui; use e-mail e senha ou o código por e-mail.
 */
export function SpotifyLoginHost() {
  const { loginOpen } = useSpotify();
  if (!loginOpen) return null;
  return <SpotifyLogin />;
}

function SpotifyLogin() {
  const { closeLogin, addAccount } = useSpotify();
  const [request, setRequest] = useState<PkceRequest | null>(null);
  const [status, setStatus] = useState<'page' | 'exchanging' | 'error'>('page');
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);
  const phone = usePhone();

  const start = () => {
    handled.current = false;
    setStatus('page');
    setError(null);
    setRequest(null);
    createAuthRequest()
      .then(setRequest)
      .catch(() => {
        setStatus('error');
        setError('Não foi possível preparar o login.');
      });
  };
  useEffect(start, []);

  const finish = async (url: string) => {
    if (handled.current || !request) return;
    handled.current = true;
    const { code, error: denied, state } = parseRedirect(url);
    if (denied || !code || state !== request.state) {
      setStatus('error');
      setError(
        denied === 'access_denied' ? 'O acesso não foi autorizado.' : 'O login não foi concluído.',
      );
      return;
    }
    setStatus('exchanging');
    try {
      const tokens = await exchangeCode(code, request.verifier);
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      const me = (await res.json()) as {
        id?: string;
        display_name?: string;
        product?: string;
        images?: { url: string }[];
        error?: { message?: string };
      };
      if (!res.ok || !me.id) {
        // Em modo de desenvolvimento, contas fora da lista de usuários do app dão 403.
        throw new Error(
          res.status === 403
            ? 'Esta conta não está liberada no app do Spotify for Developers (User Management).'
            : (me.error?.message ?? 'O Spotify não devolveu o perfil.'),
        );
      }
      await addAccount({
        id: me.id,
        name: me.display_name ?? me.id,
        image: me.images?.[0]?.url,
        product: me.product,
        ...tokens,
      });
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'O login não foi concluído.');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <IconButton
          icon="close"
          iconSize={44}
          accessibilityLabel="Fechar login"
          onPress={closeLogin}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title2" color="#FFFFFF" numberOfLines={1}>
            Entrar no Spotify
          </Text>
          <Text
            variant={phone ? 'footnote' : 'callout'}
            color="rgba(255,255,255,0.6)"
            numberOfLines={2}
          >
            Use e-mail e senha (o login pelo Google não abre dentro de apps)
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {request && status === 'page' && (
          // Página no tamanho real do aparelho e na versão de celular do Spotify, que se
          // ajusta sozinha em pé e deitado.
          <Unscaled>
            <WebView
              source={{ uri: request.url }}
              domStorageEnabled
              javaScriptEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={(e) => {
                if (e.url.startsWith(REDIRECT_URI)) {
                  finish(e.url);
                  return false;
                }
                return true;
              }}
              // Garantia extra: alguns Android só avisam do retorno ao iniciar a carga.
              onLoadStart={(e) => {
                if (e.nativeEvent.url.startsWith(REDIRECT_URI)) finish(e.nativeEvent.url);
              }}
              startInLoadingState
              renderLoading={() => (
                <Center>
                  <ActivityIndicator size="large" color="#1ED760" />
                </Center>
              )}
              style={{ flex: 1, backgroundColor: '#121212' }}
            />
          </Unscaled>
        )}
        {(status === 'exchanging' || (!request && status === 'page')) && (
          <Center>
            <ActivityIndicator size="large" color="#1ED760" />
            <Text variant="headline" color="#FFFFFF">
              Conectando sua conta…
            </Text>
          </Center>
        )}
        {status === 'error' && (
          <Center>
            <Text variant="title2" color="#FFFFFF" style={{ textAlign: 'center', maxWidth: 900 }}>
              {error}
            </Text>
            <Button label="Tentar de novo" icon="refresh" onPress={start} />
          </Center>
        )}
      </View>
    </View>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 100,
  },
  bar: {
    height: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    paddingHorizontal: spacing[6],
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[6] },
});
