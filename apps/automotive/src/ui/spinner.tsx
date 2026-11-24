import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { nativeDriver, useColors } from '../theme';

/**
 * Indicador de carregamento no estilo da Apple: raios arredondados em volta de um centro,
 * com o brilho girando em passos (o raio da frente aceso e os de trás apagando), como o
 * `UIActivityIndicatorView` do iOS. Igual no Android, no iOS e na Web — o
 * `ActivityIndicator` do Android é um anel do Material Design.
 *
 * `size` é o diâmetro em unidades da tela de referência.
 */
export function Spinner({
  size = 56,
  color,
  spokes = 8,
  style,
}: {
  size?: number;
  color?: string;
  /** 8 (grande, como no iOS) ou 12 (médio). */
  spokes?: 8 | 12;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const tint = color ?? c.textSecondary;
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Um giro por segundo, em passos de um raio (o movimento "tique" do iOS).
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 1000,
        easing: (t) => Math.floor(t * spokes) / spokes,
        useNativeDriver: nativeDriver,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn, spokes]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const length = size * (spokes === 8 ? 0.3 : 0.28);
  const width = size * (spokes === 8 ? 0.1 : 0.08);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando"
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        {Array.from({ length: spokes }, (_, i) => (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: raios fixos
            key={i}
            style={[
              StyleSheet.absoluteFill,
              { alignItems: 'center', transform: [{ rotate: `${(-i * 360) / spokes}deg` }] },
            ]}
          >
            <View
              style={{
                width,
                height: length,
                borderRadius: width / 2,
                backgroundColor: tint,
                // O raio da frente (i = 0) é o mais aceso; os de trás vão apagando.
                opacity: 1 - (i / spokes) * 0.78,
              }}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
