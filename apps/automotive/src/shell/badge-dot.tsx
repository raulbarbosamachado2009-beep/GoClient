import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { nativeDriver, useColors } from '../theme';
import { type BadgeApp, useBadge } from './badges';

/**
 * Bolinha vermelha no canto do ícone do app (como no iOS), só quando há novidade. Entra
 * crescendo com uma mola curta e sai encolhendo. O anel da cor do menu separa a bolinha
 * do ícone.
 */
export function BadgeDot({
  app,
  size,
  ring,
  hidden = false,
}: {
  app: BadgeApp | null | undefined;
  size: number;
  /** Cor do fundo do menu atrás do ícone. */
  ring: string;
  /** Esconde sem perder a contagem (ex.: o app está aberto). */
  hidden?: boolean;
}) {
  const c = useColors();
  const on = useBadge(app) > 0 && !hidden;
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  const [mounted, setMounted] = useState(on);
  useEffect(() => {
    if (on) setMounted(true);
    const a = on
      ? Animated.spring(v, {
          toValue: 1,
          damping: 12,
          stiffness: 320,
          useNativeDriver: nativeDriver,
        })
      : Animated.timing(v, { toValue: 0, duration: 160, useNativeDriver: nativeDriver });
    a.start(({ finished }) => finished && !on && setMounted(false));
    return () => a.stop();
  }, [on, v]);
  if (!mounted) return null;
  const border = Math.max(3, Math.round(size * 0.16));
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLabel="Novidade"
      style={[
        styles.dot,
        {
          width: size + border * 2,
          height: size + border * 2,
          borderRadius: size / 2 + border,
          borderWidth: border,
          borderColor: ring,
          backgroundColor: c.danger,
          top: -border - size * 0.2,
          right: -border - size * 0.2,
          opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: v }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', zIndex: 2 },
});
