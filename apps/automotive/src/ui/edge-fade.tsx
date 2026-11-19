import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '../theme';
import { useTween } from './motion';

const EDGE = 72;

/**
 * Esmaecido nas bordas de uma lista rolável (referência: barra do Havena Vision Studio).
 * Quando há conteúdo escondido acima ou abaixo, a borda correspondente desfoca e some na
 * cor do fundo. A borda de cima só aparece depois que o usuário começa a rolar.
 *
 * Uso: espalhe `scrollProps` na ScrollView/FlatList e renderize `edges` como irmão dela,
 * dentro de um container com `position: relative` (o padrão no React Native).
 */
export function useEdgeFade(color?: string): {
  scrollProps: {
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onLayout: (e: LayoutChangeEvent) => void;
    onContentSizeChange: (w: number, h: number) => void;
    scrollEventThrottle: number;
  };
  edges: ReactNode;
} {
  const c = useColors();
  const [top, setTop] = useState(false);
  const [bottom, setBottom] = useState(false);
  const m = useRef({ y: 0, view: 0, content: 0 });

  const update = useCallback(() => {
    const { y, view, content } = m.current;
    setTop(y > 2);
    setBottom(content - view - y > 2);
  }, []);

  const scrollProps = {
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      m.current.y = e.nativeEvent.contentOffset.y;
      update();
    },
    onLayout: (e: LayoutChangeEvent) => {
      m.current.view = e.nativeEvent.layout.height;
      update();
    },
    onContentSizeChange: (_w: number, h: number) => {
      m.current.content = h;
      update();
    },
    scrollEventThrottle: 16,
  };

  const bg = color ?? c.background;
  return {
    scrollProps,
    edges: (
      <>
        <Edge side="top" color={bg} visible={top} />
        <Edge side="bottom" color={bg} visible={bottom} />
      </>
    ),
  };
}

function Edge({
  side,
  color,
  visible,
}: {
  side: 'top' | 'bottom';
  color: string;
  visible: boolean;
}) {
  // Sem animar opacidade: ela desligaria o desfoque. O raio e o tom crescem juntos.
  const p = useTween(visible ? 1 : 0, 260);
  if (p < 0.01) return null;
  const towards = side === 'top' ? 'to bottom' : 'to top';
  const mask = `linear-gradient(${towards}, #000 0%, #000 25%, transparent 100%)`;
  return (
    <View pointerEvents="none" style={[styles.edge, side === 'top' ? { top: 0 } : { bottom: 0 }]}>
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backdropFilter: `blur(${(10 * p).toFixed(1)}px)`,
              WebkitBackdropFilter: `blur(${(10 * p).toFixed(1)}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            } as object,
          ]}
        />
      )}
      <LinearGradient
        colors={[withAlpha(color, 0.95 * p), withAlpha(color, 0)]}
        start={{ x: 0, y: side === 'top' ? 0 : 1 }}
        end={{ x: 0, y: side === 'top' ? 1 : 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** Aplica transparência a uma cor #RRGGBB (as cores de fundo do tema são sólidas). */
function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha.toFixed(3)})`;
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0, height: EDGE },
});
