import { useEffect, useId, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

/**
 * Estados visuais da Havena (mesmos nomes do OrbBloop: idle / listen / think / speak).
 * Aqui eles só mudam o ritmo da animação: não há microfone nem áudio ligados a eles.
 */
export type OrbState = 'idle' | 'listen' | 'think' | 'speak';

/** Cores da referência: creme no topo, azul-claro no meio, azul forte embaixo. */
const CREAM = '#FFFDF0';
const SKY = '#7CCBF6';
const BLUE = '#2F74EE';
const SOFT = '#5FA6F2';

/** Ritmo da deriva das manchas e da "respiração" em cada estado. */
const MOTION: Record<OrbState, { speed: number; drift: number; amp: number; freq: number }> = {
  idle: { speed: 0.35, drift: 0.6, amp: 0.006, freq: 0.6 },
  listen: { speed: 0.7, drift: 1, amp: 0.02, freq: 1.3 },
  think: { speed: 1.6, drift: 1.2, amp: 0.012, freq: 2.2 },
  speak: { speed: 0.9, drift: 1, amp: 0.045, freq: 3.8 },
};

/**
 * Manchas de cor, com posição de repouso (x, y em fração do diâmetro), raio e órbita.
 * Elas só derivam em volta do ponto de repouso, então o creme fica sempre no alto e o
 * azul forte embaixo, como na referência.
 */
const BLOBS = [
  { key: 'b1', color: BLUE, x: 0.22, y: 0.66, r: 0.4, op: 1, ox: 0.05, oy: 0.04, w: 0.8 },
  { key: 'b2', color: BLUE, x: 0.82, y: 0.62, r: 0.36, op: 1, ox: 0.04, oy: 0.05, w: -0.7 },
  { key: 'b3', color: BLUE, x: 0.5, y: 0.95, r: 0.42, op: 1, ox: 0.06, oy: 0.02, w: 0.5 },
  { key: 's1', color: SKY, x: 0.56, y: 0.5, r: 0.3, op: 0.95, ox: 0.07, oy: 0.05, w: 1.1 },
  { key: 's2', color: SOFT, x: 0.42, y: 0.74, r: 0.2, op: 0.7, ox: 0.06, oy: 0.04, w: -1.3 },
  { key: 'c1', color: CREAM, x: 0.28, y: 0.14, r: 0.36, op: 1, ox: 0.06, oy: 0.03, w: -0.9 },
  { key: 'c2', color: CREAM, x: 0.74, y: 0.18, r: 0.34, op: 1, ox: 0.05, oy: 0.04, w: 0.75 },
  { key: 'c3', color: CREAM, x: 0.4, y: 0.36, r: 0.16, op: 0.85, ox: 0.07, oy: 0.05, w: 1.6 },
  { key: 'c4', color: CREAM, x: 0.22, y: 0.4, r: 0.17, op: 0.9, ox: 0.05, oy: 0.04, w: -1.2 },
  // "Fio" azul que sobe do centro para o creme, como na referência.
  {
    key: 's3',
    color: SKY,
    x: 0.52,
    y: 0.3,
    r: 0.07,
    ry: 0.2,
    op: 0.95,
    ox: 0.04,
    oy: 0.03,
    w: -1.4,
  },
] as const;

/**
 * Esfera da Havena no estilo aquarela da referência: cores chapadas e suaves, sem brilho
 * de vidro nem sombra. Inspirada no OrbBloop (WebGPU), mas feita com SVG para rodar na
 * central multimídia (React Native) e na Web.
 */
export function HavenaOrb({
  size = 144,
  state = 'idle',
  style,
}: {
  size?: number;
  state?: OrbState;
  style?: ViewStyle;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pos = useRef(BLOBS.map(() => new Animated.ValueXY({ x: 0, y: 0 }))).current;
  const breath = useRef(new Animated.Value(1)).current;
  const target = useRef(MOTION[state]);
  target.current = MOTION[state];

  useEffect(() => {
    // Relógio próprio: o ritmo muda suavemente entre estados, sem saltos.
    const live = { ...MOTION.idle };
    let t = 0;
    let beat = 0;
    let last = Date.now();
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const goal = target.current;
      const k = 1 - Math.exp(-dt * 3);
      live.speed += (goal.speed - live.speed) * k;
      live.drift += (goal.drift - live.drift) * k;
      live.amp += (goal.amp - live.amp) * k;
      live.freq += (goal.freq - live.freq) * k;
      t += dt * live.speed;
      beat += dt * live.freq;
      BLOBS.forEach((b, i) => {
        const a = t * b.w * Math.PI + i * 1.7;
        pos[i]?.setValue({
          x: Math.sin(a) * b.ox * size * live.drift,
          y: Math.cos(a * 0.8) * b.oy * size * live.drift,
        });
      });
      breath.setValue(
        1 + live.amp * (Math.sin(beat * Math.PI * 2) * 0.7 + Math.sin(beat * 5.3) * 0.3),
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pos, breath, size]);

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        style,
        { transform: [{ scale: breath }] },
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}
      >
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`base${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={CREAM} />
              <Stop offset="0.3" stopColor="#D8EEF8" />
              <Stop offset="0.5" stopColor={SKY} />
              <Stop offset="0.72" stopColor={BLUE} />
              <Stop offset="1" stopColor={BLUE} />
            </LinearGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#base${uid})`} />
        </Svg>

        {BLOBS.map((b, i) => (
          <Animated.View
            key={b.key}
            style={[
              StyleSheet.absoluteFill,
              { transform: (pos[i] as Animated.ValueXY).getTranslateTransform() },
            ]}
          >
            <Svg width={size} height={size}>
              <Defs>
                <RadialGradient id={`${b.key}${uid}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={b.color} stopOpacity={b.op} />
                  <Stop offset="0.45" stopColor={b.color} stopOpacity={b.op * 0.75} />
                  <Stop offset="1" stopColor={b.color} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse
                cx={size * b.x}
                cy={size * b.y}
                rx={size * b.r}
                ry={size * ('ry' in b ? b.ry : b.r)}
                fill={`url(#${b.key}${uid})`}
              />
            </Svg>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}
