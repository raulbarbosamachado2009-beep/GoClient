import { composeArrivalMessage, roundArrivalMinutes } from '@goclient/core';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { composeWhatsApp } from '../integrations/contact';
import { useTabBarSpace } from '../layout/form-factor';
import type { MockClient } from '../mocks/data';
import { concentric, spacing, useColors } from '../theme';
import { appleEase } from '../ui/motion';
import { Avatar, Blur, Icon, Text, Touchable } from '../ui/primitives';

/**
 * Cartão do cliente durante a navegação (celular). Pedido do usuário (27/11):
 *
 * - Um botão só para encerrar (antes havia "Encerrar navegação" e um "×" com a mesma função).
 * - Começa com o botão vermelho largo; 2 s depois o cartão se recolhe: o botão vira um
 *   quadrado arredondado com "×" à direita e, à esquerda, ficam a foto, o nome e o endereço.
 * - Tocar (ou arrastar para cima) em qualquer lugar do cartão, menos no "×", abre o tamanho
 *   médio (região e WhatsApp); de novo, o grande (pedido e detalhes). Mais um toque, ou
 *   arrastar para baixo, recolhe.
 * - O ícone do WhatsApp abre a conversa do cliente no WhatsApp do app com a mensagem de
 *   "estamos chegando" já escrita (o envio é sempre o toque da pessoa).
 *
 * Bordas concêntricas: cartão 52 de raio com 20 de margem → peças de dentro com 32.
 * 27/11 (2ª rodada): o mesmo cartão, só mais baixo, para sobrar mapa.
 */
const R = 52;
const PAD = 20;
const INNER = concentric(R, PAD);
/** Altura da linha de cima (foto, nome, endereço e o "×"). */
const ROW = 84;
const GAP = spacing[5];
const COLLAPSE_AFTER = 2000;

type Level = 0 | 1 | 2;

export function NavCard({
  client,
  stopLabel,
  secondsToArrive,
  onStop,
}: {
  client: MockClient;
  stopLabel?: string;
  /** Tempo até o cliente (para a mensagem de WhatsApp dizer em quantos minutos chegamos). */
  secondsToArrive: number | null;
  /** Encerra a navegação (o único botão de cancelar do cartão). */
  onStop: () => void;
}) {
  const c = useColors();
  const router = useRouter();
  const bottom = useTabBarSpace() + 12;
  const [width, setWidth] = useState(0);
  const [level, setLevel] = useState<Level>(0);
  const [collapsed, setCollapsed] = useState(false);
  const [midH, setMidH] = useState(0);
  const [bigH, setBigH] = useState(0);
  // 0 = botão vermelho largo embaixo; 1 = recolhido no quadrado com "×".
  const p = useRef(new Animated.Value(0)).current;
  const h = useRef(new Animated.Value(PAD * 2 + ROW * 2 + GAP)).current;

  const collapse = () => {
    if (collapsed) return;
    setCollapsed(true);
    Animated.timing(p, {
      toValue: 1,
      duration: 620,
      easing: appleEase,
      useNativeDriver: false,
    }).start();
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: só ao começar a navegação
  useEffect(() => {
    const t = setTimeout(collapse, COLLAPSE_AFTER);
    return () => clearTimeout(t);
  }, []);

  const introH = PAD * 2 + ROW * 2 + GAP;
  const miniH = PAD * 2 + ROW;
  const target = !collapsed
    ? introH
    : miniH + (level >= 1 ? GAP + midH : 0) + (level >= 2 ? bigH : 0);
  useEffect(() => {
    Animated.timing(h, {
      toValue: target,
      duration: 520,
      easing: Easing.bezier(0.2, 0.9, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [target, h]);

  // As partes do médio e do grande só aparecem quando o cartão chega nelas (fade).
  const midO = useRef(new Animated.Value(0)).current;
  const bigO = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fade = (v: Animated.Value, on: boolean) =>
      Animated.timing(v, {
        toValue: on ? 1 : 0,
        duration: on ? 420 : 200,
        delay: on ? 120 : 0,
        useNativeDriver: false,
      });
    Animated.parallel([
      fade(midO, collapsed && level >= 1),
      fade(bigO, collapsed && level >= 2),
    ]).start();
  }, [collapsed, level, midO, bigO]);

  const levelRef = useRef(level);
  levelRef.current = level;
  const go = (dir: 1 | -1 | 0) => {
    collapse();
    const cur = levelRef.current;
    const next = dir === 0 ? (cur === 2 ? 0 : cur + 1) : Math.min(2, Math.max(0, cur + dir));
    setLevel(next as Level);
  };
  const goRef = useRef(go);
  goRef.current = go;
  // Toque ou gesto em qualquer canto do cartão (o "×" e o WhatsApp respondem antes).
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 || Math.abs(g.dx) > 8,
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -24) goRef.current(1);
        else if (g.dy > 24) goRef.current(-1);
        else goRef.current(0);
      },
    }),
  ).current;

  const inner = Math.max(width - PAD * 2, 1);
  const btnTop = p.interpolate({ inputRange: [0, 1], outputRange: [PAD + ROW + GAP, PAD] });
  const btnLeft = p.interpolate({ inputRange: [0, 1], outputRange: [PAD, PAD + inner - ROW] });
  const btnW = p.interpolate({ inputRange: [0, 1], outputRange: [inner, ROW] });
  const labelO = p.interpolate({
    inputRange: [0, 0.35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const xO = p.interpolate({ inputRange: [0.45, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const blurO = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const webBlur =
    Platform.OS === 'web'
      ? {
          filter: p.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['blur(0px)', 'blur(4px)', 'blur(0px)'],
          }),
        }
      : null;

  const tile = c.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.75)';
  const district = client.district.split(' · ')[0] ?? '';
  const whatsapp = () => {
    if (!client.phone) return;
    composeWhatsApp(
      {
        to: client.name.split(' ')[0] ?? client.name,
        phone: client.phone,
        text: composeArrivalMessage({
          name: client.name,
          minutes: secondsToArrive != null ? roundArrivalMinutes(secondsToArrive) : undefined,
        }),
      },
      router,
    );
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        {...pan.panHandlers}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          styles.card,
          { bottom, height: h, borderColor: c.material.border },
          Platform.OS === 'web' ? ({ cursor: 'pointer', userSelect: 'none' } as object) : null,
        ]}
      >
        <Blur radius={44} tint={c.material.tint} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.material.fallback }]} />

        {/* Foto, nome e endereço (subtítulo). Reserva o lugar do quadrado com "×". */}
        <View style={[styles.row, { paddingRight: ROW + spacing[4] }]}>
          <Avatar name={client.name} size={ROW} radius={INNER} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text variant="title2" numberOfLines={1} style={TYPE.name}>
              {client.tradeName || client.name}
            </Text>
            <Text variant="callout" tone="secondary" numberOfLines={1} style={TYPE.sub}>
              {client.address}
            </Text>
          </View>
        </View>

        {/* Médio: região, parada e WhatsApp. */}
        <Animated.View
          pointerEvents={collapsed && level >= 1 ? 'box-none' : 'none'}
          style={[styles.section, { top: PAD + ROW + GAP, opacity: midO }]}
          onLayout={(e) => setMidH(e.nativeEvent.layout.height)}
        >
          <View style={styles.midRow}>
            <View style={[styles.pill, { backgroundColor: tile }]}>
              <Icon name="location" size={30} color={c.accent} />
              <Text variant="headline" numberOfLines={1} style={TYPE.pill}>
                {client.region}
                {district && district !== client.region ? ` · ${district}` : ''}
              </Text>
            </View>
            {client.phone ? (
              <Touchable
                accessibilityRole="button"
                accessibilityLabel={`Avisar ${client.name} pelo WhatsApp`}
                onPress={whatsapp}
                style={[styles.wa, { backgroundColor: '#25D366' }]}
              >
                <Icon name="logo-whatsapp" size={44} color="#FFFFFF" />
              </Touchable>
            ) : null}
          </View>
          {stopLabel ? (
            <Text variant="callout" tone="secondary" style={TYPE.sub}>
              {stopLabel} · {client.name}
            </Text>
          ) : (
            <Text variant="callout" tone="secondary" style={TYPE.sub}>
              {client.name}
            </Text>
          )}
        </Animated.View>

        {/* Grande: pedido e detalhes. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.section, { top: PAD + ROW + GAP + midH, opacity: bigO }]}
          onLayout={(e) => setBigH(e.nativeEvent.layout.height)}
        >
          <View style={{ height: GAP }} />
          <View style={[styles.box, { backgroundColor: tile }]}>
            <Text variant="headline" style={TYPE.label}>
              Pedido
            </Text>
            {client.order.length ? (
              client.order.map((line) => (
                <Text key={line} variant="body" style={TYPE.body}>
                  {line}
                </Text>
              ))
            ) : (
              <Text variant="body" tone="secondary" style={TYPE.body}>
                Sem pedido em aberto
              </Text>
            )}
          </View>
          <View style={[styles.box, { backgroundColor: tile, marginTop: spacing[3] }]}>
            <Text variant="headline" style={TYPE.label}>
              Endereço
            </Text>
            <Text variant="body" style={TYPE.body}>
              {[client.address, client.district].filter(Boolean).join('\n')}
            </Text>
          </View>
        </Animated.View>

        {/* O único botão de encerrar: largo no começo, depois um quadrado com "×". */}
        <Animated.View
          style={[styles.stop, { top: btnTop, left: btnLeft, width: btnW, height: ROW }]}
        >
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Encerrar navegação"
            onPress={onStop}
            sound
            scaleTo={0.95}
            style={[styles.stopInner, { backgroundColor: c.danger }]}
          >
            <Animated.View style={[styles.stopRow, { opacity: labelO }, webBlur as object]}>
              <Icon name="stop-circle" size={38} color="#FFFFFF" />
              <Text variant="headline" color="#FFFFFF" numberOfLines={1} style={TYPE.button}>
                Encerrar navegação
              </Text>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: xO }]}>
              <Icon name="close" size={44} color="#FFFFFF" />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { opacity: blurO }]}
            >
              <Blur radius={10} tint={c.material.tint} />
            </Animated.View>
          </Touchable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const TYPE = StyleSheet.create({
  name: { fontSize: 32, lineHeight: 38 },
  sub: { fontSize: 25, lineHeight: 31 },
  pill: { fontSize: 28, lineHeight: 34, flexShrink: 1 },
  label: { fontSize: 25, lineHeight: 31, opacity: 0.6 },
  body: { fontSize: 30, lineHeight: 38 },
  button: { fontSize: 31, lineHeight: 38 },
});

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: R,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    right: PAD,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  section: { position: 'absolute', left: PAD, right: PAD, gap: spacing[3] },
  midRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  pill: {
    flex: 1,
    height: 88,
    borderRadius: INNER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
  },
  wa: {
    width: 88,
    height: 88,
    borderRadius: INNER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { borderRadius: INNER, padding: spacing[5], gap: 4 },
  stop: { position: 'absolute' },
  stopInner: { flex: 1, borderRadius: INNER, overflow: 'hidden' },
  stopRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  center: { alignItems: 'center', justifyContent: 'center' },
});
