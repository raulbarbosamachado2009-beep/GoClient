import { useRouter } from 'expo-router';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  PanResponder,
  type PanResponderCallbacks,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TAB_BAR_HEIGHT } from '../layout/form-factor';
import { CLIENTS, type MockClient, PRODUCTS, TODAY_ROUTE } from '../mocks/data';
import { useFrameScale } from '../preview/automotive-frame';
import { OutlineGlyph } from '../shell/app-icons';
import { layout, spacing, useColors } from '../theme';
import { Avatar, Blur, Icon, type IconName, Text, Touchable } from '../ui/primitives';

/**
 * Aba puxável do Mapa no celular (referência: Apple Maps). Três alturas: recolhida (só a
 * busca), média e cheia. Arrasta-se pela alça e pelo cabeçalho; ao soltar, para na altura
 * mais próxima (ou na direção do gesto, se for rápido). Na altura cheia o conteúdo rola.
 */
export type Detent = 0 | 1 | 2;

/** Diz se o último gesto na aba foi um arrasto (aí o toque nos botões é ignorado). */
const DraggedContext = createContext<{ current: boolean }>({ current: false });
/** Botão da aba: ignora o toque quando o gesto foi um arrasto da aba. */
function Tap({ onPress, ...rest }: ComponentProps<typeof Touchable>) {
  const dragged = useContext(DraggedContext);
  return (
    <Touchable
      {...rest}
      onPress={onPress ? (e) => (dragged.current ? undefined : onPress(e)) : undefined}
    />
  );
}

const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : null) as object;

export function DragSheet({
  header,
  children,
  initial = 1,
  collapsed = 200,
}: {
  header: ReactNode;
  children: ReactNode;
  initial?: Detent;
  /** Altura recolhida (alça + cabeçalho). */
  collapsed?: number;
}) {
  const c = useColors();
  const [area, setArea] = useState(0);
  const [detent, setDetent] = useState<Detent>(initial);
  const heights = [collapsed, Math.round(area * 0.52), Math.max(area - 36, collapsed)];
  const y = useRef(new Animated.Value(4000)).current;
  const current = useRef(0);
  const scale = useFrameScale();
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const dragged = useRef(false);
  const heightsRef = useRef(heights);
  heightsRef.current = heights;
  const full = heights[2] ?? 0;

  // A aba tem sempre a altura cheia; o deslocamento vertical define quanto aparece.
  const offsetFor = (d: Detent) => full - (heights[d] ?? collapsed);
  const snap = (d: Detent, velocity = 0) => {
    setDetent(d);
    current.current = offsetFor(d);
    Animated.spring(y, {
      toValue: current.current,
      velocity,
      damping: 28,
      stiffness: 260,
      useNativeDriver: false,
    }).start();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reposiciona quando a área é medida
  useEffect(() => {
    if (area > 0) {
      current.current = offsetFor(detent);
      y.setValue(current.current);
    }
  }, [area]);

  const detentRef = useRef(detent);
  detentRef.current = detent;
  const scrollTop = useRef(0);
  const vertical = (g: { dx: number; dy: number }) =>
    Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx);
  const handlers: PanResponderCallbacks = {
    onStartShouldSetPanResponder: () => false,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      dragged.current = true;
      y.stopAnimation((v) => {
        current.current = v;
      });
    },
    onPanResponderMove: (_e, g) => {
      const h = heightsRef.current;
      const max = (h[2] ?? 0) - (h[0] ?? 0);
      const next = current.current + g.dy / scaleRef.current;
      // Passando dos limites, resiste (efeito elástico).
      const clamped = next < 0 ? next / 3 : next > max ? max + (next - max) / 3 : next;
      y.setValue(clamped);
    },
    onPanResponderRelease: (_e, g) => {
      const h = heightsRef.current;
      const fullH = h[2] ?? 0;
      const pos = current.current + g.dy / scaleRef.current;
      const shown = fullH - pos;
      const vy = g.vy / scaleRef.current;
      const order = [0, 1, 2] as Detent[];
      let target: Detent;
      if (vy < -0.6) {
        // Gesto rápido para cima: a próxima altura acima da posição atual.
        target = order.find((d) => (h[d] ?? 0) > shown + 10) ?? 2;
      } else if (vy > 0.6) {
        // Para baixo: a próxima altura abaixo.
        target = [...order].reverse().find((d) => (h[d] ?? 0) < shown - 10) ?? 0;
      } else {
        target = order.reduce((a, b) =>
          Math.abs((h[b] ?? 0) - shown) < Math.abs((h[a] ?? 0) - shown) ? b : a,
        );
      }
      current.current = pos;
      snapRef.current(target, -vy);
      // O toque que encerra o arrasto não deve abrir nada.
      setTimeout(() => {
        dragged.current = false;
      }, 350);
    },
  };
  // Alça e cabeçalho: sempre arrastam a aba (mesmo começando em cima da busca).
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => vertical(g),
      onMoveShouldSetPanResponder: (_e, g) => vertical(g),
      ...handlers,
    }),
  ).current;
  // Conteúdo: arrasta a aba enquanto ela não está cheia; cheia, só quando a lista já está
  // no topo e o gesto é para baixo (como no Apple Maps). Senão, a lista rola.
  const contentPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        vertical(g) && (detentRef.current !== 2 || (g.dy > 0 && scrollTop.current <= 0)),
      onMoveShouldSetPanResponder: () => false,
      ...handlers,
    }),
  ).current;
  const snapRef = useRef(snap);
  snapRef.current = snap;

  const onArea = (e: LayoutChangeEvent) => setArea(Math.round(e.nativeEvent.layout.height));

  return (
    <DraggedContext.Provider value={dragged}>
      <View pointerEvents="box-none" style={styles.area} onLayout={onArea}>
        {area > 0 && (
          <Animated.View
            style={[
              styles.sheet,
              { height: full, borderColor: c.material.border, transform: [{ translateY: y }] },
              // Na web, arrastar não pode selecionar o texto da aba.
              NO_SELECT,
            ]}
          >
            <Blur radius={44} tint={c.material.tint} />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor:
                    c.mode === 'dark' ? 'rgba(30,30,32,0.86)' : 'rgba(246,246,248,0.88)',
                },
              ]}
            />
            <View {...pan.panHandlers}>
              <Touchable
                accessibilityRole="button"
                accessibilityLabel={detent === 2 ? 'Recolher aba' : 'Expandir aba'}
                onPress={() => snap(detent === 2 ? 0 : ((detent + 1) as Detent))}
                style={styles.grabArea}
              >
                <View style={[styles.grabber, { backgroundColor: c.textTertiary }]} />
              </Touchable>
              <View style={styles.header}>{header}</View>
            </View>
            <ScrollView
              scrollEnabled={detent === 2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
              scrollEventThrottle={16}
              onScroll={(e) => {
                scrollTop.current = e.nativeEvent.contentOffset.y;
              }}
              {...contentPan.panHandlers}
            >
              {children}
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </DraggedContext.Provider>
  );
}

// ─── Conteúdo: explorar (nenhum destino escolhido) ──────────────────────────────────────

const RECENT = ['c1', 'c6', 'c3'];

export function ExploreSheet() {
  const c = useColors();
  const router = useRouter();
  const recent = RECENT.map((id) => CLIENTS.find((x) => x.id === id) as MockClient);
  const goTo = (id: string) =>
    router.replace({ pathname: '/mapa', params: { rota: 'cliente', id } });

  return (
    <DragSheet
      initial={0}
      collapsed={146}
      header={
        <View style={styles.searchRow}>
          <Tap
            accessibilityRole="search"
            accessibilityLabel="Buscar cliente ou endereço"
            onPress={() => router.replace('/clientes')}
            style={[styles.search, { backgroundColor: c.fill }]}
          >
            <Icon name="search" size={30} color={c.textSecondary} />
            <Text variant="body" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
              Buscar cliente ou endereço
            </Text>
            <Icon name="mic" size={30} color={c.textSecondary} />
          </Tap>
          <Tap
            accessibilityRole="button"
            accessibilityLabel="Ajustes da conta"
            onPress={() => router.replace('/configuracoes')}
          >
            <Avatar name="Raul Barbosa" size={76} colors={['#8E9BD6', '#6A76B8']} />
          </Tap>
        </View>
      }
    >
      <Section title="Atalhos" />
      <View style={styles.shortcuts}>
        <Shortcut
          label="Clientes"
          sub={`${CLIENTS.length} na carteira`}
          color="#0A84FF"
          icon={<OutlineGlyph glyph="clientes" size={46} color="#FFFFFF" />}
          onPress={() => router.replace('/clientes')}
        />
        <Shortcut
          label="Produtos"
          sub={`${PRODUCTS.length} itens`}
          color="#FF9F0A"
          icon={<OutlineGlyph glyph="produtos" size={46} color="#FFFFFF" />}
          onPress={() => router.replace('/produtos')}
        />
        <Shortcut
          label="Rotas"
          sub="Montar"
          subTone="accent"
          color="#30D158"
          icon={<OutlineGlyph glyph="rotas" size={46} color="#FFFFFF" />}
          onPress={() => router.replace('/rotas')}
        />
      </View>

      <Section title="Recentes" onPress={() => router.replace('/clientes')} />
      <View style={[styles.card, { backgroundColor: c.fill }]}>
        {recent.map((x, i) => (
          <View key={x.id}>
            {i > 0 && <View style={[styles.sep, { backgroundColor: c.separator }]} />}
            <Tap
              accessibilityRole="button"
              onPress={() => goTo(x.id)}
              scaleTo={0.98}
              style={styles.recent}
            >
              <View style={[styles.pin, { backgroundColor: '#FF375F' }]}>
                <Icon name="location" size={30} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline" numberOfLines={1}>
                  {x.tradeName}
                </Text>
                <Text variant="callout" tone="secondary" numberOfLines={1}>
                  {x.address} · {x.district.split(' · ').slice(1).join(' · ')}
                </Text>
              </View>
              <Icon name="ellipsis-horizontal" size={36} color={c.text} />
            </Tap>
          </View>
        ))}
      </View>

      <Section title="Rota de hoje" onPress={() => router.replace('/rotas')} />
      <Tap
        accessibilityRole="button"
        onPress={() => router.replace({ pathname: '/mapa', params: { rota: 'dia' } })}
        scaleTo={0.98}
        style={[styles.guide, { backgroundColor: c.fill }]}
      >
        <View style={[styles.guideArt, { backgroundColor: '#0A84FF' }]}>
          <OutlineGlyph glyph="rotas" size={64} color="#FFFFFF" />
        </View>
        <Text variant="title2">Visitas de hoje</Text>
        <Text variant="callout" tone="secondary">
          {TODAY_ROUTE.length} clientes · toque para traçar
        </Text>
      </Tap>

      <WideAction
        icon="trail-sign"
        label="Montar rota do dia"
        onPress={() => router.replace('/rotas')}
      />
      <WideAction icon="share-outline" label="Compartilhar localização" />
    </DragSheet>
  );
}

// ─── Conteúdo: destino escolhido (cliente ou rota do dia) ───────────────────────────────

export interface TripInfo {
  arrival: string;
  duration: { value: string; unit: string };
  km: string;
}

export function RouteSheet({
  client,
  stopLabel,
  trip,
  onNext,
  onPrevious,
  onNavigate,
  onEnd,
}: {
  client: MockClient;
  stopLabel?: string;
  trip: TripInfo;
  onNext?: () => void;
  onPrevious?: () => void;
  onNavigate: () => void;
  onEnd: () => void;
}) {
  const c = useColors();
  const active = client.status === 'Ativo';
  return (
    <DragSheet
      key={client.id}
      initial={1}
      collapsed={338}
      header={
        <View style={{ gap: spacing[5] }}>
          <View style={styles.titleRow}>
            <Avatar name={client.name} size={80} square />
            <View style={{ flex: 1 }}>
              <Text variant="title2" numberOfLines={1}>
                {client.tradeName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <View
                  style={[styles.dot, { backgroundColor: active ? c.success : c.textTertiary }]}
                />
                <Text variant="callout" tone="secondary" numberOfLines={1}>
                  {stopLabel ? `${stopLabel} · ` : ''}
                  {client.name}
                </Text>
              </View>
            </View>
            <Tap
              accessibilityRole="button"
              accessibilityLabel="Encerrar rota"
              onPress={onEnd}
              style={[styles.close, { backgroundColor: c.fill }]}
            >
              <Icon name="close" size={30} color={c.textSecondary} />
            </Tap>
          </View>

          <View style={styles.stats}>
            <Stat value={trip.arrival} label="chegada" />
            <Stat value={trip.duration.value} label={trip.duration.unit} />
            <Stat value={trip.km} label="km" />
          </View>

          <View style={styles.actions}>
            {onPrevious && (
              <SquareButton icon="chevron-back" label="Cliente anterior" onPress={onPrevious} />
            )}
            <Tap
              accessibilityRole="button"
              onPress={onNavigate}
              scaleTo={0.97}
              style={[styles.go, { backgroundColor: c.accent }]}
            >
              <Icon name="navigate" size={34} color="#FFFFFF" />
              <Text variant="headline" color="#FFFFFF">
                Navegar
              </Text>
            </Tap>
            {onNext && (
              <SquareButton icon="chevron-forward" label="Próximo cliente" onPress={onNext} />
            )}
          </View>
        </View>
      }
    >
      <View style={styles.quickRow}>
        <Quick icon="call" label="Ligar" />
        <Quick icon="logo-whatsapp" label="WhatsApp" />
        <Quick icon="document-text" label="Pedido" />
        <Quick icon="storefront" label="Ficha" />
      </View>

      <Section title="Pedido" />
      <View
        style={[styles.card, { backgroundColor: c.fill, padding: spacing[6], gap: spacing[2] }]}
      >
        {client.order.map((line) => (
          <Text key={line} variant="body">
            {line}
          </Text>
        ))}
      </View>

      <Section title="Detalhes" />
      <View style={[styles.card, { backgroundColor: c.fill }]}>
        <Detail label="Endereço" value={`${client.address}\n${client.district}`} />
        <View style={[styles.sep, { backgroundColor: c.separator }]} />
        <Detail label="Telefone" value={client.phone} tone="accent" />
        <View style={[styles.sep, { backgroundColor: c.separator }]} />
        <Detail label="Última visita" value={client.lastVisit} />
      </View>
    </DragSheet>
  );
}

// ─── Peças ──────────────────────────────────────────────────────────────────────────────

function Section({ title, onPress }: { title: string; onPress?: () => void }) {
  const c = useColors();
  return (
    <Tap accessibilityRole="header" onPress={onPress} disabled={!onPress} style={styles.section}>
      <Text variant="title2" style={{ fontSize: 36, lineHeight: 44 }}>
        {title}
      </Text>
      {onPress && <Icon name="chevron-forward" size={32} color={c.textSecondary} />}
    </Tap>
  );
}

function Shortcut({
  label,
  sub,
  subTone,
  color,
  icon,
  onPress,
}: {
  label: string;
  sub: string;
  subTone?: 'accent';
  color: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Tap accessibilityRole="button" onPress={onPress} scaleTo={0.94} style={styles.shortcut}>
      <View style={[styles.circle, { backgroundColor: color }]}>{icon}</View>
      <Text variant="headline" numberOfLines={1}>
        {label}
      </Text>
      <Text
        variant="callout"
        tone={subTone === 'accent' ? 'accent' : 'secondary'}
        numberOfLines={1}
      >
        {sub}
      </Text>
    </Tap>
  );
}

function WideAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
}) {
  const c = useColors();
  return (
    <Tap
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.98}
      style={[styles.wide, { backgroundColor: c.mode === 'dark' ? '#13243A' : '#E3EEFC' }]}
    >
      <Icon name={icon} size={36} color={c.accent} />
      <Text variant="headline" tone="accent" style={{ flex: 1, textAlign: 'center' }}>
        {label}
      </Text>
      <View style={{ width: 44 }} />
    </Tap>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text variant="largeTitle" style={{ fontSize: 40, lineHeight: 46 }}>
        {value}
      </Text>
      <Text variant="callout" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

function SquareButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.square, { backgroundColor: c.fill }]}
    >
      <Icon name={icon} size={38} />
    </Tap>
  );
}

function Quick({ icon, label }: { icon: IconName; label: string }) {
  const c = useColors();
  return (
    <Tap accessibilityRole="button" style={[styles.quick, { backgroundColor: c.fill }]}>
      <Icon name={icon} size={34} color={c.accent} />
      <Text variant="caption" tone="accent">
        {label}
      </Text>
    </Tap>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: 'accent' }) {
  return (
    <View style={styles.detail}>
      <Text variant="callout" tone="secondary">
        {label}
      </Text>
      <Text variant="body" tone={tone}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: TAB_BAR_HEIGHT,
    justifyContent: 'flex-end',
    // O que passa da altura visível não aparece atrás da barra de abas.
    overflow: 'hidden',
  },
  sheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  grabArea: { height: 36, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 72, height: 8, borderRadius: 4, opacity: 0.6 },
  header: { paddingHorizontal: 28, paddingBottom: spacing[5] },
  content: { paddingHorizontal: 28, paddingBottom: 120, gap: spacing[4] },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  search: {
    flex: 1,
    height: 80,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[5],
    alignSelf: 'flex-start',
  },
  shortcuts: { flexDirection: 'row', gap: spacing[6] },
  shortcut: { alignItems: 'center', gap: 2, width: 140 },
  circle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  card: { borderRadius: 28, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 108 },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
  },
  pin: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  guide: { width: 280, borderRadius: 28, padding: spacing[4], gap: 2 },
  guideArt: {
    height: 140,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  wide: {
    height: 84,
    borderRadius: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    marginTop: spacing[3],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
  dot: { width: 18, height: 18, borderRadius: 9 },
  close: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: spacing[10] },
  actions: { flexDirection: 'row', gap: spacing[3] },
  go: {
    flex: 1,
    height: 88,
    borderRadius: layout.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  square: {
    width: 88,
    height: 88,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: { flexDirection: 'row', gap: spacing[3] },
  quick: {
    flex: 1,
    height: 96,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  detail: { paddingVertical: spacing[4], paddingHorizontal: spacing[6], gap: 2 },
});
