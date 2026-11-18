import { useEffect, useId, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * Estados visuais da Havena. Os nomes seguem o componente OrbBloop de referência
 * (idle / listen / think / speak). Aqui eles só mudam o ritmo da animação: não há
 * microfone nem áudio ligados a eles.
 */
export type OrbState = 'idle' | 'listen' | 'think' | 'speak';

export interface OrbPalette {
  main: string;
  low: string;
  mid: string;
  high: string;
}

/** Paleta azul padrão do OrbBloop: [0.1,0.5,1], [0.1,0.2,0.8], [0.2,0.4,0.9], [0.5,0.8,1]. */
export const ORB_BLUE: OrbPalette = {
  main: '#1A80FF',
  low: '#1A33CC',
  mid: '#3366E6',
  high: '#80CCFF',
};

/** Velocidade de giro, amplitude e frequência da "respiração" em cada estado. */
const MOTION: Record<OrbState, { speed: number; amp: number; freq: number }> = {
  idle: { speed: 0.35, amp: 0.018, freq: 0.9 },
  listen: { speed: 0.7, amp: 0.035, freq: 1.6 },
  think: { speed: 1.9, amp: 0.02, freq: 2.4 },
  speak: { speed: 0.9, amp: 0.07, freq: 4.2 },
};

/** Manchas de cor que giram dentro da esfera (efeito "aquarela"). */
const BLOBS = [
  { key: 'a', color: 'high', offset: 0.24, r: 0.42, rate: 1, opacity: 0.95 },
  { key: 'b', color: 'main', offset: 0.2, r: 0.46, rate: -0.72, opacity: 0.9 },
  { key: 'c', color: 'white', offset: 0.28, r: 0.26, rate: 1.45, opacity: 0.55 },
  { key: 'd', color: 'mid', offset: 0.3, r: 0.38, rate: -1.2, opacity: 0.8 },
] as const;

/**
 * Esfera animada da Havena, inspirada no OrbBloop. O original desenha com WebGPU num
 * <canvas>, o que não roda na central multimídia (React Native); esta versão usa SVG com
 * gradientes radiais e camadas que giram em ritmos diferentes, e funciona no Android e na Web.
 */
export function HavenaOrb({
  size = 144,
  state = 'idle',
  palette = ORB_BLUE,
  style,
}: {
  size?: number;
  state?: OrbState;
  palette?: OrbPalette;
  style?: ViewStyle;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const angles = useRef(BLOBS.map(() => new Animated.Value(0))).current;
  const breath = useRef(new Animated.Value(1)).current;
  const target = useRef(MOTION[state]);
  target.current = MOTION[state];

  useEffect(() => {
    // Relógio próprio: a velocidade muda suavemente entre estados, sem "pulos" no giro.
    const live = { ...MOTION.idle };
    const phase = BLOBS.map((_, i) => i * 90);
    let t = 0;
    let last = Date.now();
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const goal = target.current;
      const k = 1 - Math.exp(-dt * 4);
      live.speed += (goal.speed - live.speed) * k;
      live.amp += (goal.amp - live.amp) * k;
      live.freq += (goal.freq - live.freq) * k;
      t += dt * live.freq;
      BLOBS.forEach((b, i) => {
        const next = ((phase[i] ?? 0) + dt * 60 * live.speed * b.rate) % 360;
        phase[i] = next;
        angles[i]?.setValue(next);
      });
      // Duas senoides somadas deixam a "fala" menos mecânica.
      breath.setValue(1 + live.amp * (Math.sin(t * Math.PI * 2) * 0.7 + Math.sin(t * 5.3) * 0.3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [angles, breath]);

  const colorOf = (name: (typeof BLOBS)[number]['color']) =>
    name === 'white' ? '#FFFFFF' : palette[name];

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        styles.orb,
        { shadowColor: palette.main, shadowRadius: size * 0.18 },
        style,
        { transform: [{ scale: breath }] },
      ]}
    >
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}
        pointerEvents="none"
      >
        {/* Base: azul profundo nas bordas, mais claro no centro. */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`base${uid}`} cx="50%" cy="45%" r="60%">
              <Stop offset="0" stopColor={palette.main} />
              <Stop offset="0.7" stopColor={palette.low} />
              <Stop offset="1" stopColor="#0A1466" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#base${uid})`} />
        </Svg>

        {BLOBS.map((b, i) => {
          const angle = angles[i] as Animated.Value;
          return (
            <Animated.View
              key={b.key}
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [
                    {
                      rotate: angle.interpolate({
                        inputRange: [-360, 360],
                        outputRange: ['-360deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Svg width={size} height={size}>
                <Defs>
                  <RadialGradient id={`blob${b.key}${uid}`} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={colorOf(b.color)} stopOpacity={b.opacity} />
                    <Stop
                      offset="0.55"
                      stopColor={colorOf(b.color)}
                      stopOpacity={b.opacity * 0.45}
                    />
                    <Stop offset="1" stopColor={colorOf(b.color)} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle
                  cx={size * (0.5 + b.offset)}
                  cy={size * 0.5}
                  r={size * b.r}
                  fill={`url(#blob${b.key}${uid})`}
                />
              </Svg>
            </Animated.View>
          );
        })}

        {/* Brilho de vidro no alto e borda interna clara. */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`gloss${uid}`} cx="38%" cy="22%" r="42%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`rim${uid}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.82" stopColor={palette.high} stopOpacity={0} />
              <Stop offset="1" stopColor={palette.high} stopOpacity={0.55} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#rim${uid})`} />
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#gloss${uid})`} />
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orb: {
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
