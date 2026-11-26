import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LucasCloud } from '../havena/cloud';
import { concentric, nativeDriver, useColors } from '../theme';
import { appleEase } from '../ui/motion';
import { Icon, type IconName, Text } from '../ui/primitives';

/**
 * Ilustrações animadas do onboarding (referências: cartões empilhados e demonstração em
 * loop dentro de um quadro arredondado). Cada cena é desenhada numa caixa fixa de
 * 560 × 460 e reduzida por igual para caber no quadro (`SceneFrame`), então funciona no
 * celular em pé e na multimídia sem mudar nada.
 *
 * Bordas concêntricas: os cartões de dentro usam o raio do quadro menos o espaçamento.
 */
export const SCENE_W = 560;
export const SCENE_H = 460;
/** Raio do quadro das cenas e espaçamento até os cartões de dentro. */
export const FRAME_RADIUS = 56;
export const FRAME_PAD = 28;
const CARD_R = concentric(FRAME_RADIUS, FRAME_PAD); // 28
const CARD_PAD = 16;
const AVATAR_R = concentric(CARD_R, CARD_PAD); // 12

/** Sobe/desce de leve sem parar (os cartões "flutuam"). */
function useFloat(phase: number, amplitude = 6, period = 3200) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(phase),
        Animated.timing(v, {
          toValue: 1,
          duration: period / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: period / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, phase, period]);
  return v.interpolate({ inputRange: [0, 1], outputRange: [0, -amplitude] });
}

/** Entrada com mola (sobe e cresce), atrasada por `delay`. */
function useEnter(delay: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(v, {
        toValue: 1,
        damping: 16,
        stiffness: 170,
        useNativeDriver: nativeDriver,
      }),
    ]);
    a.start();
    return () => a.stop();
  }, [v, delay]);
  return v;
}

// ─── 1. Clientes ───────────────────────────────────────────────────────────────────────

const CLIENT_CARDS = [
  {
    initials: 'BA',
    name: 'Boutique Albuquerque',
    sub: 'Visita às 10:30',
    tag: 'R$ 1.240',
    color: '#0A84FF',
    tilt: -4,
  },
  {
    initials: 'SC',
    name: 'Santana Calçados',
    sub: 'Pedido em aberto',
    tag: '12 itens',
    color: '#FF9F0A',
    tilt: 2,
  },
  {
    initials: 'RC',
    name: 'Rocha Concept Store',
    sub: 'Última visita há 9 dias',
    tag: 'Ligar',
    color: '#30D158',
    tilt: -1.5,
  },
];

function ClientCard({ card, index }: { card: (typeof CLIENT_CARDS)[number]; index: number }) {
  const c = useColors();
  const enter = useEnter(140 + index * 140);
  const float = useFloat(index * 420, 7);
  return (
    <Animated.View
      style={[
        styles.clientCard,
        {
          backgroundColor: c.elevated,
          borderColor: c.material.border,
          top: 64 + index * 116,
          left: 14 + (index % 2) * 18,
          opacity: enter,
          transform: [
            { translateY: float },
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            { rotate: `${card.tilt}deg` },
          ],
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: card.color }]}>
        <Text variant="headline" color="#FFFFFF" style={{ fontSize: 26 }}>
          {card.initials}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline" numberOfLines={1} style={{ fontSize: 26, lineHeight: 32 }}>
          {card.name}
        </Text>
        <Text variant="callout" tone="secondary" numberOfLines={1}>
          {card.sub}
        </Text>
      </View>
      <View style={[styles.tag, { backgroundColor: c.fill }]}>
        <Text variant="subhead" tone="accent">
          {card.tag}
        </Text>
      </View>
    </Animated.View>
  );
}

export function ClientsScene() {
  return (
    <View style={styles.box}>
      {CLIENT_CARDS.map((card, i) => (
        <ClientCard key={card.initials} card={card} index={i} />
      ))}
    </View>
  );
}

// ─── 2. Rotas ──────────────────────────────────────────────────────────────────────────

/** Paradas da rota (coordenadas na caixa da cena). */
const STOPS = [
  { x: 92, y: 310 },
  { x: 210, y: 180 },
  { x: 380, y: 240 },
  { x: 470, y: 70 },
];
const ROUTE_D = `M${STOPS.map((p) => `${p.x} ${p.y}`).join(' L')}`;
/** Ruas do fundo (traços retos, sem imagem). */
const STREETS = [
  'M-400 153 L960 30',
  'M-400 340 L960 200',
  'M-400 445 L960 360',
  'M175 -400 L95 860',
  'M290 -400 L340 860',
  'M410 -400 L530 860',
  'M-400 -40 L960 -120',
  'M-400 600 L960 540',
  'M40 -400 L-60 860',
];
/** Margem que o mapa da cena avança para fora da caixa (o quadro recorta). */
const BLEED = 400;

export function RouteScene() {
  const c = useColors();
  // O carro percorre a rota de parada em parada, em loop.
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: STOPS.length - 1,
          duration: 4200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: nativeDriver,
        }),
        Animated.delay(700),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const range = STOPS.map((_, i) => i);
  const carX = t.interpolate({ inputRange: range, outputRange: STOPS.map((p) => p.x - 16) });
  const carY = t.interpolate({ inputRange: range, outputRange: STOPS.map((p) => p.y - 16) });
  const eta = useEnter(900);
  return (
    <View style={[styles.box, { overflow: 'visible' }]}>
      {/* O mapa preenche o quadro inteiro, além da caixa da cena. */}
      <View
        style={{
          position: 'absolute',
          left: -BLEED,
          top: -BLEED,
          right: -BLEED,
          bottom: -BLEED,
          backgroundColor: c.map.ground,
        }}
      />
      <Svg
        width={SCENE_W + BLEED * 2}
        height={SCENE_H + BLEED * 2}
        viewBox={`${-BLEED} ${-BLEED} ${SCENE_W + BLEED * 2} ${SCENE_H + BLEED * 2}`}
        style={{ position: 'absolute', left: -BLEED, top: -BLEED }}
      >
        {STREETS.map((d) => (
          <Path key={d} d={d} stroke={c.map.street} strokeWidth={14} strokeLinecap="round" />
        ))}
        <Path
          d={ROUTE_D}
          stroke={c.map.routeCasing}
          strokeWidth={16}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={ROUTE_D}
          stroke={c.map.route}
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      {STOPS.map((p, i) => (
        <Pin key={`${p.x}-${p.y}`} x={p.x} y={p.y} label={String(i + 1)} delay={200 + i * 160} />
      ))}
      <Animated.View
        style={[styles.car, { transform: [{ translateX: carX }, { translateY: carY }] }]}
      >
        <Icon name="navigate" size={18} color="#FFFFFF" />
      </Animated.View>
      <Animated.View
        style={[
          styles.eta,
          {
            backgroundColor: c.material.fallback,
            borderColor: c.material.border,
            opacity: eta,
            transform: [
              { translateY: eta.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            ],
          },
        ]}
      >
        <Icon name="time" size={28} color={c.accent} />
        <Text variant="headline">4 paradas · 1h12 · 24,6 km</Text>
      </Animated.View>
    </View>
  );
}

function Pin({ x, y, label, delay }: { x: number; y: number; label: string; delay: number }) {
  const c = useColors();
  const v = useEnter(delay);
  return (
    <Animated.View
      style={[
        styles.pin,
        {
          left: x - 22,
          top: y - 22,
          backgroundColor: c.accent,
          opacity: v,
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
        },
      ]}
    >
      <Text variant="subhead" color="#FFFFFF">
        {label}
      </Text>
    </Animated.View>
  );
}

// ─── 3. Voz ────────────────────────────────────────────────────────────────────────────

const LINES: { who: 'user' | 'ai'; text: string }[] = [
  { who: 'user', text: 'Olá, Lucas. Qual o próximo cliente?' },
  { who: 'ai', text: 'Boutique Albuquerque, chegada às 11:58.' },
];

export function VoiceScene() {
  const c = useColors();
  // As falas aparecem uma depois da outra e recomeçam (demonstração em loop).
  const [round, setRound] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRound((r) => r + 1), 5200);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={[styles.box, { alignItems: 'center', justifyContent: 'center' }]}>
      <View>
        <LucasCloud size={168} state="speak" />
      </View>
      <View key={round} style={styles.bubbles}>
        {LINES.map((l, i) => (
          <Bubble key={l.text} who={l.who} delay={300 + i * 1200}>
            <Text
              variant="headline"
              color={l.who === 'user' ? c.onAccent : c.text}
              style={{ fontSize: 25, lineHeight: 31 }}
            >
              {l.text}
            </Text>
          </Bubble>
        ))}
      </View>
    </View>
  );
}

function Bubble({
  who,
  delay,
  children,
}: {
  who: 'user' | 'ai';
  delay: number;
  children: ReactNode;
}) {
  const c = useColors();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, {
        toValue: 1,
        duration: 420,
        easing: appleEase,
        useNativeDriver: nativeDriver,
      }),
    ]);
    a.start();
    return () => a.stop();
  }, [v, delay]);
  const user = who === 'user';
  return (
    <Animated.View
      style={[
        styles.bubble,
        user
          ? { alignSelf: 'flex-end', backgroundColor: c.accent, borderBottomRightRadius: 10 }
          : { alignSelf: 'flex-start', backgroundColor: c.elevated, borderBottomLeftRadius: 10 },
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Permissão (ícone grande com anel pulsando) ─────────────────────────────────────────

/**
 * Ícone da permissão (sem quadro): bloco arredondado como um ícone de app, com dois anéis
 * pulsando em volta. Fica acima do título nas telas de permissão.
 */
export function PermissionHero({ icon }: { icon: IconName }) {
  const c = useColors();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const enter = useEnter(80);
  return (
    <View style={styles.hero}>
      {[0, 1].map((k) => (
        <Animated.View
          key={k}
          style={[
            styles.heroRing,
            {
              borderColor: c.accent,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45 - k * 0.15, 0] }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.45 + k * 0.25],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.heroIcon,
          {
            backgroundColor: c.accent,
            opacity: enter,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
          },
        ]}
      >
        <Icon name={icon} size={72} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

// ─── Quadro ────────────────────────────────────────────────────────────────────────────

/**
 * Quadro arredondado que recebe a cena e a reduz para caber (mantendo a proporção).
 */
export function SceneFrame({ children }: { children: ReactNode }) {
  const c = useColors();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const inner = {
    w: Math.max(size.w - FRAME_PAD * 2, 0),
    h: Math.max(size.h - FRAME_PAD * 2, 0),
  };
  const k = Math.min(inner.w / SCENE_W, inner.h / SCENE_H, 1.4);
  return (
    <View
      style={[styles.frame, { backgroundColor: c.grouped, borderColor: c.material.border }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {k > 0 && (
        <View style={{ width: SCENE_W, height: SCENE_H, transform: [{ scale: k }] }}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: FRAME_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { width: SCENE_W, height: SCENE_H, overflow: 'hidden' },
  clientCard: {
    position: 'absolute',
    width: 514,
    height: 104,
    borderRadius: CARD_R,
    borderWidth: 1,
    padding: CARD_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: AVATAR_R,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { paddingHorizontal: 14, height: 40, borderRadius: 20, justifyContent: 'center' },
  pin: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  car: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0A84FF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eta: {
    position: 'absolute',
    left: CARD_PAD,
    right: CARD_PAD,
    bottom: 0,
    height: 72,
    borderRadius: concentric(CARD_R, CARD_PAD),
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  bubbles: { alignSelf: 'stretch', paddingHorizontal: 24, marginTop: 28, gap: 14 },
  bubble: { maxWidth: 420, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 26 },
  hero: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  heroIcon: {
    width: 132,
    height: 132,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRing: { position: 'absolute', width: 132, height: 132, borderRadius: 34, borderWidth: 2 },
});
