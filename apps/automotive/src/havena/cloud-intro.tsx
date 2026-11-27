import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { nativeDriver } from '../theme';
import { EYE, LOBES, LUCAS_BLUE, VH, VW } from './cloud';

/** Ordem em que as partes da nuvem surgem: a base primeiro, depois os lados e o topo. */
const ORDER = [4, 2, 3, 0, 1] as const;

/**
 * Abertura do app (pedido do usuário em 26/11/2026: só a nuvenzinha, sem o nome, com uma
 * entrada própria). A nuvem se forma bolha por bolha, dá um pulinho, abre os olhos, olha
 * para um lado e para o outro, pisca e some suave para o onboarding.
 *
 * Só `transform` e `opacity` (driver nativo no app, compositor na web). `onDone` é chamado
 * quando a saída termina.
 */
export function LucasIntro({ size, onDone }: { size: number; onDone: () => void }) {
  const w = size;
  const h = (size * VH) / VW;
  const k = w / VW;
  const lobes = useRef(LOBES.map(() => new Animated.Value(0))).current;
  const hop = useRef(new Animated.Value(0)).current;
  const eyes = useRef(new Animated.Value(0)).current;
  const look = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const t = (v: Animated.Value, to: number, ms: number, easing = Easing.inOut(Easing.cubic)) =>
      Animated.timing(v, { toValue: to, duration: ms, easing, useNativeDriver: nativeDriver });
    const anim = Animated.sequence([
      Animated.delay(150),
      // 1) A nuvem se forma: cada bolha surge com uma mola que passa um pouco do ponto.
      Animated.stagger(
        95,
        ORDER.map((i) =>
          Animated.spring(lobes[i] as Animated.Value, {
            toValue: 1,
            damping: 9,
            stiffness: 190,
            mass: 0.8,
            useNativeDriver: nativeDriver,
          }),
        ),
      ),
      // 2) Pulinho de "cheguei!" e os olhos abrem no alto do pulo.
      Animated.parallel([
        Animated.sequence([
          t(hop, 1, 170, Easing.out(Easing.quad)),
          Animated.spring(hop, {
            toValue: 0,
            damping: 8,
            stiffness: 220,
            useNativeDriver: nativeDriver,
          }),
        ]),
        Animated.sequence([Animated.delay(120), t(eyes, 1, 200, Easing.out(Easing.back(2)))]),
      ]),
      // 3) Olha para um lado, para o outro, volta e pisca.
      Animated.delay(140),
      t(look, -1, 230),
      Animated.delay(160),
      t(look, 1, 320),
      Animated.delay(160),
      t(look, 0, 230),
      Animated.delay(90),
      t(eyes, 0.08, 70, Easing.in(Easing.quad)),
      t(eyes, 1, 120, Easing.out(Easing.quad)),
      Animated.delay(260),
      // 4) Sai: sobe de leve e some.
      t(out, 1, 300, Easing.in(Easing.cubic)),
    ]);
    anim.start(({ finished }) => finished && done.current());
    return () => anim.stop();
  }, [lobes, hop, eyes, look, out]);

  const eyeW = EYE.w * k;
  const eyeH = EYE.h * k;
  return (
    <Animated.View
      accessibilityLabel="GoClient"
      style={{
        width: w,
        height: h,
        opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [
          { translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.12] }) },
          { scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) },
        ],
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transformOrigin: 'center bottom',
            transform: [
              { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.14] }) },
              { scaleX: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) },
              { scaleY: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
            ],
          },
        ]}
      >
        {LOBES.map((l, i) => {
          const v = lobes[i] as Animated.Value;
          return (
            <Animated.View
              key={`${l.cx}-${l.cy}`}
              style={{
                position: 'absolute',
                left: (l.cx - l.r) * k,
                top: (l.cy - l.r) * k,
                width: l.r * 2 * k,
                height: l.r * 2 * k,
                borderRadius: l.r * k,
                backgroundColor: LUCAS_BLUE,
                opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
                transform: [{ scale: v }],
              }}
            />
          );
        })}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: eyes.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
              transform: [
                {
                  translateX: look.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-eyeW * 0.32, eyeW * 0.32],
                  }),
                },
              ],
            },
          ]}
        >
          {[EYE.left, EYE.right].map((x) => (
            <Animated.View
              key={x}
              style={{
                position: 'absolute',
                left: x * k,
                top: EYE.y * k,
                width: eyeW,
                height: eyeH,
                borderRadius: eyeW / 2,
                backgroundColor: '#FFFFFF',
                transform: [{ scaleY: eyes }],
              }}
            />
          ))}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
