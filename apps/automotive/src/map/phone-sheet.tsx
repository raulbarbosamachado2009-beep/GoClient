import { useRouter } from 'expo-router';
import {
  type ComponentProps,
  type ComponentRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Keyboard,
  PanResponder,
  type PanResponderCallbacks,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { callPhone, openWhatsApp } from '../integrations/contact';
import { kyteAgent, kyteAgentAvailable, kyteLogged } from '../kyte/agent';
import { customerAddress, findCustomer, useKyteList } from '../kyte/store';
import { TAB_BAR_HEIGHT, useSystemInsets, useTabBarSpace } from '../layout/form-factor';
import { CLIENTS, type MockClient, REGIONS, TODAY_ROUTE } from '../mocks/data';
import { useFrameScale } from '../preview/automotive-frame';
import { layout, spacing, useColors } from '../theme';
import { Avatar, Icon, type IconName, Text, Touchable } from '../ui/primitives';
import { useStops } from './stops';

/**
 * Aba puxável do Mapa no celular (referência: Apple Maps). Três alturas: recolhida (só a
 * busca), média e cheia. Arrasta-se pela alça e pelo cabeçalho; ao soltar, para na altura
 * mais próxima (ou na direção do gesto, se for rápido). Na altura cheia o conteúdo rola.
 */
export type Detent = 0 | 1 | 2;
export type SheetController = { snap: (d: Detent) => void };

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
/** No navegador, põe a aba numa camada própria da GPU (o deslocamento não repinta o mapa). */
const WEB = Platform.OS === 'web';
/** Mola da aba (quase crítica, resposta de ~0,45 s, como a do Apple Maps). */
const SPRING = { stiffness: 190, damping: 26 };
/** Navegador: a lista não "estica" além do fim (a rolagem elástica descolava o conteúdo). */
const OVERSCROLL = { overscrollBehavior: 'contain' } as object;
/** Margem do conteúdo até a borda da tela (fixa: o conteúdo nunca muda de largura). */
const CONTENT_INSET = 20;
const WILL_MOVE = (Platform.OS === 'web' ? { willChange: 'transform' } : null) as object;

export function DragSheet({
  header,
  children,
  initial = 1,
  collapsed = 200,
  controller,
  onDetent,
}: {
  header: ReactNode;
  children: ReactNode;
  initial?: Detent;
  /** Altura recolhida (alça + cabeçalho). */
  collapsed?: number;
  /** Permite à tela abrir/fechar a aba (ex.: tocar na busca abre a aba cheia). */
  controller?: { current: SheetController | null };
  /** Avisa quando a aba para numa altura. */
  onDetent?: (d: Detent) => void;
}) {
  const c = useColors();
  // Altura da tela do Mapa (a aba se adapta a qualquer celular).
  const [screen, setScreen] = useState(0);
  const [width, setWidth] = useState(0);
  const [detent, setDetent] = useState<Detent>(initial);
  // Alturas medidas a partir da borda de baixo da tela (incluindo a distância até a barra
  // de abas enquanto a aba flutua).
  const GAP = useTabBarSpace() + 12;
  // Cheia: para logo abaixo da câmera/entalhe (o fundo continua até a borda).
  const safeTop = useSystemInsets().top;
  const heights = [collapsed + GAP, Math.round(screen * 0.6), screen - safeTop];
  const heightsRef = useRef(heights);
  heightsRef.current = heights;
  const scale = useFrameScale();
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const dragged = useRef(false);
  const scrollTop = useRef(0);
  const detentRef = useRef<Detent>(initial);

  // Geometria da aba para uma altura `v`: recolhida = pílula flutuante; média = cartão
  // flutuante; cheia = tela inteira. Só transformações (deslocar e esticar na horizontal),
  // que a placa de vídeo faz sem recalcular nem redesenhar nada.
  const H0 = heights[0] ?? collapsed;
  const H1 = Math.max(heights[1] ?? 0, H0 + 1);
  const H2 = Math.max(heights[2] ?? 0, H1 + 1);
  const geo = useRef({ H0, H1, H2, GAP, screen, width });
  geo.current = { H0, H1, H2, GAP, screen, width };

  // ── Movimento ────────────────────────────────────────────────────────────────────────
  // Android/iOS: Animated com driver nativo. Navegador: o dedo e a mola escrevem as
  // transformações direto nos elementos, sem passar pelo React Native (no Safari, o caminho
  // do Animated custava metade dos quadros).
  const h = useRef(new Animated.Value(collapsed + GAP)).current;
  const clipRef = useRef<ComponentRef<typeof View>>(null);
  const bgRef = useRef<ComponentRef<typeof View>>(null);
  const bodyRef = useRef<ComponentRef<typeof View>>(null);
  const web = useRef({ value: collapsed + GAP, frame: 0 }).current;

  const paint = (v: number) => {
    web.value = v;
    const { H0: a, H1: m, H2: z, GAP: gapMax, screen: sc, width: w } = geo.current;
    const ww = Math.max(w, 1);
    const k1 = Math.min(Math.max((v - a) / (m - a), 0), 1);
    const k2 = Math.min(Math.max((v - m) / (z - m), 0), 1);
    const sx = v <= m ? (ww - 56 + 24 * k1) / ww : (ww - 32 + 32 * k2) / ww;
    const gap = v <= m ? gapMax : gapMax * (1 - k2);
    const top = sc - v + gap;
    const clip = clipRef.current as unknown as HTMLElement | null;
    const bg = bgRef.current as unknown as HTMLElement | null;
    const body = bodyRef.current as unknown as HTMLElement | null;
    if (clip) clip.style.transform = `translate3d(0,${-gap}px,0) scaleX(${sx})`;
    if (bg) bg.style.transform = `translate3d(0,${top}px,0)`;
    if (body) body.style.transform = `translate3d(0,${top}px,0) scaleX(${1 / sx})`;
  };

  /** Valor atual (interrompe a mola em andamento). */
  const stop = (cb: (v: number) => void) => {
    if (WEB) {
      cancelAnimationFrame(web.frame);
      cb(web.value);
    } else h.stopAnimation(cb);
  };
  const setValue = (v: number) => (WEB ? paint(v) : h.setValue(v));

  const snap = (d: Detent, velocity = 0) => {
    // A troca de estado (que redesenha o conteúdo) fica para o fim do movimento: no meio
    // da animação ela custaria quadros.
    detentRef.current = d;
    const to = heightsRef.current[d] ?? collapsed;
    const done = () => {
      setDetent(detentRef.current);
      onDetentRef.current?.(detentRef.current);
    };
    // Mola quase crítica, com a "resposta" (~0,45 s) da aba do Apple Maps: desliza contínua,
    // herda a velocidade do dedo e assenta sem quicar.
    if (WEB) {
      cancelAnimationFrame(web.frame);
      let x = web.value;
      let vel = velocity * 1000; // unidades por segundo
      let last = performance.now();
      const step = (now: number) => {
        let dt = Math.min((now - last) / 1000, 1 / 20);
        last = now;
        while (dt > 0) {
          const h1 = Math.min(dt, 1 / 240);
          vel += (-SPRING.stiffness * (x - to) - SPRING.damping * vel) * h1;
          x += vel * h1;
          dt -= h1;
        }
        if (Math.abs(x - to) < 0.3 && Math.abs(vel) < 2) {
          paint(to);
          done();
          return;
        }
        paint(x);
        web.frame = requestAnimationFrame(step);
      };
      web.frame = requestAnimationFrame(step);
      return;
    }
    Animated.spring(h, {
      toValue: to,
      velocity,
      ...SPRING,
      mass: 1,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
      useNativeDriver: true,
    }).start(done);
  };
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const onDetentRef = useRef(onDetent);
  onDetentRef.current = onDetent;
  if (controller) controller.current = { snap: (d) => snapRef.current(d) };

  // Ao aparecer (abrir o Mapa, escolher um cliente), a aba sobe da borda de baixo com a mola,
  // em vez de surgir pronta. Depois, só se reposiciona quando a tela muda de tamanho.
  const entered = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reposiciona quando a tela é medida
  useEffect(() => {
    if (screen <= 0 || width <= 0) return;
    if (!entered.current) {
      entered.current = true;
      setValue(0);
      requestAnimationFrame(() => snapRef.current(detentRef.current));
      return;
    }
    setValue(heightsRef.current[detentRef.current] ?? collapsed);
  }, [screen, width]);

  // ── Gesto ────────────────────────────────────────────────────────────────────────────
  const start = useRef(0);
  const follow = (dy: number) => {
    const hs = heightsRef.current;
    const min = hs[0] ?? 0;
    const max = hs[2] ?? 0;
    const next = start.current - dy / scaleRef.current;
    // Passando dos limites, resiste (efeito elástico).
    setValue(next < min ? min - (min - next) / 4 : next > max ? max + (next - max) / 6 : next);
  };
  const finish = (dy: number, vyRaw: number) => {
    const hs = heightsRef.current;
    const shown = start.current - dy / scaleRef.current;
    const vy = vyRaw / scaleRef.current;
    const order = [0, 1, 2] as Detent[];
    let target: Detent;
    if (vy < -0.5) target = order.find((d) => (hs[d] ?? 0) > shown + 10) ?? 2;
    else if (vy > 0.5) target = [...order].reverse().find((d) => (hs[d] ?? 0) < shown - 10) ?? 0;
    else
      target = order.reduce((x, y) =>
        Math.abs((hs[y] ?? 0) - shown) < Math.abs((hs[x] ?? 0) - shown) ? y : x,
      );
    snapRef.current(target, -vy);
    setTimeout(() => {
      dragged.current = false;
    }, 350);
  };
  const grab = () => {
    dragged.current = true;
    stop((v) => {
      start.current = v;
    });
  };
  const vertical = (g: { dx: number; dy: number }) =>
    Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx);
  const handlers: PanResponderCallbacks = {
    onStartShouldSetPanResponder: () => false,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: grab,
    onPanResponderMove: (_e, g) => follow(g.dy),
    onPanResponderRelease: (_e, g) => finish(g.dy, g.vy),
    // Se o sistema interromper o gesto, a aba volta para uma altura válida em vez de ficar
    // parada fora do lugar.
    onPanResponderTerminate: (_e, g) => finish(g.dy, g.vy),
  };
  // Alça e cabeçalho: sempre arrastam a aba (mesmo começando em cima da busca).
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => vertical(g),
      onMoveShouldSetPanResponder: (_e, g) => vertical(g),
      ...handlers,
    }),
  ).current;
  // Conteúdo: arrasta a aba enquanto ela não está cheia; cheia, só quando a lista já está no
  // topo e o gesto é para baixo (como no Apple Maps). Senão, a lista rola.
  const contentPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        vertical(g) && (detentRef.current !== 2 || (g.dy > 0 && scrollTop.current <= 0)),
      onMoveShouldSetPanResponder: () => false,
      ...handlers,
    }),
  ).current;

  // Navegador: toque direto nos elementos (sem o sistema de gestos do React Native). O
  // `preventDefault` no arrasto também impede a rolagem elástica do Safari, que descolava a
  // lista do cabeçalho.
  const headerRef = useRef<ComponentRef<typeof View>>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: liga uma vez por elemento
  useEffect(() => {
    if (!WEB) return;
    const body = bodyRef.current as unknown as HTMLElement | null;
    if (!body) return;
    const head = headerRef.current as unknown as HTMLElement | null;
    let y0 = 0;
    let x0 = 0;
    let mode: 'idle' | 'maybe' | 'drag' | 'native' = 'idle';
    let inHeader = false;
    let samples: { y: number; t: number }[] = [];
    const begin = (x: number, y: number, target: EventTarget | null) => {
      x0 = x;
      y0 = y;
      mode = 'maybe';
      inHeader = !!head && target instanceof Node && head.contains(target);
      samples = [{ y, t: performance.now() }];
    };
    const move = (x: number, y: number, prevent: () => void) => {
      if (mode === 'idle' || mode === 'native') return;
      const dx = x - x0;
      const dy = y - y0;
      if (mode === 'maybe') {
        if (!vertical({ dx, dy })) {
          if (Math.abs(dx) > 8) mode = 'native';
          return;
        }
        const canDrag = inHeader || detentRef.current !== 2 || (dy > 0 && scrollTop.current <= 0);
        if (!canDrag) {
          mode = 'native';
          return;
        }
        mode = 'drag';
        grab();
        y0 = y; // começa sem salto
      }
      prevent();
      const t = performance.now();
      samples.push({ y, t });
      while (samples.length > 2 && t - (samples[0]?.t ?? t) > 100) samples.shift();
      follow(y - y0);
    };
    const end = (y: number) => {
      if (mode === 'drag') {
        const first = samples[0];
        const t = performance.now();
        const vy = first && t - first.t > 0 ? (y - first.y) / (t - first.t) : 0;
        finish(y - y0, vy);
      }
      mode = 'idle';
    };
    const lastY = { v: 0 };
    const ts = (e: TouchEvent) => {
      const p = e.touches[0];
      if (p && e.touches.length === 1) begin(p.clientX, p.clientY, e.target);
    };
    const tm = (e: TouchEvent) => {
      const p = e.touches[0];
      if (!p) return;
      lastY.v = p.clientY;
      move(p.clientX, p.clientY, () => e.preventDefault());
    };
    const te = () => end(lastY.v);
    const md = (e: MouseEvent) => {
      if (e.button !== 0) return;
      begin(e.clientX, e.clientY, e.target);
      const mm = (ev: MouseEvent) => {
        lastY.v = ev.clientY;
        move(ev.clientX, ev.clientY, () => ev.preventDefault());
      };
      const mu = () => {
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
        end(lastY.v);
      };
      lastY.v = e.clientY;
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
    };
    body.addEventListener('touchstart', ts, { passive: true });
    body.addEventListener('touchmove', tm, { passive: false });
    body.addEventListener('touchend', te);
    body.addEventListener('touchcancel', te);
    body.addEventListener('mousedown', md);
    return () => {
      body.removeEventListener('touchstart', ts);
      body.removeEventListener('touchmove', tm);
      body.removeEventListener('touchend', te);
      body.removeEventListener('touchcancel', te);
      body.removeEventListener('mousedown', md);
    };
  }, [screen > 0 && width > 0]);

  const anim = useMemo(() => {
    if (WEB) return null;
    const range = [H0, H1, H2];
    const w = Math.max(width, 1);
    const s = h.interpolate({
      inputRange: range,
      outputRange: [(w - 56) / w, (w - 32) / w, 1],
      extrapolate: 'clamp',
    });
    const gap = h.interpolate({
      inputRange: range,
      outputRange: [GAP, GAP, 0],
      extrapolate: 'clamp',
    });
    // Topo da aba (a partir do topo do recorte, que já subiu `gap`).
    const top = Animated.add(Animated.subtract(screen, h), gap);
    return {
      clip: { transform: [{ translateY: Animated.multiply(gap, -1) }, { scaleX: s }] },
      bg: { transform: [{ translateY: top }] },
      body: { transform: [{ translateY: top }, { scaleX: Animated.divide(1, s) }] },
    };
  }, [h, H0, H1, H2, GAP, screen, width]);

  return (
    <DraggedContext.Provider value={dragged}>
      <View
        pointerEvents="box-none"
        style={styles.area}
        onLayout={(e) => {
          setScreen(Math.round(e.nativeEvent.layout.height));
          setWidth(Math.round(e.nativeEvent.layout.width));
        }}
      >
        {screen > 0 && width > 0 && (
          <Animated.View
            ref={clipRef}
            pointerEvents="box-none"
            style={[styles.clip, { height: screen }, anim?.clip, WILL_MOVE, NO_SELECT]}
          >
            <Animated.View
              ref={bgRef}
              pointerEvents="none"
              style={[
                styles.sheetBg,
                {
                  height: screen,
                  borderColor: c.material.border,
                  backgroundColor: c.mode === 'dark' ? '#1C1C1E' : '#F2F2F7',
                },
                anim?.bg,
                WILL_MOVE,
              ]}
            />
            <Animated.View
              ref={bodyRef}
              style={[
                styles.body,
                {
                  left: CONTENT_INSET,
                  width: width - CONTENT_INSET * 2,
                  height: screen,
                },
                anim?.body,
                WILL_MOVE,
              ]}
            >
              {/* Cabeçalho fixo: a busca nunca rola junto com a lista. */}
              <View ref={headerRef} {...(WEB ? null : pan.panHandlers)}>
                <Touchable
                  accessibilityRole="button"
                  accessibilityLabel={detent === 2 ? 'Recolher aba' : 'Expandir aba'}
                  onPress={() =>
                    snap(detentRef.current === 2 ? 0 : ((detentRef.current + 1) as Detent))
                  }
                  style={styles.grabArea}
                >
                  <View style={[styles.grabber, { backgroundColor: c.textTertiary }]} />
                </Touchable>
                <View style={styles.header}>{header}</View>
              </View>
              <ScrollView
                style={[{ flex: 1 }, WEB && OVERSCROLL]}
                scrollEnabled={detent === 2}
                showsVerticalScrollIndicator={detent === 2}
                contentContainerStyle={styles.content}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  scrollTop.current = e.nativeEvent.contentOffset.y;
                }}
                {...(WEB ? null : contentPan.panHandlers)}
              >
                {children}
              </ScrollView>
            </Animated.View>
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
  // Busca como no Apple Maps: tocar no campo abre a aba inteira, mostra o teclado,
  // atalhos de filtro e sugestões — sem sair do Mapa.
  const sheet = useRef<SheetController | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  // Busca livre ou lista de clientes (atalho "Clientes"), as duas dentro da própria aba.
  const [mode, setMode] = useState<'search' | 'clients' | null>(null);
  const searching = mode !== null;
  const setSearching = (on: boolean) => setMode(on ? 'search' : null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const stops = useStops();
  const kyte = useKyteNames(query, mode === 'clients');
  const [notice, setNotice] = useState<string | null>(null);
  const openClients = () => {
    setMode('clients');
    setNotice(null);
    sheet.current?.snap(2);
  };
  // Cliente do Kyte: a janela invisível abre a ficha, lê o endereço e traça a rota.
  const pickKyte = (name: string) => {
    const known = findCustomer(name);
    if (known) {
      const address = customerAddress(known);
      if (!address) return setNotice(`${name} não tem endereço cadastrado no Kyte.`);
      Keyboard.dismiss();
      stops.goNow({ name: known.name, address, phone: known.phone });
      return;
    }
    setNotice(`Buscando o endereço de ${name}…`);
    kyteAgent
      .openClient(name)
      .then(({ client }) => {
        if (!client?.address) {
          setNotice(`${name} não tem endereço cadastrado no Kyte.`);
          return;
        }
        setNotice(null);
        Keyboard.dismiss();
        stops.goNow({ name: client.name || name, address: client.address, phone: client.phone });
      })
      .catch((e: Error) => setNotice(e.message));
  };
  const startSearch = () => {
    setSearching(true);
    sheet.current?.snap(2);
    requestAnimationFrame(() => input.current?.focus());
  };
  const endSearch = () => {
    setSearching(false);
    setQuery('');
    setRegion(null);
    Keyboard.dismiss();
    input.current?.blur();
    sheet.current?.snap(0);
  };
  const q = normalize(query.trim());
  const results = CLIENTS.filter(
    (x) =>
      (!region || x.region === region) &&
      (!q || normalize(`${x.tradeName} ${x.name} ${x.address} ${x.district}`).includes(q)),
  );

  return (
    <DragSheet
      initial={0}
      collapsed={146}
      controller={sheet}
      onDetent={(d) => {
        // Arrastou a aba para baixo durante a busca: encerra a busca.
        if (d === 0 && searching) {
          setSearching(false);
          setQuery('');
          setRegion(null);
          Keyboard.dismiss();
        }
      }}
      header={
        <View style={styles.searchRow}>
          {searching ? (
            <View style={[styles.search, { backgroundColor: c.fill }]}>
              <Icon name="search" size={36} color={c.textSecondary} />
              <TextInput
                ref={input}
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar cliente ou endereço"
                placeholderTextColor={c.textSecondary}
                returnKeyType="search"
                autoCorrect={false}
                selectionColor={c.accent}
                accessibilityLabel="Buscar cliente ou endereço"
                style={[TYPE.body, styles.input, { color: c.text }]}
              />
              {query !== '' ? (
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                  onPress={() => setQuery('')}
                >
                  <Icon name="close-circle" size={36} color={c.textTertiary} />
                </Tap>
              ) : (
                <Icon name="mic" size={36} color={c.textSecondary} />
              )}
            </View>
          ) : (
            <Tap
              accessibilityRole="search"
              accessibilityLabel="Buscar cliente ou endereço"
              onPress={startSearch}
              style={[styles.search, { backgroundColor: c.fill }]}
            >
              <Icon name="search" size={36} color={c.textSecondary} />
              <Text
                variant="body"
                tone="secondary"
                style={[TYPE.body, { flex: 1 }]}
                numberOfLines={1}
              >
                Buscar cliente ou endereço
              </Text>
              <Icon name="mic" size={36} color={c.textSecondary} />
            </Tap>
          )}
          {searching ? (
            <Tap
              accessibilityRole="button"
              accessibilityLabel="Cancelar busca"
              onPress={endSearch}
              style={[styles.cancel, { backgroundColor: c.fill }]}
            >
              <Icon name="close" size={36} color={c.text} />
            </Tap>
          ) : (
            <Tap
              accessibilityRole="button"
              accessibilityLabel="Ajustes da conta"
              onPress={() => router.replace('/configuracoes')}
            >
              <Avatar name="Raul Barbosa" size={84} colors={['#8E9BD6', '#6A76B8']} />
            </Tap>
          )}
        </View>
      }
    >
      {searching ? (
        <SearchBody
          clientsMode={mode === 'clients'}
          kyteNames={mode === 'clients' ? kyte.names : null}
          kyteLoading={kyte.loading}
          notice={notice}
          onPickKyte={pickKyte}
          onMore={() => router.replace({ pathname: '/kyte', params: { secao: 'clientes' } })}
          query={query}
          region={region}
          onRegion={(r) => setRegion(region === r ? null : r)}
          results={results}
          recent={recent}
          onPick={(id) => {
            Keyboard.dismiss();
            goTo(id);
          }}
          onDayRoute={() => router.replace({ pathname: '/mapa', params: { rota: 'dia' } })}
        />
      ) : (
        <>
          <Section title="Atalhos" />
          <View style={styles.shortcuts}>
            <Shortcut
              label="Clientes"
              sub="no Kyte"
              color="#0A84FF"
              icon={<Icon name="people" size={56} color="#FFFFFF" />}
              onPress={openClients}
            />
            <Shortcut
              label="Produtos"
              sub="no Kyte"
              color="#FF9F0A"
              icon={<Icon name="pricetag" size={52} color="#FFFFFF" />}
              onPress={() => router.replace({ pathname: '/kyte', params: { secao: 'produtos' } })}
            />
            <Shortcut
              label="Rotas"
              sub="Montar"
              subTone="accent"
              color="#30D158"
              icon={<Icon name="trail-sign" size={52} color="#FFFFFF" />}
              onPress={() => router.replace('/rotas')}
            />
          </View>

          <Section title="Recentes" onPress={openClients} />
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
                    <Icon name="location-sharp" size={34} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="headline" style={TYPE.rowTitle} numberOfLines={1}>
                      {x.tradeName}
                    </Text>
                    <Text variant="callout" tone="secondary" style={TYPE.rowSub} numberOfLines={1}>
                      {x.address} · {x.district.split(' · ').slice(1).join(' · ')}
                    </Text>
                  </View>
                  <Icon name="ellipsis-horizontal" size={40} color={c.textSecondary} />
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
              <Icon name="map" size={72} color="#FFFFFF" />
            </View>
            <Text variant="headline" style={TYPE.rowTitle}>
              Visitas de hoje
            </Text>
            <Text variant="callout" tone="secondary" style={TYPE.rowSub}>
              {TODAY_ROUTE.length} clientes
            </Text>
          </Tap>

          <WideAction
            icon="trail-sign"
            label="Montar rota do dia"
            onPress={() => router.replace('/rotas')}
          />
          <WideAction icon="share-outline" label="Compartilhar localização" />
        </>
      )}
    </DragSheet>
  );
}

/** Sem acentos e minúsculo, para a busca achar "Atelie" em "Ateliê". */
function normalize(t: string) {
  return t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const FILTERS = REGIONS.filter((r) => r !== 'Todas');

/**
 * Clientes do Kyte para a lista da aba (app instalado, Kyte logado): a janela invisível
 * busca na tela de Clientes do Kyte. Fora disso, `names` é nulo e a aba usa os de exemplo.
 */
export function useKyteNames(query: string, active: boolean) {
  // Lista de clientes já lida do Kyte (kyte/store.ts): busca na hora, sem abrir telas.
  const all = useKyteList('customer', active && kyteAgentAvailable() && kyteLogged());
  const [names, setNames] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const list = all.list;
  useEffect(() => {
    if (!active || !kyteAgentAvailable() || !kyteLogged()) {
      setNames(null);
      return;
    }
    if (list) {
      const q = query.trim().toLowerCase();
      setNames(
        list
          .map((c) => c.name)
          .filter((n) => !q || n.toLowerCase().includes(q))
          .slice(0, 60),
      );
      setLoading(false);
      return;
    }
    // Ainda sem a lista: procura direto na tela de clientes do Kyte.
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      kyteAgent
        .listClients(query.trim())
        .then((r) => alive && setNames(r.names))
        .catch(() => alive && setNames(null))
        .finally(() => alive && setLoading(false));
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, active, list]);
  return { names, loading };
}

function SearchBody({
  clientsMode = false,
  kyteNames,
  kyteLoading,
  notice,
  onPickKyte,
  onMore,
  query,
  region,
  onRegion,
  results,
  recent,
  onPick,
  onDayRoute,
}: {
  clientsMode?: boolean;
  /** Nomes vindos do Kyte (app instalado e logado); `null` = clientes de exemplo. */
  kyteNames: string[] | null;
  kyteLoading: boolean;
  notice: string | null;
  onPickKyte: (name: string) => void;
  onMore: () => void;
  query: string;
  region: string | null;
  onRegion: (r: string) => void;
  results: MockClient[];
  recent: MockClient[];
  onPick: (id: string) => void;
  onDayRoute: () => void;
}) {
  const c = useColors();
  const filtering = clientsMode || query.trim() !== '' || region !== null;
  const list = filtering ? results : recent;
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
        style={styles.chipStrip}
      >
        <Chip icon="map" label="Rota de hoje" onPress={onDayRoute} />
        {FILTERS.map((r) => (
          <Chip
            key={r}
            icon="location"
            label={r}
            active={region === r}
            onPress={() => onRegion(r)}
          />
        ))}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Section title={filtering ? 'Clientes' : 'Sugestões'} />
        {clientsMode && (
          <Tap accessibilityRole="link" onPress={onMore} style={styles.more}>
            <Text variant="headline" tone="accent" style={TYPE.rowSub}>
              Ver mais
            </Text>
            <Icon name="chevron-forward" size={28} color={c.accent} />
          </Tap>
        )}
      </View>
      {notice && (
        <Text variant="callout" tone="secondary" style={TYPE.rowSub}>
          {notice}
        </Text>
      )}
      {kyteNames ? (
        <View style={[styles.card, { backgroundColor: c.fill }]}>
          {kyteNames.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="callout" tone="secondary" style={TYPE.rowSub}>
                {kyteLoading ? 'Carregando os clientes do Kyte…' : 'Nenhum cliente encontrado.'}
              </Text>
            </View>
          ) : (
            kyteNames.map((name, i) => (
              <View key={name}>
                {i > 0 && <View style={[styles.sep, { backgroundColor: c.separator }]} />}
                <Tap
                  accessibilityRole="button"
                  onPress={() => onPickKyte(name)}
                  scaleTo={0.98}
                  style={styles.recent}
                >
                  <View style={[styles.pin, { backgroundColor: '#0A84FF' }]}>
                    <Icon name="storefront" size={32} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="headline" style={TYPE.rowTitle} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text variant="callout" tone="secondary" style={TYPE.rowSub}>
                      Cliente do Kyte · toque para traçar a rota
                    </Text>
                  </View>
                  <View style={ARROW}>
                    <Icon name="arrow-up-outline" size={32} color={c.textTertiary} />
                  </View>
                </Tap>
              </View>
            ))
          )}
        </View>
      ) : list.length === 0 ? (
        <View style={[styles.card, styles.empty, { backgroundColor: c.fill }]}>
          <Text variant="headline" style={TYPE.rowTitle}>
            Nenhum cliente encontrado
          </Text>
          <Text variant="callout" tone="secondary" style={[TYPE.rowSub, { textAlign: 'center' }]}>
            Confira o nome ou tente outra região.
          </Text>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: c.fill }]}>
          {list.map((x, i) => (
            <View key={x.id}>
              {i > 0 && <View style={[styles.sep, { backgroundColor: c.separator }]} />}
              <Tap
                accessibilityRole="button"
                onPress={() => onPick(x.id)}
                scaleTo={0.98}
                style={styles.recent}
              >
                <View
                  style={[styles.pin, { backgroundColor: filtering ? '#0A84FF' : c.fillStrong }]}
                >
                  <Icon
                    name={filtering ? 'storefront' : 'time'}
                    size={32}
                    color={filtering ? '#FFFFFF' : c.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="headline" style={TYPE.rowTitle} numberOfLines={1}>
                    {x.tradeName}
                  </Text>
                  <Text variant="callout" tone="secondary" style={TYPE.rowSub} numberOfLines={1}>
                    {x.address} · {x.district.split(' · ')[0]}
                  </Text>
                </View>
                <View style={ARROW}>
                  <Icon name="arrow-up-outline" size={32} color={c.textTertiary} />
                </View>
              </Tap>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function Chip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      scaleTo={0.95}
      style={[styles.chip, { backgroundColor: active ? c.accent : c.fill }]}
    >
      <Icon name={icon} size={28} color={active ? '#FFFFFF' : c.accent} />
      <Text variant="headline" style={TYPE.chip} color={active ? '#FFFFFF' : c.text}>
        {label}
      </Text>
    </Tap>
  );
}

const ARROW = { transform: [{ rotate: '-45deg' }] };

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
  const router = useRouter();
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
        <Quick icon="call" label="Ligar" onPress={() => callPhone(client.phone)} />
        <Quick icon="logo-whatsapp" label="WhatsApp" onPress={() => openWhatsApp(client.phone)} />
        <Quick icon="document-text" label="Pedido" />
        <Quick
          icon="storefront"
          label="Ficha"
          onPress={() => router.replace({ pathname: '/kyte', params: { secao: 'clientes' } })}
        />
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
      <Text variant="title2" style={TYPE.section}>
        {title}
      </Text>
      {onPress && <Icon name="chevron-forward" size={30} color={c.textTertiary} />}
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
      <Text variant="headline" style={TYPE.label} numberOfLines={1}>
        {label}
      </Text>
      <Text
        variant="callout"
        tone={subTone === 'accent' ? 'accent' : 'secondary'}
        style={TYPE.caption}
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
      <Icon name={icon} size={38} color={c.accent} />
      <Text variant="headline" tone="accent" style={[TYPE.body, { flex: 1, textAlign: 'center' }]}>
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

function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  const c = useColors();
  return (
    <Tap
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.quick, { backgroundColor: c.fill }]}
    >
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

/**
 * Tamanhos de texto da aba nas medidas do iOS (corpo 17 pt, legenda 15 pt, título de seção
 * 20 pt...). A tela de referência do celular tem 720 de largura (≈0,55× no aparelho), então
 * cada ponto do iOS vale ~1,83 unidade aqui.
 */
const TYPE = StyleSheet.create({
  body: { fontSize: 31, lineHeight: 38 },
  section: { fontSize: 38, lineHeight: 46 },
  rowTitle: { fontSize: 31, lineHeight: 38 },
  rowSub: { fontSize: 27, lineHeight: 34 },
  label: { fontSize: 25, lineHeight: 31 },
  caption: { fontSize: 22, lineHeight: 28 },
  chip: { fontSize: 27, lineHeight: 34 },
});

const styles = StyleSheet.create({
  area: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  // Recorte da aba: cantos de baixo arredondados (os de cima vêm do fundo).
  clip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderBottomLeftRadius: 52,
    borderBottomRightRadius: 52,
    overflow: 'hidden',
  },
  sheetBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopLeftRadius: 52,
    borderTopRightRadius: 52,
    borderWidth: 1,
  },
  body: { position: 'absolute', top: 0 },
  grabArea: { height: 40, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 66, height: 10, borderRadius: 5, opacity: 0.5 },
  header: { paddingHorizontal: 24, paddingBottom: 18 },
  content: { paddingHorizontal: 24, paddingBottom: TAB_BAR_HEIGHT + 48, gap: spacing[4] },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  input: {
    flex: 1,
    // Web: sem largura mínima, o campo empurrava o botão de limpar para fora.
    minWidth: 0,
    width: 0,
    padding: 0,
    // Web: sem o contorno azul do navegador no campo.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  cancel: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipStrip: { marginHorizontal: -24, flexGrow: 0 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 6 },
  chips: { gap: spacing[3], paddingHorizontal: 24 },
  chip: {
    height: 68,
    borderRadius: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
  },
  empty: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[8] },
  search: {
    flex: 1,
    height: 84,
    borderRadius: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
    alignSelf: 'flex-start',
  },
  shortcuts: { flexDirection: 'row', gap: spacing[4] },
  shortcut: { alignItems: 'center', gap: 2, width: 150 },
  circle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  card: { borderRadius: 30, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 104 },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
  },
  pin: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  guide: { width: 300, borderRadius: 30, padding: spacing[4], gap: 2 },
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
