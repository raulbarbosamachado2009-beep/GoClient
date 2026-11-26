import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { usePhone, useTabBarLift } from '../layout/form-factor';
import { layout, nativeDriver, useColors } from '../theme';
import { useBlurTarget } from '../ui/blur-target';
import { Button } from '../ui/primitives';
import { type DemoMood, HavenaCaption } from './caption';
import { LucasCloud, type LucasState } from './cloud';
import { useHavenaSession, type WakeStart } from './session';

const DURATION = 420;
const ORB = 300;
const RIGHT = 110;
/** Largura da legenda (centrada na nuvem, passa um pouco das bordas dela). */
const CAPTION = 480;
/** Largura da faixa de desfoque (72% da tela). */
const HAZE_W = Math.round(layout.width * 0.72);
/** Deslocamento que leva a nuvem (com folga para a sombra) totalmente para fora da tela. */
const OFFSCREEN = RIGHT + ORB / 2 + CAPTION / 2 + 60;

// Celular em pé: a nuvem fica embaixo, centrado, um pouco menor, e entra de baixo para cima.
const ORB_PHONE = 236;
const BOTTOM_PHONE = 150;
const CAPTION_PHONE = 620;
/** Altura da faixa de desfoque no celular e quanto ela desce para sair da tela. */
const HAZE_H = 1600;
const OFFSCREEN_PHONE = BOTTOM_PHONE + ORB_PHONE + 60;

/**
 * Lucas: só a nuvem, no canto direito da tela (embaixo, no celular). Atrás dele, um
 * desfoque. A legenda mostra o que a pessoa fala e a resposta dele. Tocar fora fecha; até lá
 * ele continua ouvindo. No Preview (web) fica a demonstração com falas de exemplo.
 */
export function HavenaPanel({
  onClose,
  wakeStart,
}: {
  onClose: () => void;
  /** Aberto pela voz ("olá Lucas, …"): responde já ao que veio junto. */
  wakeStart?: WakeStart;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [demoState, setDemoState] = useState<LucasState>('listen');
  const phone = usePhone();
  // Preview: a nuvem passa pelos três momentos da conversa. Falando enquanto a frase surge;
  // depois fica parada um pouco e, antes da próxima frase, "ouve" a pessoa.
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoSpeaking = (on: boolean, mood?: DemoMood) => {
    if (demoTimer.current) clearTimeout(demoTimer.current);
    // Piada: ri enquanto fala e mais um pouco depois. Erro: fica triste até a próxima fala.
    setDemoState(on ? (mood ?? 'speak') : mood === 'sad' ? 'sad' : mood ? 'joke' : 'idle');
    if (!on) demoTimer.current = setTimeout(() => setDemoState('listen'), mood ? 1500 : 1200);
  };
  useEffect(
    () => () => {
      if (demoTimer.current) clearTimeout(demoTimer.current);
    },
    [],
  );
  const lift = useTabBarLift();
  // Havena de verdade (app instalado): ouve, entende, age e responde. No Preview (web) fica
  // a demonstração com falas de exemplo.
  const live = Platform.OS !== 'web';
  const session = useHavenaSession(live && !leaving, wakeStart);
  const state: LucasState = live
    ? session.phase === 'listening'
      ? 'listen'
      : session.phase === 'thinking'
        ? 'think'
        : session.mood === 'joke' && session.phase === 'speaking'
          ? 'joke'
          : session.mood === 'sad'
            ? 'sad'
            : session.phase === 'speaking'
              ? 'speak'
              : 'idle'
    : demoState;
  // Ouvindo: a fala da pessoa, palavra por palavra, assim que é ouvida. Pensando: a frase
  // dela continua na tela (a nuvem mostra que ele está pensando). Falando: a resposta.
  const userLine =
    live && (session.phase === 'listening' || session.phase === 'thinking') && !!session.heard;
  const text = live
    ? userLine
      ? session.heard
      : session.phase === 'listening'
        ? 'Pode falar…'
        : session.caption
    : undefined;
  const confirm = live && session.awaiting && session.phase !== 'thinking' && (
    <View style={styles.confirm}>
      <Button label="Sim" size="md" onPress={() => session.reply(true)} />
      <Button label="Não" variant="gray" size="md" onPress={() => session.reply(false)} />
    </View>
  );

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      damping: 18,
      stiffness: 170,
      useNativeDriver: nativeDriver,
    }).start();
  }, [enter]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setLeaving(true);
    Animated.timing(enter, {
      toValue: 0,
      duration: DURATION + 80,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start(onClose);
  }, [enter, onClose]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Fechar Lucas"
        onPress={close}
        style={StyleSheet.absoluteFill}
      />
      {phone ? <RisingBlur enter={enter} leaving={leaving} /> : <FadingBlur enter={enter} />}

      {phone && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.orbPhone,
            { bottom: BOTTOM_PHONE + lift },
            {
              transform: [
                {
                  translateY: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [OFFSCREEN_PHONE, 0],
                  }),
                },
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            },
          ]}
        >
          {/* Legenda em cima da nuvem, centrada nela. */}
          <View style={{ width: CAPTION_PHONE, minHeight: 130, justifyContent: 'flex-end' }}>
            <HavenaCaption
              width={CAPTION_PHONE}
              text={text}
              instant={userLine}
              onSpeaking={(on, mood) => !live && demoSpeaking(on, mood)}
            />
          </View>
          {confirm}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lucas (toque para falar)"
            onPress={session.talk}
          >
            <LucasCloud size={ORB_PHONE} state={state} />
          </Pressable>
        </Animated.View>
      )}

      {!phone && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.orbWrap,
            {
              transform: [
                // Sem esmaecer: a nuvem entra e sai deslizando, e só é removido depois de
                // passar inteiro da borda direita da tela.
                {
                  translateX: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [OFFSCREEN, 0],
                  }),
                },
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            },
          ]}
        >
          <View accessibilityLabel="Lucas">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Lucas (toque para falar)"
              onPress={session.talk}
            >
              <LucasCloud size={ORB} state={state} />
            </Pressable>
            {/* Legenda logo abaixo da nuvem, centrada nela. */}
            <View style={styles.caption}>
              <HavenaCaption
                width={CAPTION}
                text={text}
                instant={userLine}
                onSpeaking={(on, mood) => !live && demoSpeaking(on, mood)}
              />
              {confirm}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Desfoque que "sufoca" o fundo a partir da borda direita e some em direção à esquerda.
 * Web: um único `backdrop-filter` recortado por uma máscara em degradê.
 * Android/iOS: faixas de desfoque sobrepostas, cada vez mais estreitas, que somam mais
 * desfoque perto da borda direita (o BlurView não aceita máscara em degradê).
 *
 * A intensidade é fixa: o desfoque entra e sai deslizando pela direita junto com a nuvem.
 * Mudar o raio a cada quadro fazia o navegador recompor também o desfoque do cartão do Mapa
 * que fica atrás, e o cartão sumia e voltava (e o mapa piscava).
 */
const BANDS = [
  { w: 1, intensity: 12 },
  { w: 0.78, intensity: 22 },
  { w: 0.58, intensity: 34 },
  { w: 0.4, intensity: 48 },
];

function FadingBlur({ enter }: { enter: Animated.Value }) {
  const c = useColors();
  const target = useBlurTarget();
  const dark = c.mode === 'dark';
  const shade = dark ? 'rgba(0,0,0,0.62)' : 'rgba(225,228,236,0.6)';
  const mask = 'linear-gradient(to left, #000 0%, #000 30%, transparent 100%)';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fadeRegion,
        {
          transform: [
            {
              translateX: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [HAZE_W, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}
    >
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backdropFilter: 'blur(40px) saturate(130%)',
              WebkitBackdropFilter: 'blur(40px) saturate(130%)',
              maskImage: mask,
              WebkitMaskImage: mask,
            } as object,
          ]}
        />
      ) : (
        // Faixas cada vez mais estreitas e mais fortes: somadas, o desfoque cresce para a direita.
        BANDS.map((b) => (
          <BlurView
            key={b.w}
            tint={dark ? 'dark' : 'light'}
            intensity={b.intensity}
            blurTarget={target ?? undefined}
            blurMethod={target ? 'dimezisBlurView' : 'none'}
            style={[styles.band, { width: `${b.w * 100}%` }]}
          />
        ))
      )}
      <LinearGradient
        colors={['transparent', shade]}
        locations={[0, 0.7]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/**
 * Celular: desfoque com escurecimento que cresce para baixo.
 * Web: uma única camada de desfoque na tela toda (o Safari do iPhone não aplica desfoque com
 * máscara e desenha camadas sobrepostas deslocadas dentro da moldura reduzida).
 * Android: faixas de desfoque sobrepostas, mais fortes embaixo, subindo da borda.
 */
/** Web: faixas do desfoque do celular (altura relativa à tela e raio de cada uma). */
const WEB_BANDS = [
  { h: 0.6, blur: 1, sat: 102 },
  { h: 0.516, blur: 2, sat: 104 },
  { h: 0.432, blur: 3, sat: 106 },
  { h: 0.36, blur: 4, sat: 108 },
  { h: 0.288, blur: 5.5, sat: 110 },
  { h: 0.228, blur: 7, sat: 112 },
  { h: 0.168, blur: 8, sat: 114 },
  { h: 0.108, blur: 9, sat: 116 },
];

const PHONE_BANDS = [
  { h: 0.6, intensity: 12 },
  { h: 0.45, intensity: 22 },
  { h: 0.312, intensity: 34 },
  { h: 0.192, intensity: 48 },
];

function RisingBlur({ enter, leaving }: { enter: Animated.Value; leaving: boolean }) {
  const c = useColors();
  const target = useBlurTarget();
  const dark = c.mode === 'dark';
  const shade = dark ? 'rgba(0,0,0,0.7)' : 'rgba(225,228,236,0.66)';
  const web = Platform.OS === 'web';
  // Web: o desfoque nunca fica dentro de uma camada semitransparente. No Safari, um pai com
  // opacidade < 1 desliga o desfoque dos filhos — com a mola de entrada passando de 1 e
  // voltando, o desfoque aparecia, sumia e voltava. Aqui o raio do desfoque é que cresce
  // (transição CSS) e só o escurecimento usa opacidade, numa camada separada.
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!web) return;
    if (leaving) {
      setOn(false);
      return;
    }
    const f = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(f);
  }, [web, leaving]);
  const fade = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  if (web)
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {/* Faixas presas no rodapé, cada uma um pouco mais curta e mais desfocada: os
            desfoques se somam embaixo e quase somem em cima. Sem máscara e sem deslocamento
            (o Safari do iPhone erra os dois). */}
        {WEB_BANDS.map((b) => {
          const f = on ? `blur(${b.blur}px) saturate(${b.sat}%)` : 'blur(0px) saturate(100%)';
          return (
            <View
              key={b.h}
              style={[
                styles.hband,
                {
                  height: `${b.h * 100}%`,
                  backdropFilter: f,
                  WebkitBackdropFilter: f,
                  transitionProperty: 'backdrop-filter, -webkit-backdrop-filter',
                  transitionDuration: leaving ? `${DURATION}ms` : '420ms',
                  transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                } as object,
              ]}
            />
          );
        })}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', shade]}
            locations={[0.5, 0.97]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [HAZE_H, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}
    >
      {PHONE_BANDS.map((b) => (
        <BlurView
          key={b.h}
          tint={dark ? 'dark' : 'light'}
          intensity={b.intensity}
          blurTarget={target ?? undefined}
          blurMethod={target ? 'dimezisBlurView' : 'none'}
          style={[styles.hband, { height: `${b.h * 100}%` }]}
        />
      ))}
      {/* Escurece mais embaixo, onde ficam a nuvem e a legenda. */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', shade]}
        locations={[0.5, 0.97]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  confirm: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 12 },
  hband: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  orbPhone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_PHONE,
    alignItems: 'center',
    gap: 28,
  },
  fadeRegion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: HAZE_W,
  },
  band: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  caption: {
    position: 'absolute',
    top: ORB + 36,
    left: (ORB - CAPTION) / 2,
    width: CAPTION,
  },
  orbWrap: {
    position: 'absolute',
    right: RIGHT,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
