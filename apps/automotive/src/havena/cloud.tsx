import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { nativeDriver } from '../theme';

/**
 * O Lucas é a nuvenzinha do logo do app (pedido do usuário em 26/11/2026, no lugar da
 * bola azul). Ele tem animações de desenho animado para cada momento da conversa:
 *
 * - `idle` (ninguém fala): flutua devagar, pisca e às vezes olha para os lados.
 * - `listen` (o usuário fala): inclina a cabeça, arregala os olhos e acena ("uhum").
 * - `think`: olha para cima, balança de leve e aperta os olhos.
 * - `speak` (o Lucas fala): a boca abre e fecha por sílabas e o corpo quica junto.
 *
 * Fluidez (o celular travava com um relógio em JavaScript a cada quadro): tudo é feito só
 * com `transform` e `opacity`, que a GPU anima sozinha. Na web são animações CSS
 * (@keyframes em laço + transições entre poses); no Android/iOS, laços do driver nativo.
 * Nenhum JavaScript roda por quadro.
 *
 * A forma foi tirada do logo (imagem enviada pelo usuário, com o fundo removido em
 * `assets/lucas-cloud.png`) e redesenhada em vetor: cinco círculos e dois olhos em pílula.
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

/** Um quadro-chave: posição em % e transformações (translações em fração de w/h). */
interface Frame {
  p: number;
  tx?: number;
  ty?: number;
  rot?: number;
  sx?: number;
  sy?: number;
}
interface Loop {
  ms: number;
  frames: Frame[];
}

/** Corpo: um laço por estado (começa e termina em repouso, para trocar sem pulo). */
const BODY: Record<LucasState, Loop> = {
  idle: {
    ms: 3600,
    frames: [
      { p: 0 },
      { p: 25, ty: -0.04, rot: 1.5, sx: 0.985, sy: 1.02 },
      { p: 50 },
      { p: 75, ty: -0.03, rot: -1.5, sx: 0.99, sy: 1.015 },
      { p: 100 },
    ],
  },
  listen: {
    ms: 1300,
    frames: [{ p: 0 }, { p: 35, ty: 0.035, rot: -2, sx: 1.025, sy: 0.965 }, { p: 70 }, { p: 100 }],
  },
  think: {
    ms: 2600,
    frames: [
      { p: 0 },
      { p: 25, rot: -4, ty: -0.01 },
      { p: 50 },
      { p: 75, rot: 4, ty: -0.01 },
      { p: 100 },
    ],
  },
  speak: {
    ms: 620,
    frames: [
      { p: 0 },
      { p: 30, ty: 0.018, sx: 1.04, sy: 0.95 },
      { p: 65, ty: -0.022, sx: 0.98, sy: 1.035 },
      { p: 100 },
    ],
  },
};

/** Olhos: pose de cada estado (olhar e tamanho), com transição suave entre elas. */
const EYES: Record<LucasState, { x: number; y: number; s: number; sy: number }> = {
  idle: { x: 0, y: 0, s: 1, sy: 1 },
  listen: { x: -0.12, y: 0.05, s: 1.14, sy: 1.14 },
  think: { x: 0.28, y: -0.16, s: 0.95, sy: 0.8 },
  speak: { x: 0, y: -0.04, s: 1.02, sy: 0.92 },
};
/** Inclinação fixa do corpo em cada estado (graus). */
const LEAN: Record<LucasState, number> = { idle: 0, listen: -8, think: 4, speak: 0 };

/** Piscar: fechado por um instante, de vez em quando (às vezes duas vezes). */
const BLINK: Loop = {
  ms: 5200,
  frames: [
    { p: 0 },
    { p: 46 },
    { p: 48, sy: 0.1 },
    { p: 50 },
    { p: 88 },
    { p: 90, sy: 0.1 },
    { p: 92 },
    { p: 94, sy: 0.1 },
    { p: 96 },
    { p: 100 },
  ],
};
/** Olhadas para os lados no repouso (fração da largura do olho). */
const GLANCE: Loop = {
  ms: 7000,
  frames: [
    { p: 0 },
    { p: 30 },
    { p: 34, tx: -0.3 },
    { p: 48, tx: -0.3 },
    { p: 52 },
    { p: 74 },
    { p: 78, tx: 0.3 },
    { p: 90, tx: 0.3 },
    { p: 94 },
    { p: 100 },
  ],
};
/** Boca falando: abre e fecha em sílabas irregulares. */
const TALK: Loop = {
  ms: 1100,
  frames: [
    { p: 0, sx: 0.7, sy: 0.25 },
    { p: 12, sx: 1, sy: 1 },
    { p: 24, sx: 0.8, sy: 0.35 },
    { p: 38, sx: 0.95, sy: 0.8 },
    { p: 50, sx: 0.65, sy: 0.2 },
    { p: 62, sx: 1, sy: 0.95 },
    { p: 74, sx: 0.75, sy: 0.4 },
    { p: 86, sx: 0.9, sy: 0.7 },
    { p: 100, sx: 0.7, sy: 0.25 },
  ],
};

const web = Platform.OS === 'web';
const EASE = 'cubic-bezier(0.37, 0, 0.63, 1)';
const POSE_TRANSITION: object | false = web && {
  transitionProperty: 'transform, opacity',
  transitionDuration: '450ms',
  transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
};

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
  /** Ícone fixo (barra lateral, barra de abas): só o repouso, sem boca. */
  ambient?: boolean;
}) {
  const st: LucasState = ambient ? 'idle' : state;
  const w = size;
  const h = (size * VH) / VW;
  const k = w / VW;
  const eyeW = EYE.w * k;
  const eyeH = EYE.h * k;

  const body = useLoop(`body_${st}`, BODY[st], w, h, true);
  const blink = useLoop('blink', BLINK, eyeW, eyeH, true);
  const glance = useLoop('glance', GLANCE, eyeW, eyeH, st === 'idle');
  const talk = useLoop('talk', TALK, 1, 1, st === 'speak');

  const pose = EYES[st];
  const lean = usePose(LEAN[st]);
  const eyeX = usePose(pose.x * eyeW);
  const eyeY = usePose(pose.y * eyeH);
  const eyeS = usePose(pose.s);
  const eyeSY = usePose(pose.sy);
  const mouthOn = usePose(st === 'speak' ? 1 : 0);

  const eye = (x: number) => (
    <Animated.View
      style={[
        styles.eye,
        {
          left: x * k,
          top: EYE.y * k,
          width: eyeW,
          height: eyeH,
          borderRadius: eyeW / 2,
        },
        blink,
      ]}
    />
  );

  return (
    <View
      pointerEvents="none"
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      {/* Pose (inclinação) e, dentro, o laço do corpo, com origem embaixo (achatar/esticar). */}
      <Animated.View
        style={[{ width: w, height: h }, POSE_TRANSITION, { transform: [{ rotate: deg(lean) }] }]}
      >
        <Animated.View style={[styles.fill, { transformOrigin: 'center bottom' }, body]}>
          <Svg width={w} height={h} viewBox={`0 0 ${VW} ${VH}`} style={StyleSheet.absoluteFill}>
            {LOBES.map((l) => (
              <Circle key={`${l.cx}-${l.cy}`} cx={l.cx} cy={l.cy} r={l.r} fill={LUCAS_BLUE} />
            ))}
          </Svg>
          <Animated.View
            style={[
              styles.fill,
              POSE_TRANSITION,
              {
                transform: [
                  { translateX: eyeX },
                  { translateY: eyeY },
                  { scaleX: eyeS },
                  { scaleY: eyeSY },
                ],
              },
            ]}
          >
            <Animated.View style={[styles.fill, glance]}>
              {eye(EYE.left)}
              {eye(EYE.right)}
            </Animated.View>
          </Animated.View>
          {!ambient && (
            <Animated.View
              style={[
                styles.mouthBox,
                {
                  left: ((VW - MOUTH.w) / 2) * k,
                  top: MOUTH.y * k,
                  width: MOUTH.w * k,
                  height: MOUTH.h * k,
                  opacity: mouthOn,
                },
                POSE_TRANSITION,
              ]}
            >
              <Animated.View
                style={[
                  styles.mouth,
                  { borderRadius: (MOUTH.h * k) / 2 },
                  st === 'speak' ? talk : { transform: [{ scaleX: 0.6 }, { scaleY: 0.15 }] },
                ]}
              />
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const deg = (v: number | Animated.Value) =>
  typeof v === 'number'
    ? `${v}deg`
    : v.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] });

/**
 * Valor de pose. Web: o número direto (a transição CSS faz o caminho). Nativo: um
 * Animated.Value levado ao alvo pelo driver nativo.
 */
function usePose(target: number): number | Animated.Value {
  const v = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    if (web) return;
    Animated.timing(v, {
      toValue: target,
      duration: 450,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: nativeDriver,
    }).start();
  }, [v, target]);
  return web ? target : v;
}

/** Transformação de um quadro em CSS (translações em px). */
function css(f: Frame, w: number, h: number) {
  return `translate(${((f.tx ?? 0) * w).toFixed(2)}px,${((f.ty ?? 0) * h).toFixed(2)}px) rotate(${f.rot ?? 0}deg) scale(${f.sx ?? 1},${f.sy ?? 1})`;
}

/**
 * Laço de quadros-chave. Web: @keyframes registrados uma vez por tamanho, rodando no
 * compositor do navegador. Nativo: um valor de 0 a 1 em laço no driver nativo, interpolado
 * para cada transformação.
 */
function useLoop(id: string, loop: Loop, w: number, h: number, on: boolean): object {
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (web || !on) return;
    phase.setValue(0);
    const a = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: loop.ms,
        easing: Easing.linear,
        useNativeDriver: nativeDriver,
      }),
    );
    a.start();
    return () => a.stop();
  }, [phase, loop, on]);

  return useMemo(() => {
    if (!on) return {};
    if (web) {
      const name = `lucas_${id}_${Math.round(w)}_${Math.round(h)}`;
      ensureKeyframes(name, loop.frames.map((f) => `${f.p}%{transform:${css(f, w, h)}}`).join(''));
      return {
        animationName: name,
        animationDuration: `${loop.ms}ms`,
        animationIterationCount: 'infinite',
        animationTimingFunction: EASE,
        willChange: 'transform',
      };
    }
    const input = loop.frames.map((f) => f.p / 100);
    const pick = (fn: (f: Frame) => number) => ({
      inputRange: input,
      outputRange: loop.frames.map(fn),
    });
    return {
      transform: [
        { translateX: phase.interpolate(pick((f) => (f.tx ?? 0) * w)) },
        { translateY: phase.interpolate(pick((f) => (f.ty ?? 0) * h)) },
        {
          rotate: phase.interpolate({
            inputRange: input,
            outputRange: loop.frames.map((f) => `${f.rot ?? 0}deg`),
          }),
        },
        { scaleX: phase.interpolate(pick((f) => f.sx ?? 1)) },
        { scaleY: phase.interpolate(pick((f) => f.sy ?? 1)) },
      ],
    };
  }, [id, loop, w, h, on, phase]);
}

/** Web: registra (uma vez) um @keyframes na folha de estilos da página. */
const registered = new Set<string>();
function ensureKeyframes(name: string, body: string) {
  if (registered.has(name) || typeof document === 'undefined') return;
  registered.add(name);
  const tag = document.createElement('style');
  tag.textContent = `@keyframes ${name}{${body}}`;
  document.head.appendChild(tag);
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  eye: { position: 'absolute', backgroundColor: '#FFFFFF' },
  mouthBox: { position: 'absolute' },
  mouth: { flex: 1, backgroundColor: '#FFFFFF' },
});
