import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { usePhone, useSystemInsets, useTabBarSpace } from '../layout/form-factor';
import { useFrameScale } from '../preview/automotive-frame';
import { layout } from '../theme';
import { type MapState, mapHtml } from './map-html';
import type { LatLng } from './routing';

export interface MapPin {
  id: string;
  coordinate: LatLng;
  label?: string;
  /** Parada da rota (azul) ou cliente solto (cinza). */
  kind: 'stop' | 'client';
}

/**
 * Mapa real (Android): OpenFreeMap desenhado pelo MapLibre numa WebView (ver map-html.ts).
 * Mostra o carro, os clientes e a rota; na navegação (`follow`), a câmera acompanha o carro.
 *
 * A tela do app é desenhada num tamanho de referência e reduzida para caber no aparelho;
 * aqui a WebView desfaz essa redução, para os nomes das ruas saírem no tamanho normal.
 */
export function LiveMap({
  dark,
  user,
  heading,
  path,
  pins,
  follow = false,
}: {
  dark: boolean;
  user: LatLng | null;
  heading?: number | null;
  path: LatLng[];
  pins: MapPin[];
  follow?: boolean;
}) {
  const ref = useRef<ComponentRef<typeof WebView>>(null);
  const ready = useRef(false);
  const phone = usePhone();
  const system = useSystemInsets();
  const tabSpace = useTabBarSpace();
  const scale = useFrameScale();
  const html = useMemo(() => mapHtml(dark), [dark]);

  // Área livre do mapa (sem os cartões), em pixels da WebView.
  const pad = phone
    ? follow
      ? { top: 300 + system.top, right: 40, bottom: tabSpace + 420, left: 40 }
      : { top: 160 + system.top, right: 60, bottom: tabSpace + 700, left: 60 }
    : { top: 80, right: 560, bottom: 80, left: layout.sidebarWidth + 60 };
  const state: MapState = {
    dark,
    user: user ? { lat: user.latitude, lng: user.longitude } : null,
    heading: follow ? (heading ?? null) : null,
    path: path.map((p) => [p.longitude, p.latitude]),
    pins: pins.map((p, i) => ({
      id: p.id,
      lat: p.coordinate.latitude,
      lng: p.coordinate.longitude,
      label: p.label ?? String(i + 1),
      stop: p.kind === 'stop',
    })),
    follow,
    padding: {
      top: pad.top * scale,
      right: pad.right * scale,
      bottom: pad.bottom * scale,
      left: pad.left * scale,
    },
  };
  const json = JSON.stringify(state);
  const send = () => ref.current?.injectJavaScript(`window.__gc && window.__gc(${json});true;`);

  // biome-ignore lint/correctness/useExhaustiveDependencies: envia sempre que o estado muda
  useEffect(() => {
    if (ready.current) send();
  }, [json]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.unscale,
          { transform: [{ scale: 1 / scale }] },
          sized(scale),
        ]}
      >
        <WebView
          ref={ref}
          source={{ html, baseUrl: 'https://goclient.local/' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          overScrollMode="never"
          style={{ flex: 1, backgroundColor: dark ? '#1b1b1d' : '#e9e9ec' }}
          onMessage={(e) => {
            try {
              const m = JSON.parse(e.nativeEvent.data) as { type: string };
              if (m.type === 'ready') {
                ready.current = true;
                send();
              }
            } catch {}
          }}
        />
      </View>
    </View>
  );
}

/**
 * Tamanho real do aparelho para a WebView: a área do mapa (em unidades de referência)
 * multiplicada pela escala, depois ampliada de volta pelo `scale(1/scale)` em volta do centro.
 */
function sized(scale: number) {
  const inset = `${((1 - scale) / 2) * 100}%` as const;
  return {
    top: inset,
    bottom: inset,
    left: inset,
    right: inset,
  } as const;
}

const styles = StyleSheet.create({
  unscale: { position: 'absolute' },
});
