import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import { FONT, nativeDriver, useColors } from '../theme';

/** Falas de exemplo (quando nenhuma fala real é passada, ex.: no Preview). */
const PHRASES = [
  'Seu próximo cliente é a Boutique Albuquerque, a doze minutos daqui.',
  'No último pedido ela levou camisetas, calças e vestidos de linho.',
  'Quer que eu abra a rota agora?',
];

const WORD_MS = 230; // intervalo entre palavras
const PAUSE_MS = 260; // pausa extra depois de vírgula ou ponto
const HOLD_MS = 1500; // frase completa na tela antes de sumir
const FADE_OUT_MS = 520;
const GAP_MS = 380; // silêncio entre frases

/**
 * Legenda da Havena: as palavras surgem uma a uma, como se ela estivesse falando, e a frase
 * some antes da próxima. Cada palavra entra com fade, subindo de leve e (na Web) saindo de um
 * pequeno desfoque. `onSpeaking` avisa quando há palavras surgindo, para o orbe acompanhar.
 */
export function HavenaCaption({
  width,
  text,
  onSpeaking,
}: {
  width: number;
  /** Fala atual (real). Sem ela, a legenda mostra as falas de exemplo em ciclo. */
  text?: string;
  onSpeaking?: (speaking: boolean) => void;
}) {
  if (text !== undefined) return <LiveCaption width={width} text={text} onSpeaking={onSpeaking} />;
  return <DemoCaption width={width} onSpeaking={onSpeaking} />;
}

/** Uma fala real: as palavras surgem uma a uma e a frase fica na tela até a próxima. */
function LiveCaption({
  width,
  text,
  onSpeaking,
}: {
  width: number;
  text: string;
  onSpeaking?: (speaking: boolean) => void;
}) {
  const c = useColors();
  const [count, setCount] = useState(0);
  const speaking = useRef(onSpeaking);
  speaking.current = onSpeaking;
  const words = text ? text.split(' ') : [];
  useEffect(() => {
    const list = text ? text.split(' ') : [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 60;
    setCount(0);
    if (list.length) timers.push(setTimeout(() => speaking.current?.(true), t));
    list.forEach((w, i) => {
      timers.push(setTimeout(() => setCount(i + 1), t));
      t += Math.min(WORD_MS, 2600 / Math.max(list.length, 1)) + (/[,.?!]$/.test(w) ? 120 : 0);
    });
    timers.push(setTimeout(() => speaking.current?.(false), t));
    return () => timers.forEach(clearTimeout);
  }, [text]);
  return (
    <Animated.View style={[styles.line, { width }]} pointerEvents="none">
      {words.map((w, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a posição na frase é a identidade da palavra.
        <Word key={`${text}-${i}`} text={w} color={c.text} visible={i < count} />
      ))}
    </Animated.View>
  );
}

function DemoCaption({
  width,
  onSpeaking,
}: {
  width: number;
  onSpeaking?: (speaking: boolean) => void;
}) {
  const c = useColors();
  const [phrase, setPhrase] = useState(0);
  const [count, setCount] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const speaking = useRef(onSpeaking);
  speaking.current = onSpeaking;

  const words = (PHRASES[phrase] ?? '').split(' ');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const list = (PHRASES[phrase] ?? '').split(' ');
    let t = GAP_MS;
    fade.setValue(1);
    setCount(0);
    timers.push(setTimeout(() => speaking.current?.(true), t));
    list.forEach((w, i) => {
      timers.push(setTimeout(() => setCount(i + 1), t));
      t += WORD_MS + (/[,.?!]$/.test(w) ? PAUSE_MS : 0);
    });
    timers.push(setTimeout(() => speaking.current?.(false), t));
    t += HOLD_MS;
    timers.push(
      setTimeout(() => {
        Animated.timing(fade, {
          toValue: 0,
          duration: FADE_OUT_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: nativeDriver,
        }).start();
      }, t),
    );
    t += FADE_OUT_MS;
    timers.push(setTimeout(() => setPhrase((p) => (p + 1) % PHRASES.length), t));
    return () => timers.forEach(clearTimeout);
  }, [phrase, fade]);

  return (
    <Animated.View style={[styles.line, { width, opacity: fade }]} pointerEvents="none">
      {/* A frase inteira já ocupa o lugar final desde o início (invisível); cada palavra só
          é revelada na sua posição, então nenhuma empurra as outras. */}
      {words.map((w, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a posição na frase é a identidade da palavra (palavras podem se repetir).
        <Word key={`${phrase}-${i}`} text={w} color={c.text} visible={i < count} />
      ))}
    </Animated.View>
  );
}

function Word({ text, color, visible }: { text: string; color: string; visible: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  const [blur, setBlur] = useState(Platform.OS === 'web' ? 6 : 0);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
    if (Platform.OS !== 'web') return;
    // Desfoque da palavra saindo de 6 px para 0 (só Web; no Android fica só o fade).
    const t0 = Date.now();
    let frame = 0;
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / 420);
      setBlur(6 * (1 - k) ** 2);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [v, visible]);

  return (
    <Animated.Text
      style={[
        styles.word,
        { color },
        Platform.OS === 'web' && blur > 0.05
          ? ({ filter: `blur(${blur.toFixed(2)}px)` } as object)
          : null,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 9,
    rowGap: 2,
    minHeight: 84,
  },
  word: {
    fontFamily: FONT.displayLight,
    fontSize: 30,
    lineHeight: 40,
    letterSpacing: 0.2,
  },
});
