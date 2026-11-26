import { sharedWordPrefix } from '@goclient/core';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import { FONT, nativeDriver, useColors } from '../theme';

/** Falas de exemplo (quando nenhuma fala real é passada, ex.: no Preview). */
const PHRASES = [
  'Só um segundo!',
  'Posso falar para o Adão do Selma que chegamos em 6 minutos?',
  'Enviado!',
];

const WORD_MS = 230; // intervalo entre palavras
const PAUSE_MS = 260; // pausa extra depois de vírgula ou ponto
const HOLD_MS = 1500; // frase completa na tela antes de sumir
const FADE_OUT_MS = 520;
const GAP_MS = 380; // silêncio entre frases

/**
 * Legenda do Lucas: as palavras surgem uma a uma, como se ele estivesse falando, e a frase
 * some antes da próxima. Cada palavra entra com fade, subindo de leve e (na Web) saindo de um
 * pequeno desfoque. `onSpeaking` avisa quando há palavras surgindo, para a nuvem acompanhar.
 */
export function HavenaCaption({
  width,
  text,
  instant,
  onSpeaking,
}: {
  width: number;
  /** Fala atual (real). Sem ela, a legenda mostra as falas de exemplo em ciclo. */
  text?: string;
  /** Fala da pessoa: as palavras aparecem assim que o reconhecimento as ouve. */
  instant?: boolean;
  onSpeaking?: (speaking: boolean) => void;
}) {
  if (text !== undefined)
    return <LiveCaption width={width} text={text} instant={instant} onSpeaking={onSpeaking} />;
  return <DemoCaption width={width} onSpeaking={onSpeaking} />;
}

/**
 * Uma fala real. Quando a frase cresce ("bom" → "bom dia"), as palavras já mostradas ficam
 * paradas e só as novas entram; a frase só recomeça do zero quando é outra. A fala da pessoa
 * (`instant`) aparece no ritmo em que o reconhecimento ouve; a do Lucas surge palavra a
 * palavra, acompanhando a voz.
 */
function LiveCaption({
  width,
  text,
  instant,
  onSpeaking,
}: {
  width: number;
  text: string;
  instant?: boolean;
  onSpeaking?: (speaking: boolean) => void;
}) {
  const c = useColors();
  const [count, setCount] = useState(0);
  const speaking = useRef(onSpeaking);
  speaking.current = onSpeaking;
  const prev = useRef({ text: '', count: 0, phrase: 0 });
  const words = text ? text.split(' ').filter(Boolean) : [];
  // Mesma frase, crescendo: mantém a identidade (chave) das palavras já mostradas.
  const kept = sharedWordPrefix(prev.current.text, text);
  const phrase =
    kept === 0 && text !== prev.current.text ? prev.current.phrase + 1 : prev.current.phrase;
  useEffect(() => {
    const list = text ? text.split(' ').filter(Boolean) : [];
    const keep = Math.min(prev.current.count, sharedWordPrefix(prev.current.text, text));
    prev.current = { text, count: keep, phrase };
    const timers: ReturnType<typeof setTimeout>[] = [];
    setCount(keep);
    if (instant) {
      setCount(list.length);
      prev.current.count = list.length;
      return;
    }
    let t = 60;
    if (list.length > keep) timers.push(setTimeout(() => speaking.current?.(true), t));
    for (let i = keep; i < list.length; i++) {
      const w = list[i] as string;
      timers.push(
        setTimeout(() => {
          setCount(i + 1);
          prev.current.count = i + 1;
        }, t),
      );
      t += Math.min(WORD_MS, 2600 / Math.max(list.length, 1)) + (/[,.?!]$/.test(w) ? 120 : 0);
    }
    timers.push(setTimeout(() => speaking.current?.(false), t));
    return () => timers.forEach(clearTimeout);
  }, [text, instant, phrase]);
  return (
    <Animated.View style={[styles.line, { width }]} pointerEvents="none">
      {words.map((w, i) => (
        <Word
          // biome-ignore lint/suspicious/noArrayIndexKey: a posição na frase é a identidade da palavra.
          key={`${phrase}-${i}`}
          text={w}
          color={c.text}
          visible={instant || i < count}
          fast={instant}
        />
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

/** Fala da pessoa: a palavra entra rápido, sem desfoque, para acompanhar quem está falando. */
const FAST_MS = 140;

function Word({
  text,
  color,
  visible,
  fast,
}: {
  text: string;
  color: string;
  visible: boolean;
  fast?: boolean;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const [blur, setBlur] = useState(Platform.OS === 'web' && !fast ? 6 : 0);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(v, {
      toValue: 1,
      duration: fast ? FAST_MS : 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
    if (Platform.OS !== 'web' || fast) return;
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
  }, [v, visible, fast]);

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
