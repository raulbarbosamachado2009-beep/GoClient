import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
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

/**
 * Rota do dia como um cartão (pedido de 26/11/2026: o "mapa" desenhado ficou ruim). Mesmo
 * estilo dos cartões da cena de clientes: a lista de paradas com horário, ligadas por uma
 * linha; um marcador percorre a linha e cada parada alcançada fica azul com ✓. Embaixo, o
 * resumo da rota. Nomes fictícios.
 */
const ROUTE_STOPS = [
  { name: 'Barbearia do Zé', time: '09:30' },
  { name: 'Studio Navalha', time: '10:15' },
  { name: 'Corte Fino', time: '11:00' },
  { name: 'Barbearia Central', time: '11:58' },
];
const ROUTE_CARD = { top: 18, h: 336 };
const ROUTE_HEAD = 76;
const ROUTE_ROW = 62;
const NODE = 40;
/** Centro horizontal dos números (dentro do cartão). */
const NODE_X = CARD_PAD + 8 + NODE / 2;
const rowY = (i: number) => ROUTE_HEAD + i * ROUTE_ROW + ROUTE_ROW / 2;

export function RouteScene() {
  const c = useColors();
  const card = useEnter(100);
  const float = useFloat(0, 5, 3600);
  const eta = useEnter(700);
  // O marcador anda de parada em parada, para um pouco em cada uma, e recomeça.
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const legs = ROUTE_STOPS.slice(1).map((_, i) =>
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(t, {
          toValue: i + 1,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: nativeDriver,
        }),
      ]),
    );
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        ...legs,
        Animated.delay(1400),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const range = ROUTE_STOPS.map((_, i) => i);
  const first = rowY(0);
  const span = rowY(ROUTE_STOPS.length - 1) - first;
  return (
    <View style={styles.box}>
      <Animated.View
        style={[
          styles.routeCard,
          {
            backgroundColor: c.elevated,
            borderColor: c.material.border,
            opacity: card,
            transform: [
              { translateY: float },
              { translateY: card.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
              { scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}
      >
        <View style={styles.routeHead}>
          <Text variant="headline" style={{ fontSize: 28, lineHeight: 34 }}>
            Rota de hoje
          </Text>
          <View style={[styles.tag, { backgroundColor: c.fill }]}>
            <Text variant="subhead" tone="accent">
              {ROUTE_STOPS.length} paradas
            </Text>
          </View>
        </View>
        {/* Linha entre as paradas: cinza por baixo, azul crescendo com o marcador. */}
        <View
          style={[
            styles.routeLine,
            { top: first, height: span, left: NODE_X - 2, backgroundColor: c.fill },
          ]}
        />
        <Animated.View
          style={[
            styles.routeLine,
            {
              top: first,
              height: span,
              left: NODE_X - 2,
              backgroundColor: c.accent,
              transformOrigin: 'top',
              transform: [
                {
                  scaleY: t.interpolate({
                    inputRange: [0, ROUTE_STOPS.length - 1],
                    outputRange: [0.0001, 1],
                  }),
                },
              ],
            },
          ]}
        />
        {ROUTE_STOPS.map((stop, i) => {
          // Alcançada: o número vira ✓ em azul.
          const on = t.interpolate({
            inputRange: [i - 0.15, i],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });
          return (
            <View key={stop.name} style={[styles.routeRow, { top: rowY(i) - ROUTE_ROW / 2 }]}>
              <View style={[styles.node, { backgroundColor: c.grouped, borderColor: c.fill }]}>
                <Text variant="subhead" tone="secondary">
                  {i + 1}
                </Text>
                <Animated.View style={[styles.nodeOn, { backgroundColor: c.accent, opacity: on }]}>
                  <Icon name="checkmark" size={24} color="#FFFFFF" />
                </Animated.View>
              </View>
              <Text variant="headline" numberOfLines={1} style={styles.routeName}>
                {stop.name}
              </Text>
              <Text variant="callout" tone="secondary">
                {stop.time}
              </Text>
            </View>
          );
        })}
        {/* Marcador (o carro) andando pela linha. */}
        <Animated.View
          style={[
            styles.marker,
            {
              left: NODE_X - 14,
              top: first - 14,
              transform: [
                {
                  translateY: t.interpolate({
                    inputRange: range,
                    outputRange: range.map((i) => rowY(i) - first),
                  }),
                },
              ],
            },
          ]}
        >
          <Icon name="navigate" size={14} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[
          styles.eta,
          {
            backgroundColor: c.elevated,
            borderColor: c.material.border,
            opacity: eta,
            transform: [
              { translateY: eta.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            ],
          },
        ]}
      >
        <Icon name="time" size={28} color={c.accent} />
        <Text variant="headline">1h12 de viagem · 24,6 km</Text>
      </Animated.View>
    </View>
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
  routeCard: {
    position: 'absolute',
    left: 23,
    width: 514,
    top: ROUTE_CARD.top,
    height: ROUTE_CARD.h,
    borderRadius: CARD_R,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  routeHead: {
    height: ROUTE_HEAD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: CARD_PAD + 8,
  },
  routeLine: { position: 'absolute', width: 4, borderRadius: 2 },
  routeRow: {
    position: 'absolute',
    left: CARD_PAD + 8,
    right: CARD_PAD + 8,
    height: ROUTE_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  routeName: { flex: 1, fontSize: 26, lineHeight: 32 },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nodeOn: {
    position: 'absolute',
    left: -2,
    top: -2,
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
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
