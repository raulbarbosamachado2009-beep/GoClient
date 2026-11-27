import { type ReactNode, useEffect, useMemo, useRef } from 'react';
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
 * - `listen` agora "compreende": acena em pares ("uhum, uhum") e aperta os olhos de leve.
 * - `speak` (o Lucas fala): a boca abre e fecha de leve, sem repetir sempre o mesmo
 *   movimento; a cabeça muda de ângulo ao longo da frase.
 * - `joke` (a pessoa contou uma piada): ri com os olhos fechados de alegria, boca aberta
 *   e o corpo chacoalhando.
 * - `sad` (algo deu errado): murcha, abaixa os olhos e pede desculpas.
 *
 * Fluidez (o celular travava com um relógio em JavaScript a cada quadro): tudo é feito só
 * com `transform` e `opacity`, que a GPU anima sozinha. Na web são animações CSS
 * (@keyframes em laço + transições entre poses); no Android/iOS, laços do driver nativo.
 * Nenhum JavaScript roda por quadro.
 *
 * A forma foi tirada do logo (imagem enviada pelo usuário, com o fundo removido em
 * `assets/lucas-cloud.png`) e redesenhada em vetor: cinco círculos e dois olhos em pílula.
 */
export type LucasState = 'idle' | 'listen' | 'think' | 'speak' | 'joke' | 'sad';

/** Proporções do logo (caixa da nuvem 587 × 434). */
export const VW = 587;
export const VH = 434;
export const LOBES = [
  { cx: 234, cy: 141, r: 143 },
  { cx: 402, cy: 147, r: 120 },
  { cx: 134, cy: 261, r: 133 },
  { cx: 452, cy: 261, r: 133 },
  { cx: 294, cy: 292, r: 142 },
] as const;
export const EYE = { w: 64, h: 141, y: 165, left: 194, right: 329 };
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
  // Compreendendo: dois acenos curtos ("uhum, uhum"), uma pausa e uma inclinação de leve.
  listen: {
    ms: 3400,
    frames: [
      { p: 0 },
      { p: 8, ty: 0.03, rot: -1, sx: 1.02, sy: 0.97 },
      { p: 16 },
      { p: 24, ty: 0.026, rot: -1, sx: 1.018, sy: 0.975 },
      { p: 33 },
      { p: 55, rot: 2.5, ty: -0.008 },
      { p: 78, rot: 2.5, ty: -0.008 },
      { p: 100 },
    ],
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
  // Falando: a cabeça passeia entre ângulos diferentes ao longo da frase (não é um quique
  // repetido), com balanços pequenos.
  speak: {
    ms: 4200,
    frames: [
      { p: 0 },
      { p: 11, ty: 0.01, rot: -2.5, sx: 1.015, sy: 0.985 },
      { p: 24, ty: -0.012, rot: -1 },
      { p: 37, ty: 0.008, rot: 3, sx: 1.01, sy: 0.99 },
      { p: 52, ty: -0.01, rot: 1.5, sx: 0.992, sy: 1.012 },
      { p: 66, ty: 0.012, rot: -3.5 },
      { p: 81, ty: -0.008, rot: -1, sx: 1.01, sy: 0.99 },
      { p: 92, rot: 1 },
      { p: 100 },
    ],
  },
  // Rindo: pulinhos rápidos e chacoalhando de um lado para o outro.
  joke: {
    ms: 1000,
    frames: [
      { p: 0 },
      { p: 14, ty: -0.05, rot: -3, sx: 0.97, sy: 1.04 },
      { p: 28, ty: 0.015, sx: 1.04, sy: 0.955 },
      { p: 42, ty: -0.045, rot: 3, sx: 0.975, sy: 1.035 },
      { p: 56, ty: 0.015, sx: 1.04, sy: 0.955 },
      { p: 75, ty: -0.015, rot: -1 },
      { p: 100 },
    ],
  },
  // Triste: um suspiro lento (murcha e volta).
  sad: {
    ms: 4400,
    frames: [
      { p: 0 },
      { p: 40, ty: 0.015, sx: 1.025, sy: 0.965 },
      { p: 60, ty: 0.015, sx: 1.025, sy: 0.965 },
      { p: 100 },
    ],
  },
};

/** Olhos: pose de cada estado (olhar e tamanho), com transição suave entre elas. */
const EYES: Record<LucasState, { x: number; y: number; s: number; sy: number }> = {
  idle: { x: 0, y: 0, s: 1, sy: 1 },
  listen: { x: -0.08, y: 0.04, s: 1.08, sy: 1.06 },
  think: { x: 0.28, y: -0.16, s: 0.95, sy: 0.8 },
  speak: { x: 0, y: -0.04, s: 1.02, sy: 0.92 },
  // Olhos fechados de tanto rir (pílulas achatadas e mais para cima).
  joke: { x: 0, y: -0.1, s: 1.06, sy: 0.26 },
  // Olhando para baixo, menores.
  sad: { x: 0, y: 0.2, s: 0.9, sy: 0.7 },
};
/** Pose fixa do corpo em cada estado: inclinação (graus), descida (fração da altura) e escala. */
const LEAN: Record<LucasState, { rot: number; y: number; s: number }> = {
  idle: { rot: 0, y: 0, s: 1 },
  listen: { rot: -5, y: 0, s: 1 },
  think: { rot: 4, y: 0, s: 1 },
  speak: { rot: 0, y: 0, s: 1 },
  joke: { rot: 5, y: -0.02, s: 1.03 },
  sad: { rot: -3, y: 0.06, s: 0.93 },
};
/** Boca em cada estado: visível ou não e o tamanho parado (fração da boca cheia). */
/** Boca parada falando (o laço TALK varia em torno dela). */
const TALK_BASE = { sx: 0.8, sy: 0.4 };
const MOUTHS: Record<LucasState, { on: number; sx: number; sy: number }> = {
  idle: { on: 0, sx: 0.6, sy: 0.15 },
  listen: { on: 0, sx: 0.6, sy: 0.15 },
  think: { on: 0, sx: 0.6, sy: 0.15 },
  speak: { on: 1, sx: TALK_BASE.sx, sy: TALK_BASE.sy },
  joke: { on: 1, sx: 1.1, sy: 1 },
  sad: { on: 1, sx: 0.42, sy: 0.14 },
};

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
/**
 * Boca falando: abre e fecha de leve, em sílabas de tamanhos diferentes (nunca fecha nem
 * abre por completo, para não ficar forte).
 */
const TALK: Loop = {
  ms: 1700,
  // Relativo ao tamanho parado da boca falando (MOUTHS.speak).
  frames: [
    { p: 0, sx: 0.8, sy: 0.36 },
    { p: 9, sx: 0.9, sy: 0.66 },
    { p: 19, sx: 0.82, sy: 0.44 },
    { p: 30, sx: 0.88, sy: 0.6 },
    { p: 40, sx: 0.78, sy: 0.34 },
    { p: 52, sx: 0.93, sy: 0.72 },
    { p: 63, sx: 0.8, sy: 0.42 },
    { p: 74, sx: 0.86, sy: 0.56 },
    { p: 86, sx: 0.79, sy: 0.38 },
    { p: 100, sx: 0.8, sy: 0.36 },
  ].map((f, i, all) => ({
    p: f.p,
    // Começa e termina em 1 (repouso da camada), para ligar e desligar sem salto.
    sx: i === 0 || i === all.length - 1 ? 1 : f.sx / TALK_BASE.sx,
    sy: i === 0 || i === all.length - 1 ? 1 : f.sy / TALK_BASE.sy,
  })),
};
/** Boca rindo: aberta, pulsando rápido junto com os pulinhos (relativo a MOUTHS.joke). */
const LAUGH: Loop = {
  ms: 500,
  frames: [{ p: 0 }, { p: 50, sx: 0.95, sy: 0.72 }, { p: 100 }],
};
/** Olhos compreendendo: apertam de leve a cada aceno (em sincronia com o corpo). */
const NOD_EYES: Loop = {
  ms: 3400,
  frames: [
    { p: 0 },
    { p: 8, sy: 0.78, ty: 0.04 },
    { p: 16 },
    { p: 24, sy: 0.8, ty: 0.04 },
    { p: 33 },
    { p: 100 },
  ],
};

const web = Platform.OS === 'web';
const EASE = 'cubic-bezier(0.37, 0, 0.63, 1)';
const POSE_TRANSITION: object | false = web && {
  transitionProperty: 'transform, opacity',
  transitionDuration: '450ms',
  transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
};
const MOUTH_TRANSITION: object | false = web && {
  transitionProperty: 'border-radius',
  transitionDuration: '300ms',
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

  // O piscar nunca desliga (um laço só). Os outros laços ficam em camadas próprias que
  // entram e saem sem corte (ver LoopLayer).
  const blink = useLoop('blink', BLINK, eyeW, eyeH, true);

  const pose = EYES[st];
  const lean = usePose(LEAN[st].rot);
  const sink = usePose(LEAN[st].y * h);
  const shrink = usePose(LEAN[st].s);
  const mouth = MOUTHS[st];
  const eyeX = usePose(pose.x * eyeW);
  const eyeY = usePose(pose.y * eyeH);
  const eyeS = usePose(pose.s);
  const eyeSY = usePose(pose.sy);
  const mouthOn = usePose(mouth.on);
  const mouthSX = usePose(mouth.sx);
  const mouthSY = usePose(mouth.sy);

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
        style={[
          { width: w, height: h },
          POSE_TRANSITION,
          { transform: [{ translateY: sink }, { rotate: deg(lean) }, { scale: shrink }] },
        ]}
      >
        <BodyLayers st={st} w={w} h={h}>
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
            <LoopLayer loop={GLANCE} on={st === 'idle'} w={eyeW} h={eyeH}>
              <LoopLayer loop={NOD_EYES} on={st === 'listen'} w={eyeW} h={eyeH}>
                {eye(EYE.left)}
                {eye(EYE.right)}
              </LoopLayer>
            </LoopLayer>
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
              {/* Tamanho parado da boca (troca suave) e, dentro, os laços de falar e rir,
                  relativos a ele: entram e saem sem corte. */}
              <Animated.View
                style={[
                  styles.fill,
                  POSE_TRANSITION,
                  { transform: [{ scaleX: mouthSX }, { scaleY: mouthSY }] },
                ]}
              >
                <LoopLayer loop={TALK} on={st === 'speak'} w={1} h={1}>
                  <LoopLayer loop={LAUGH} on={st === 'joke'} w={1} h={1}>
                    <View
                      style={[
                        styles.fill,
                        styles.mouth,
                        MOUTH_TRANSITION,
                        // Rindo, a boca vira um "D" (reta em cima, redonda embaixo).
                        st === 'joke'
                          ? {
                              borderTopLeftRadius: (MOUTH.h * k) / 6,
                              borderTopRightRadius: (MOUTH.h * k) / 6,
                              borderBottomLeftRadius: (MOUTH.h * k) / 1.4,
                              borderBottomRightRadius: (MOUTH.h * k) / 1.4,
                            }
                          : { borderRadius: (MOUTH.h * k) / 2 },
                      ]}
                    />
                  </LoopLayer>
                </LoopLayer>
              </Animated.View>
            </Animated.View>
          )}
        </BodyLayers>
      </Animated.View>
    </View>
  );
}

const STATES: LucasState[] = ['idle', 'listen', 'think', 'speak', 'joke', 'sad'];

/**
 * Corpo: uma camada por estado, uma dentro da outra. Só a do estado atual balança; as
 * outras ficam em repouso. Trocar de estado não reinicia nada de forma seca: a camada que
 * sai volta ao repouso suave a partir de onde estava e a nova começa do repouso.
 */
function BodyLayers({
  st,
  w,
  h,
  children,
}: {
  st: LucasState;
  w: number;
  h: number;
  children: ReactNode;
}) {
  return STATES.reduceRight<ReactNode>(
    (inner, s) => (
      <LoopLayer key={s} loop={BODY[s]} on={st === s} w={w} h={h} origin="center bottom">
        {inner}
      </LoopLayer>
    ),
    children,
  );
}

/** Quadros de um laço para a Web Animations API (cada trecho com a curva suave). */
function webFrames(loop: Loop, w: number, h: number): Keyframe[] {
  return loop.frames.map((f) => ({ offset: f.p / 100, transform: css(f, w, h), easing: EASE }));
}

/** Tempo para voltar ao repouso (ou sair dele) ao trocar de estado. */
const SETTLE_MS = 380;

/**
 * Camada com um laço de quadros-chave que liga e desliga **sem corte** (o vídeo do usuário
 * de 26/11/2026 mostrava saltos: trocar o @keyframes reiniciava o laço no meio do
 * movimento).
 *
 * - Web: Web Animations API. Ao desligar, lê a transformação atual e vai dela até o repouso;
 *   ao ligar, se ainda estiver voltando, termina a volta antes de começar o laço.
 * - Nativo: valor de 0 a 1 no driver nativo. Ao desligar, segue até a ponta mais próxima do
 *   laço (as duas são o repouso); ao ligar, começa do repouso.
 */
function LoopLayer({
  loop,
  on,
  w,
  h,
  origin,
  children,
}: {
  loop: Loop;
  on: boolean;
  w: number;
  h: number;
  origin?: string;
  children: ReactNode;
}) {
  // biome-ignore lint/suspicious/noExplicitAny: nó do DOM (Web) por trás do View.
  const el = useRef<any>(null);
  const anim = useRef<Animation | null>(null);
  const phase = useRef(new Animated.Value(0)).current;
  const native = useRef<Animated.CompositeAnimation | null>(null);
  const frames = useMemo(() => (web ? webFrames(loop, w, h) : []), [loop, w, h]);

  // Web
  useEffect(() => {
    if (!web) return;
    const node = el.current as HTMLElement | null;
    if (!node || typeof node.animate !== 'function') return;
    const current = anim.current;
    const startLoop = () => {
      anim.current = node.animate(frames, {
        duration: loop.ms,
        iterations: Number.POSITIVE_INFINITY,
      });
    };
    const settle = (ms: number, then?: () => void) => {
      const from = getComputedStyle(node).transform;
      current?.cancel();
      if (!from || from === 'none') {
        anim.current = null;
        then?.();
        return;
      }
      const a = node.animate([{ transform: from }, { transform: 'none' }], {
        duration: ms,
        easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      });
      anim.current = a;
      a.onfinish = () => {
        if (anim.current !== a) return;
        anim.current = null;
        then?.();
      };
    };
    if (on) settle(160, startLoop);
    else if (current) settle(SETTLE_MS);
  }, [on, frames, loop.ms]);
  useEffect(() => () => anim.current?.cancel(), []);

  // Nativo
  useEffect(() => {
    if (web) return;
    native.current?.stop();
    phase.stopAnimation((v) => {
      const toRest = (cb?: () => void) => {
        const end = on || v >= 0.5 ? 1 : 0;
        const ms = Math.min(SETTLE_MS, Math.abs(end - v) * loop.ms);
        if (ms < 16) {
          phase.setValue(0);
          cb?.();
          return;
        }
        const a = Animated.timing(phase, {
          toValue: end,
          duration: ms,
          easing: Easing.out(Easing.quad),
          useNativeDriver: nativeDriver,
        });
        native.current = a;
        a.start(({ finished }) => {
          if (!finished) return;
          phase.setValue(0);
          cb?.();
        });
      };
      if (!on) return toRest();
      toRest(() => {
        const l = Animated.loop(
          Animated.timing(phase, {
            toValue: 1,
            duration: loop.ms,
            easing: Easing.linear,
            useNativeDriver: nativeDriver,
          }),
        );
        native.current = l;
        l.start();
      });
    });
    return () => native.current?.stop();
  }, [on, loop, phase]);

  const nativeStyle = useMemo(() => {
    if (web) return null;
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
  }, [loop, w, h, phase]);

  const base = [styles.fill, origin ? { transformOrigin: origin } : null];
  if (web)
    return (
      <View ref={el} style={[base, { willChange: 'transform' } as object]}>
        {children}
      </View>
    );
  return <Animated.View style={[base, nativeStyle]}>{children}</Animated.View>;
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
