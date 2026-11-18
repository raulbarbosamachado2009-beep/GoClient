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
