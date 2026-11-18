import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { layout, nativeDriver, spacing, useColors } from '../theme';
import { Appear, useTween } from '../ui/motion';
import { Icon, IconButton, Material, Text, Touchable } from '../ui/primitives';
import { HavenaOrb, type OrbState } from './orb';

const DURATION = 380;
const PANEL_WIDTH = 540;

interface Message {
  id: number;
  from: 'user' | 'havena';
  text: string;
}

/** Perguntas de exemplo e respostas fixas do protótipo (nada é processado de verdade). */
const SUGGESTIONS: { label: string; answer: string }[] = [
  {
    label: 'Qual o próximo cliente?',
    answer:
      'Marina Albuquerque, da Boutique Albuquerque, na Rua Barão de Jaguara. Fica a 12 minutos daqui.',
  },
  {
    label: 'Quanto vendi este mês?',
    answer: 'R$ 38.460,00 em 14 pedidos. É 12% a mais que no mesmo período do mês passado.',
  },
  {
    label: 'Montar rota do dia',
    answer: 'Separei 6 clientes da região Centro. A rota leva cerca de 3 h 40 min com as paradas.',
  },
  {
    label: 'Tocar minhas curtidas',
    answer: 'Tocando Músicas Curtidas no Spotify, começando por "Isolado no Quarto".',
  },
];

const STATE_LABEL: Record<OrbState, string> = {
  idle: 'Escolha uma sugestão',
  listen: 'Ouvindo…',
  think: 'Pensando…',
  speak: 'Respondendo',
};

/**
 * Balão da Havena, aberto pelo orbe da barra lateral. Entra pela direita e, atrás dele, o
 * desfoque nasce na borda direita e esvanece em direção à esquerda. Protótipo de design:
 * as respostas são fixas e não há comando de voz.
 */
export function HavenaPanel({ onClose }: { onClose: () => void }) {
  const c = useColors();
  const [open, setOpen] = useState(true);
  const progress = useTween(open ? 1 : 0, DURATION);
  const slide = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const [state, setState] = useState<OrbState>('listen');
  const [messages, setMessages] = useState<Message[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scroll = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);

  useEffect(() => {
    Animated.spring(slide, {
      toValue: 1,
      damping: 26,
      stiffness: 220,
      useNativeDriver: nativeDriver,
    }).start();
    // Abre "ouvindo" e, sem voz neste protótipo, volta ao repouso logo depois.
    timers.current.push(setTimeout(() => setState('idle'), 1800));
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [slide]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setOpen(false);
    Animated.timing(slide, {
      toValue: 0,
      duration: DURATION - 40,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start(onClose);
  }, [slide, onClose]);

  const ask = (s: (typeof SUGGESTIONS)[number]) => {
    if (state === 'think' || state === 'speak') return;
    const id = Date.now();
    setMessages((m) => [...m, { id, from: 'user', text: s.label }]);
    setState('think');
    timers.current.push(
      setTimeout(() => {
        setMessages((m) => [...m, { id: id + 1, from: 'havena', text: s.answer }]);
        setState('speak');
      }, 1300),
      setTimeout(() => setState('idle'), 3900),
    );
  };

  const asked = new Set(messages.filter((m) => m.from === 'user').map((m) => m.text));
  const remaining = SUGGESTIONS.filter((s) => !asked.has(s.label));
  const talking = messages.length > 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Fechar Havena"
        onPress={close}
        style={StyleSheet.absoluteFill}
      />
      <FadingBlur progress={progress} />

      <Animated.View
        style={[
          styles.panelWrap,
          {
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [PANEL_WIDTH + 60, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Material style={styles.panel} radius={50}>
          <View style={styles.header}>
            <Text variant="headline">Havena</Text>
            <IconButton icon="close" variant="gray" size={60} iconSize={28} onPress={close} />
          </View>

          <View style={[styles.hero, talking && styles.heroCompact]}>
            <HavenaOrb size={talking ? 104 : 168} state={state} />
            <Text variant="subhead" tone="secondary" style={{ marginTop: spacing[4] }}>
              {STATE_LABEL[state]}
            </Text>
          </View>

          <ScrollView
            ref={scroll as never}
            style={{ flex: 1 }}
            contentContainerStyle={styles.thread}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          >
            {!talking && (
              <Appear delay={120}>
                <Text variant="title" style={{ textAlign: 'center' }}>
                  Oi, Raul.
                </Text>
                <Text
                  variant="body"
                  tone="secondary"
                  style={{ textAlign: 'center', marginTop: spacing[2] }}
                >
                  Pergunte sobre clientes, pedidos, rotas ou música.
                </Text>
              </Appear>
            )}
            {messages.map((m) => (
              <Appear key={m.id} distance={10}>
                <View
                  style={[
                    styles.bubble,
                    m.from === 'user'
                      ? [styles.userBubble, { backgroundColor: c.accent }]
                      : [styles.havenaBubble, { backgroundColor: c.fill }],
                  ]}
                >
                  <Text variant="callout" style={m.from === 'user' ? { color: '#FFFFFF' } : null}>
                    {m.text}
                  </Text>
                </View>
              </Appear>
            ))}
          </ScrollView>

          {remaining.length > 0 && (
            <View style={styles.suggestions}>
              {remaining.map((s, i) => (
                <Appear key={s.label} delay={160 + i * 50} distance={10}>
                  <Touchable
                    accessibilityRole="button"
                    onPress={() => ask(s)}
                    scaleTo={0.96}
                    style={[styles.suggestion, { backgroundColor: c.fill }]}
                  >
                    <Text variant="callout">{s.label}</Text>
                    <Icon name="arrow-up-circle" size={28} color={c.accent} />
                  </Touchable>
                </Appear>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <Icon name="mic-off" size={18} color={c.textTertiary} />
            <Text variant="footnote" tone="tertiary">
              Comando de voz chega numa próxima fase
            </Text>
          </View>
        </Material>
      </Animated.View>
    </View>
  );
}

/**
 * Desfoque que nasce na borda direita e some em direção à esquerda.
 * Web: um único `backdrop-filter` recortado por uma máscara em degradê.
 * Android/iOS: faixas de desfoque sobrepostas, cada vez mais estreitas, que somam mais
 * desfoque perto da borda direita (o BlurView não aceita máscara em degradê).
 */
function FadingBlur({ progress }: { progress: number }) {
  const c = useColors();
  const dark = c.mode === 'dark';
  const shade = dark ? `rgba(0,0,0,${0.5 * progress})` : `rgba(210,210,218,${0.5 * progress})`;

  return (
    <View pointerEvents="none" style={styles.fadeRegion}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backdropFilter: `blur(${(36 * progress).toFixed(1)}px) saturate(${100 + 40 * progress}%)`,
              WebkitBackdropFilter: `blur(${(36 * progress).toFixed(1)}px)`,
              maskImage: 'linear-gradient(to left, #000 0%, #000 38%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to left, #000 0%, #000 38%, transparent 100%)',
            } as object,
          ]}
        />
      ) : (
        [1, 0.78, 0.58, 0.4].map((w) => (
          <BlurView
            key={w}
            tint={dark ? 'dark' : 'light'}
            intensity={22 * progress}
            experimentalBlurMethod="dimezisBlurView"
            style={[styles.band, { width: `${w * 100}%` }]}
          />
        ))
      )}
      <LinearGradient
        colors={['transparent', shade]}
        locations={[0, 0.75]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fadeRegion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '68%',
  },
  band: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  panelWrap: {
    position: 'absolute',
    top: layout.gutter,
    bottom: layout.gutter,
    right: layout.gutter,
    width: PANEL_WIDTH,
  },
  panel: {
    flex: 1,
    borderRadius: 44,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', paddingTop: spacing[6], paddingBottom: spacing[6] },
  heroCompact: { paddingTop: spacing[2], paddingBottom: spacing[4] },
  thread: { gap: spacing[3], paddingBottom: spacing[4] },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: 26,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 8 },
  havenaBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 8 },
  suggestions: { gap: spacing[2], paddingTop: spacing[2] },
  suggestion: {
    minHeight: layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    borderRadius: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingTop: spacing[4],
  },
});
