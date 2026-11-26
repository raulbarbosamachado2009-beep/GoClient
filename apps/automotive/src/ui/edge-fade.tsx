import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useRef } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import { usePhone } from '../layout/form-factor';
import { useColors } from '../theme';

/** Altura do esmaecido (unidades da tela de referência). */
const EDGE = 44;
/** Quanto é preciso rolar para o esmaecido aparecer inteiro (acompanha o dedo). */
const RAMP = 36;

/**
 * Esmaecido nas bordas de uma lista rolável, como a borda de rolagem dos apps da Apple:
 * em cima, o conteúdo some suavemente debaixo do título; embaixo, avisa que há mais.
 *
 * - Acompanha a rolagem (aparece aos poucos nos primeiros pixels), em vez de surgir de uma
 *   vez — antes ele "pulava" assim que a lista mexia.
 * - Só degradê na cor do fundo, sem desfoque: o desfoque com máscara falha no Safari do
 *   iPhone e fazia a faixa parecer solta, sem pertencer ao cabeçalho nem ao rodapé.
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
  // Celular: embaixo fica a barra de abas flutuante; um esmaecido ali parecia uma faixa
  // solta acima dela. Só a borda de cima.
  const phone = usePhone();
  const y = useRef(new Animated.Value(0)).current;
  const rest = useRef(new Animated.Value(0)).current;
  const m = useRef({ y: 0, view: 0, content: 0 });

  const update = () => {
    const { y: off, view, content } = m.current;
    y.setValue(off);
    rest.setValue(Math.max(0, content - view - off));
  };

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
        <Edge side="top" color={bg} amount={y} />
        {!phone && <Edge side="bottom" color={bg} amount={rest} />}
      </>
    ),
  };
}

function Edge({
  side,
  color,
  amount,
}: {
  side: 'top' | 'bottom';
  color: string;
  amount: Animated.Value;
}) {
  const opacity = amount.interpolate({
    inputRange: [0, RAMP],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const top = side === 'top';
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.edge, top ? { top: 0 } : { bottom: 0 }, { opacity }]}
    >
      {/* Curva suave (vários pontos), sem a "linha" que um degradê de 2 cores deixa. */}
      <LinearGradient
        colors={[
          withAlpha(color, 1),
          withAlpha(color, 0.82),
          withAlpha(color, 0.45),
          withAlpha(color, 0.14),
          withAlpha(color, 0),
        ]}
        locations={[0, 0.22, 0.5, 0.78, 1]}
        start={{ x: 0, y: top ? 0 : 1 }}
        end={{ x: 0, y: top ? 1 : 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
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
