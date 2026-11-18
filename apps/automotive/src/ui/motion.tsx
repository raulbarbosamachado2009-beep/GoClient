import { type ReactNode, useEffect, useRef } from 'react';
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
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  axis?: 'x' | 'y';
  duration?: number;
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
        { opacity: v, transform: [axis === 'y' ? { translateY: offset } : { translateX: offset }] },
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
}: {
  routeKey: string;
  children: ReactNode;
}) {
  return (
    <Appear key={routeKey} distance={10} duration={360} style={{ flex: 1 }}>
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
