import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import { usePhone } from '../layout/form-factor';
import { nativeDriver } from '../theme';
import { appleEase } from '../ui/motion';

const LOGO = require('../../assets/logo.png');

/**
 * Fundo da tela de e-mail: a logo do GoClient espalhada e desfocada, com profundidade — as de
 * perto são grandes e bem desfocadas, as de longe pequenas, mais nítidas e apagadas. Cada uma
 * entra com fade e fica flutuando devagar.
 * x e y em % da tela; `size` em unidades da tela; `depth` 0 (longe) a 1 (perto).
 */
const CAR = [
  { x: 6, y: 10, size: 260, depth: 1 },
  { x: 84, y: 6, size: 120, depth: 0.35 },
  { x: 88, y: 58, size: 300, depth: 0.95 },
  { x: 16, y: 70, size: 110, depth: 0.25 },
  { x: 70, y: 84, size: 150, depth: 0.5 },
  { x: 30, y: 4, size: 80, depth: 0.1 },
  { x: 2, y: 44, size: 140, depth: 0.55 },
  { x: 93, y: 36, size: 70, depth: 0.05 },
];
const PHONE = [
  { x: -8, y: 4, size: 220, depth: 1 },
  { x: 74, y: 10, size: 100, depth: 0.3 },
  { x: 70, y: 74, size: 240, depth: 0.9 },
  { x: 6, y: 82, size: 110, depth: 0.4 },
  { x: 40, y: 2, size: 64, depth: 0.05 },
];

export function FloatingLogos() {
  const phone = usePhone();
  const list = phone ? PHONE : CAR;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {list.map((l, i) => (
        <Floating key={`${l.x}-${l.y}`} {...l} index={i} />
      ))}
    </View>
  );
}

function Floating({
  x,
  y,
  size,
  depth,
  index,
}: {
  x: number;
  y: number;
  size: number;
  depth: number;
  index: number;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 1200,
      delay: 200 + index * 120,
      easing: appleEase,
      useNativeDriver: nativeDriver,
    }).start();
    // Flutua devagar (as de perto andam mais, como num efeito de profundidade).
    const period = 5200 + index * 700;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, drift, index]);
  const amp = 14 + depth * 26;
  const dir = index % 2 ? 1 : -1;
  const blur = 2 + depth * 12;
  const opacity = 0.32 + depth * 0.18;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, opacity] }),
        transform: [
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) },
          {
            translateX: drift.interpolate({
              inputRange: [0, 1],
              outputRange: [0, dir * amp * 0.5],
            }),
          },
          {
            rotate: drift.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${dir * (4 + depth * 6)}deg`],
            }),
          },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
        ],
      }}
    >
      <Image
        source={LOGO}
        blurRadius={Platform.OS === 'web' ? 0 : blur}
        style={[
          { width: size, height: size, borderRadius: size * 0.22 },
          (Platform.OS === 'web' ? { filter: `blur(${blur}px)` } : null) as object,
        ]}
      />
    </Animated.View>
  );
}
