import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { nativeDriver } from '../theme';

/** Curva padrão da Apple para entradas (ease-out suave). */
export const appleEase = Easing.bezier(0.25, 0.1, 0.25, 1);

/**
 * Faz o conteúdo surgir com opacidade e um pequeno deslocamento. Use `delay` para
 * escalonar listas (ex.: delay={index * 40}).
 */
export function Appear({
  children,
  delay = 0,
  distance = 14,
  axis = 'y',
  duration = 420,
  fade = true,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  axis?: 'x' | 'y';
  duration?: number;
  /**
   * `false` anima só a posição. Use em elementos com desfoque: opacidade abaixo de 1
   * desliga o desfoque do navegador durante a animação.
   */
  fade?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: appleEase,
      useNativeDriver: nativeDriver,
    }).start();
  }, [v, delay, duration]);
  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fade ? v : 1,
          transform: [axis === 'y' ? { translateY: offset } : { translateX: offset }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Transição entre telas: troca suave com leve aproximação, a cada mudança de `routeKey`. */
export function ScreenTransition({
  routeKey,
  children,
  fade = true,
}: {
  routeKey: string;
  children: ReactNode;
  fade?: boolean;
}) {
  return (
    <Appear key={routeKey} distance={10} duration={360} fade={fade} style={{ flex: 1 }}>
      {children}
    </Appear>
  );
}

/** Valor animado por mola, útil para indicadores que deslizam. */
export function useSpring(target: number, config: { damping?: number; stiffness?: number } = {}) {
  const v = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    Animated.spring(v, {
      toValue: target,
      damping: config.damping ?? 22,
      stiffness: config.stiffness ?? 260,
      mass: 1,
      useNativeDriver: nativeDriver,
    }).start();
  }, [v, target, config.damping, config.stiffness]);
  return v;
}

/**
 * Valor numérico que caminha suavemente até `target` (curva da Apple), atualizando a cada
 * quadro. Usado onde o Animated não alcança — por exemplo, o raio do desfoque na Web.
 */
export function useTween(target: number, duration = 340, from = 0): number {
  const [value, setValue] = useState(from);
  const current = useRef(from);
  useEffect(() => {
    const start = current.current;
    const delta = target - start;
    if (delta === 0) return;
    const t0 = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - (1 - t) ** 3;
      current.current = start + delta * eased;
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

/**
 * Troca de conteúdo com a curva da Apple: o atual sai deslizando e some, o novo entra do
 * outro lado (`dir` 1 = avança, -1 = volta). Só opacidade e deslocamento (driver nativo).
 */
export function useSwap() {
  const v = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const run = (dir: 1 | -1, change: () => void) => {
    // No meio de uma troca: aplica a mudança na hora (nunca perde um toque).
    if (busy.current) return change();
    busy.current = true;
    Animated.timing(v, {
      toValue: -dir,
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: nativeDriver,
    }).start(() => {
      change();
      v.setValue(dir);
      Animated.timing(v, {
        toValue: 0,
        duration: 340,
        easing: appleEase,
        useNativeDriver: nativeDriver,
      }).start(() => {
        busy.current = false;
      });
    });
  };
  const style = {
    opacity: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
    transform: [
      { translateX: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [-48, 0, 48] }) },
      { scale: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.98, 1, 0.98] }) },
    ],
  };
  return { run, style };
}

/**
 * Troca de conteúdo (a mesma da aba "Rotas" do celular) a cada mudança de `id`: o atual sai
 * deslizando e some, o novo entra pelo outro lado. `dir` 1 = avança, -1 = volta. Se o
 * conteúdo muda sem trocar o `id`, atualiza na hora.
 */
export function Swap({
  id,
  dir: given = 1,
  index,
  children,
  style,
}: {
  id: string;
  dir?: 1 | -1;
  /** Posição do conteúdo (ex.: aba). Com ela, a direção sai sozinha: maior avança. */
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(id);
  const shownIndex = useRef(index);
  if (shown === id) shownIndex.current = index;
  const dir: 1 | -1 =
    index !== undefined && shownIndex.current !== undefined
      ? index >= shownIndex.current
        ? 1
        : -1
      : given;
  const frozen = useRef<ReactNode>(children);
  const latest = useRef(id);
  latest.current = id;
  if (shown === id) frozen.current = children;
  useEffect(() => {
    if (id === shown) return;
    Animated.timing(v, {
      toValue: -dir,
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: nativeDriver,
    }).start(() => {
      v.setValue(dir);
      setShown(latest.current);
      Animated.timing(v, {
        toValue: 0,
        duration: 340,
        easing: appleEase,
        useNativeDriver: nativeDriver,
      }).start();
    });
  }, [id, shown, dir, v]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateX: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [-48, 0, 48] }) },
            { scale: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.98, 1, 0.98] }) },
          ],
        },
      ]}
    >
      {shown === id ? children : frozen.current}
    </Animated.View>
  );
}

/**
 * Aparece e some com fade e um pequeno deslocamento: ao esconder, o conteúdo continua na tela
 * até a animação de saída terminar.
 */
export function Presence({
  show,
  children,
  distance = 14,
  axis = 'y',
  fade = true,
  style,
}: {
  show: boolean;
  children: ReactNode;
  distance?: number;
  axis?: 'x' | 'y';
  fade?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(show);
  const last = useRef<ReactNode>(children);
  if (show) last.current = children;
  useEffect(() => {
    if (show) {
      setMounted(true);
      Animated.timing(v, {
        toValue: 1,
        duration: 420,
        easing: appleEase,
        useNativeDriver: nativeDriver,
      }).start();
    } else {
      Animated.timing(v, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: nativeDriver,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [show, v]);
  if (!mounted && !show) return null;
  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return (
    <Animated.View
      pointerEvents={show ? 'box-none' : 'none'}
      style={[
        style,
        {
          opacity: fade ? v : 1,
          transform: [axis === 'y' ? { translateY: offset } : { translateX: offset }],
        },
      ]}
    >
      {show ? children : last.current}
    </Animated.View>
  );
}

/**
 * Transição entre páginas (boas-vindas → permissões → login → mapa). Rápida e discreta
 * (pedido de 26/11/2026: a anterior, com desfoque e zoom, era lenta): a página atual some
 * deslizando um pouco para a esquerda (~0,2 s) e a nova entra da direita (~0,34 s), como
 * um avanço. Só opacidade e deslocamento (driver nativo). `leave(go)` toca a saída e navega.
 */
export function usePageTransition() {
  const v = useRef(new Animated.Value(0)).current;
  const [settled, setSettled] = useState(false);
  const leaving = useRef(false);
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 340,
      easing: appleEase,
      useNativeDriver: nativeDriver,
    }).start(({ finished }) => finished && setSettled(true));
    return () => v.stopAnimation();
  }, [v]);
  const leave = (go: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    setSettled(false);
    Animated.timing(v, {
      toValue: 2,
      duration: 190,
      easing: Easing.in(Easing.quad),
      useNativeDriver: nativeDriver,
    }).start(() => go());
  };
  const style = settled
    ? null
    : {
        opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1, 2], outputRange: [36, 0, -36] }) },
        ],
      };
  return { leave, style: style as StyleProp<ViewStyle> };
}
