import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type StyleProp, type TextStyle, View } from 'react-native';
import { nativeDriver } from '../theme';
import { Text } from './primitives';

const GAP = 56;
/** Velocidade da passagem (ms por unidade de largura). */
const SPEED = 22;

/**
 * Texto numa linha só. Se não couber, de tempos em tempos ele passa da direita para a esquerda
 * como um carrossel e volta ao começo (pausa de 2,5 s entre as passagens).
 */
export function Marquee({
  text,
  lineHeight,
  style,
  center,
}: {
  text: string;
  lineHeight: number;
  style?: StyleProp<TextStyle>;
  /** Centraliza o texto quando ele cabe (sem carrossel). */
  center?: boolean;
}) {
  const [box, setBox] = useState(0);
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const moves = w > 0 && box > 0 && w > box + 1;
  useEffect(() => {
    x.setValue(0);
    if (!moves) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2500),
        Animated.timing(x, {
          toValue: -(w + GAP),
          duration: (w + GAP) * SPEED,
          easing: Easing.linear,
          useNativeDriver: nativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [moves, w, x]);
  return (
    <View
      style={{ height: lineHeight, overflow: 'hidden' }}
      onLayout={(e) => setBox(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 4000,
          flexDirection: 'row',
          transform: [{ translateX: x }],
        }}
      >
        <View
          onLayout={(e) => setW(e.nativeEvent.layout.width)}
          style={center && !moves ? { opacity: 0 } : undefined}
        >
          <Text variant="subhead" tone="secondary" style={[style, { lineHeight }]}>
            {text}
          </Text>
        </View>
        {moves && (
          <Text variant="subhead" tone="secondary" style={[style, { lineHeight, marginLeft: GAP }]}>
            {text}
          </Text>
        )}
      </Animated.View>
      {center && !moves && (
        <Text
          variant="subhead"
          tone="secondary"
          numberOfLines={1}
          style={[style, { lineHeight, textAlign: 'center' }]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}
