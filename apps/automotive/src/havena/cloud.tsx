import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { nativeDriver } from '../theme';

/**
 * O Lucas é a nuvenzinha do logo do app (pedido do usuário em 26/11/2026, no lugar da
 * bola azul). Ele tem animações de desenho animado para cada momento da conversa:
 *
 * - `idle` (ninguém fala): flutua devagar, pisca e às vezes olha para os lados.
 * - `listen` (o usuário fala): inclina a cabeça, arregala os olhos e balança como quem
 *   concorda ("uhum").
 * - `think`: olha para cima, balança de leve e aperta os olhos.
 * - `speak` (o Lucas fala): a boca abre e fecha por sílabas e o corpo quica junto.
 *
 * A forma foi tirada do logo (imagem enviada pelo usuário, com o fundo removido em
 * `assets/lucas-cloud.png`) e redesenhada em vetor: cinco círculos e dois olhos em
 * pílula. Assim os olhos, a boca e o corpo se mexem separados.
 */
export type LucasState = 'idle' | 'listen' | 'think' | 'speak';

/** Proporções do logo (caixa da nuvem 587 × 434). */
const VW = 587;
const VH = 434;
const LOBES = [
  { cx: 234, cy: 141, r: 143 },
  { cx: 402, cy: 147, r: 120 },
  { cx: 134, cy: 261, r: 133 },
  { cx: 452, cy: 261, r: 133 },
  { cx: 294, cy: 292, r: 142 },
] as const;
const EYE = { w: 64, h: 141, y: 165, left: 194, right: 329 };
const MOUTH = { w: 96, h: 58, y: 316 };
export const LUCAS_BLUE = '#0070FE';

/** Pose de cada estado. O relógio mistura uma pose na outra suavemente. */
interface Pose {
  bob: number; // flutuação (fração da altura)
  bobHz: number;
  lean: number; // inclinação fixa (graus)
  sway: number; // balanço (graus)
  swayHz: number;
  nod: number; // aceno rápido (fração da altura)
  nodHz: number;
  eye: number; // tamanho dos olhos (1 = logo)
  squint: number; // olhos apertados (0..1)
  lookX: number; // olhar (fração da largura do olho)
  lookY: number;
  glance: number; // olhadas para os lados no repouso (0..1)
  talk: number; // boca falando (0..1)
}

const POSES: Record<LucasState, Pose> = {
  idle: {
    bob: 0.035,
    bobHz: 0.45,
    lean: 0,
    sway: 2,
    swayHz: 0.25,
    nod: 0,
    nodHz: 0,
    eye: 1,
    squint: 0,
    lookX: 0,
    lookY: 0,
    glance: 1,
    talk: 0,
  },
  listen: {
    bob: 0.015,
    bobHz: 0.6,
    lean: -9,
    sway: 1,
    swayHz: 0.4,
    nod: 0.03,
    nodHz: 1.6,
    eye: 1.14,
    squint: 0,
    lookX: -0.12,
    lookY: 0.05,
    glance: 0,
    talk: 0,
  },
  think: {
    bob: 0.02,
    bobHz: 0.35,
    lean: 5,
    sway: 4,
    swayHz: 0.5,
    nod: 0,
    nodHz: 0,
    eye: 0.95,
    squint: 0.35,
    lookX: 0.28,
    lookY: -0.16,
    glance: 0,
    talk: 0,
  },
  speak: {
    bob: 0.02,
    bobHz: 0.7,
    lean: 0,
    sway: 5,
    swayHz: 0.45,
    nod: 0,
    nodHz: 0,
    eye: 1.02,
    squint: 0.12,
    lookX: 0,
    lookY: -0.04,
    glance: 0,
    talk: 1,
  },
};

const KEYS = Object.keys(POSES.idle) as (keyof Pose)[];

/** "Sílabas": abertura da boca de 0 a 1, em pulsos irregulares (soma de senos). */
function syllables(t: number) {
  const beat = Math.abs(Math.sin(t * Math.PI * 3.2)); // ~3 sílabas por segundo
  const accent = 0.65 + 0.35 * Math.abs(Math.sin(t * Math.PI * 1.3 + 0.7));
  const phrase = Math.sin(t * Math.PI * 0.45) > -0.75 ? 1 : 0.25; // respiros curtos
  return beat * accent * phrase;
}

export function LucasCloud({
  size = 144,
  state = 'idle',
  style,
  ambient = false,
}: {
  /** Largura da caixa (quadrada); a nuvem fica centrada nela. */
  size?: number;
  state?: LucasState;
  style?: ViewStyle;
  /**
   * Só o repouso (flutuar e piscar), em laços do driver nativo, sem JavaScript a cada
   * quadro. Para o ícone que fica sempre na tela (barra lateral e barra de abas).
   */
  ambient?: boolean;
}) {
  const w = size;
  const h = (size * VH) / VW;
  const k = w / VW;

  const v = useRef({
    y: new Animated.Value(0),
    rot: new Animated.Value(0),
    sx: new Animated.Value(1),
    sy: new Animated.Value(1),
    eyeX: new Animated.Value(0),
    eyeY: new Animated.Value(0),
    eyeSX: new Animated.Value(1),
    eyeSY: new Animated.Value(1),
    mouth: new Animated.Value(0),
  }).current;
  const target = useRef(POSES[state]);
  target.current = POSES[state];

  // Repouso em laço nativo (ícones pequenos).
  useEffect(() => {
    if (!ambient) return;
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(v.y, {
          toValue: -h * 0.06,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(v.y, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
      ]),
    );
    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(v.eyeSY, { toValue: 0.12, duration: 70, useNativeDriver: nativeDriver }),
        Animated.timing(v.eyeSY, { toValue: 1, duration: 110, useNativeDriver: nativeDriver }),
        Animated.delay(1800),
        Animated.timing(v.eyeSY, { toValue: 0.12, duration: 70, useNativeDriver: nativeDriver }),
        Animated.timing(v.eyeSY, { toValue: 1, duration: 110, useNativeDriver: nativeDriver }),
        Animated.delay(120),
        Animated.timing(v.eyeSY, { toValue: 0.12, duration: 70, useNativeDriver: nativeDriver }),
        Animated.timing(v.eyeSY, { toValue: 1, duration: 110, useNativeDriver: nativeDriver }),
      ]),
    );
    bob.start();
    blink.start();
    return () => {
      bob.stop();
      blink.stop();
    };
  }, [ambient, v, h]);

  // Animação completa: um relógio próprio mistura as poses e soma piscadas e sílabas.
  useEffect(() => {
    if (ambient) return;
    const live: Pose = { ...POSES.idle };
    let t = 0;
    let last = Date.now();
    let nextBlink = 1.2;
    let blinkAt = -1;
    let nextGlance = 2.5;
    let glanceTo = 0;
    let glanceNow = 0;
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      t += dt;
      const goal = target.current;
      const mix = 1 - Math.exp(-dt * 6);
      for (const key of KEYS) live[key] += (goal[key] - live[key]) * mix;

      // Piscadas: a cada 2–5 s, às vezes dupla.
      if (t >= nextBlink) {
        blinkAt = t;
        nextBlink = t + (Math.random() < 0.2 ? 0.28 : 2 + Math.random() * 3);
      }
      const bt = t - blinkAt;
      const blink = bt >= 0 && bt < 0.18 ? Math.sin((bt / 0.18) * Math.PI) : 0;

      // Olhadas para os lados (só no repouso).
      if (t >= nextGlance) {
        glanceTo = glanceTo !== 0 ? 0 : Math.random() < 0.5 ? -0.3 : 0.3;
        nextGlance = t + (glanceTo !== 0 ? 0.9 : 2.5 + Math.random() * 2.5);
      }
      glanceNow += (glanceTo * live.glance - glanceNow) * (1 - Math.exp(-dt * 10));

      const talk = live.talk * (0.15 + 0.85 * syllables(t));
      const bob = Math.sin(t * 2 * Math.PI * live.bobHz);
      const nod = Math.max(0, Math.sin(t * 2 * Math.PI * live.nodHz));
      // Esticar ao subir, achatar ao descer; falando, achata a cada sílaba (quique).
      const squash = bob * 0.025 - talk * 0.05;
      const sy = 1 + squash;
      const sx = 1 - squash * 0.8;

      v.y.setValue(-bob * live.bob * h + nod * live.nod * h + (1 - sy) * h * 0.5);
      v.rot.setValue(live.lean + Math.sin(t * 2 * Math.PI * live.swayHz) * live.sway);
      v.sx.setValue(sx);
      v.sy.setValue(sy);
      v.eyeX.setValue((live.lookX + glanceNow) * EYE.w * k);
      v.eyeY.setValue((live.lookY - talk * 0.05) * EYE.h * k);
      v.eyeSX.setValue(live.eye);
      v.eyeSY.setValue(live.eye * (1 - live.squint * 0.45) * (1 - blink * 0.88));
      v.mouth.setValue(talk);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ambient, v, h, k]);

  const eye = (x: number) => (
    <Animated.View
      style={[
        styles.eye,
        {
          left: x * k,
          top: EYE.y * k,
          width: EYE.w * k,
          height: EYE.h * k,
          borderRadius: (EYE.w * k) / 2,
          transform: [
            { translateX: v.eyeX },
            { translateY: v.eyeY },
            { scaleX: v.eyeSX },
            { scaleY: v.eyeSY },
          ],
        },
      ]}
    />
  );

  return (
    <View
      pointerEvents="none"
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Animated.View
        style={{
          width: w,
          height: h,
          transform: [
            { translateY: v.y },
            {
              rotate: v.rot.interpolate({
                inputRange: [-180, 180],
                outputRange: ['-180deg', '180deg'],
              }),
            },
            { scaleX: v.sx },
            { scaleY: v.sy },
          ],
        }}
      >
        <Svg width={w} height={h} viewBox={`0 0 ${VW} ${VH}`} style={StyleSheet.absoluteFill}>
          {LOBES.map((l) => (
            <Circle key={`${l.cx}-${l.cy}`} cx={l.cx} cy={l.cy} r={l.r} fill={LUCAS_BLUE} />
          ))}
        </Svg>
        {eye(EYE.left)}
        {eye(EYE.right)}
        {!ambient && (
          <Animated.View
            style={[
              styles.mouth,
              {
                left: ((VW - MOUTH.w) / 2) * k,
                top: MOUTH.y * k,
                width: MOUTH.w * k,
                height: MOUTH.h * k,
                borderRadius: (MOUTH.h * k) / 2,
                opacity: v.mouth.interpolate({
                  inputRange: [0, 0.08, 1],
                  outputRange: [0, 1, 1],
                }),
                transform: [
                  { scaleX: v.mouth.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
                  { scaleY: v.mouth.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] }) },
                ],
              },
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  eye: { position: 'absolute', backgroundColor: '#FFFFFF' },
  mouth: { position: 'absolute', backgroundColor: '#FFFFFF' },
});
