import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { usePhone } from '../layout/form-factor';
import { layout, nativeDriver, useColors } from '../theme';
import { useBlurTarget } from '../ui/blur-target';
import { HavenaCaption } from './caption';
import { HavenaOrb, type OrbState } from './orb';

const DURATION = 420;
const ORB = 300;
const RIGHT = 110;
/** Largura da legenda (centrada no círculo, passa um pouco das bordas dele). */
const CAPTION = 480;
/** Largura da faixa de desfoque (72% da tela). */
const HAZE_W = Math.round(layout.width * 0.72);
/** Deslocamento que leva o círculo (com folga para a sombra) totalmente para fora da tela. */
const OFFSCREEN = RIGHT + ORB / 2 + CAPTION / 2 + 60;

// Celular em pé: o círculo fica embaixo, centrado, um pouco menor, e entra de baixo para cima.
const ORB_PHONE = 236;
const BOTTOM_PHONE = 150;
const CAPTION_PHONE = 620;
/** Altura da faixa de desfoque no celular e quanto ela desce para sair da tela. */
const HAZE_H = 1600;
const OFFSCREEN_PHONE = BOTTOM_PHONE + ORB_PHONE + 60;

/**
 * Havena: só o círculo, no canto direito da tela. Atrás dele, um desfoque que nasce na
 * borda direita e esvanece para a esquerda. Abaixo dele, uma legenda de exemplo mostra as
 * palavras surgindo uma a uma. Tocar fora fecha. Protótipo: a Havena não fala de verdade.
 */
export function HavenaPanel({ onClose }: { onClose: () => void }) {
  const enter = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const [state, setState] = useState<OrbState>('listen');
  const phone = usePhone();

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
        accessibilityLabel="Fechar Havena"
        onPress={close}
        style={StyleSheet.absoluteFill}
      />
      {phone ? <RisingBlur enter={enter} /> : <FadingBlur enter={enter} />}

      {phone && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.orbPhone,
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
          {/* Legenda em cima do círculo, centrada nele. */}
          <View style={{ width: CAPTION_PHONE, minHeight: 130, justifyContent: 'flex-end' }}>
            <HavenaCaption
              width={CAPTION_PHONE}
              onSpeaking={(on) => setState(on ? 'speak' : 'listen')}
            />
          </View>
          <View accessibilityLabel="Havena">
            <HavenaOrb size={ORB_PHONE} state={state} />
          </View>
        </Animated.View>
      )}

      {!phone && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.orbWrap,
            {
              transform: [
                // Sem esmaecer: o círculo entra e sai deslizando, e só é removido depois de
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
          <View accessibilityLabel="Havena">
            <HavenaOrb size={ORB} state={state} />
            {/* Legenda logo abaixo do círculo, centrada nele. */}
            <View style={styles.caption}>
              <HavenaCaption
                width={CAPTION}
                onSpeaking={(on) => setState(on ? 'speak' : 'listen')}
              />
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
 * A intensidade é fixa: o desfoque entra e sai deslizando pela direita junto com o círculo.
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
  { h: 1, blur: 1, sat: 102 },
  { h: 0.86, blur: 2, sat: 104 },
  { h: 0.72, blur: 3, sat: 106 },
  { h: 0.6, blur: 4, sat: 108 },
  { h: 0.48, blur: 5.5, sat: 110 },
  { h: 0.38, blur: 7, sat: 112 },
  { h: 0.28, blur: 8, sat: 114 },
  { h: 0.18, blur: 9, sat: 116 },
];

const PHONE_BANDS = [
  { h: 1, intensity: 12 },
  { h: 0.75, intensity: 22 },
  { h: 0.52, intensity: 34 },
  { h: 0.32, intensity: 48 },
];

function RisingBlur({ enter }: { enter: Animated.Value }) {
  const c = useColors();
  const target = useBlurTarget();
  const dark = c.mode === 'dark';
  const shade = dark ? 'rgba(0,0,0,0.7)' : 'rgba(225,228,236,0.66)';
  const web = Platform.OS === 'web';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        web
          ? // Web (inclusive Safari do iPhone): uma camada só, na tela inteira, que aparece
            // suavemente. Camadas sobrepostas ou máscara saem deslocadas no Safari.
            {
              opacity: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            }
          : {
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
      {web
        ? // Faixas presas no rodapé, cada uma um pouco mais curta e mais desfocada: os
          // desfoques se somam embaixo e quase somem em cima. Sem máscara e sem deslocamento
          // nas faixas (o Safari do iPhone erra os dois); só a opacidade do conjunto anima.
          WEB_BANDS.map((b) => {
            const f = `blur(${b.blur}px) saturate(${b.sat}%)`;
            return (
              <View
                key={b.h}
                style={[
                  styles.hband,
                  { height: `${b.h * 100}%`, backdropFilter: f, WebkitBackdropFilter: f } as object,
                ]}
              />
            );
          })
        : PHONE_BANDS.map((b) => (
            <BlurView
              key={b.h}
              tint={dark ? 'dark' : 'light'}
              intensity={b.intensity}
              blurTarget={target ?? undefined}
              blurMethod={target ? 'dimezisBlurView' : 'none'}
              style={[styles.hband, { height: `${b.h * 100}%` }]}
            />
          ))}
      {/* Escurece mais embaixo, onde ficam o círculo e a legenda. */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', shade]}
        locations={[0.25, 0.95]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
