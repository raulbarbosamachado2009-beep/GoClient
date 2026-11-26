import { type Href, usePathname, useRouter } from 'expo-router';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { LucasCloud } from '../havena/cloud';
import { HavenaPanel } from '../havena/panel';
import { TAB_BAR_BOTTOM, useTabBarLift } from '../layout/form-factor';
import { useFrameScale } from '../preview/automotive-frame';
import { usePrototype } from '../prototype/state';
import { useColors } from '../theme';
import { LIVE_BLUR } from '../ui/blur-target';
import { KyteLogo } from '../ui/brand';
import { Blur, Touchable } from '../ui/primitives';
import { WhatsAppLogo } from '../whatsapp/brand';
import { OutlineGlyph } from './app-icons';

/** Telas abertas a partir da aba puxável do Mapa (a aba Mapa fica marcada nelas). */
export const MAP_ROUTES = ['/mapa', '/clientes', '/produtos', '/rotas', '/mais'];

/** Altura da pílula e margem até a borda de baixo (a soma cabe em TAB_BAR_HEIGHT). */
const BAR_H = 112;
const SIDE = 40;
const BOTTOM = TAB_BAR_BOTTOM;

interface TabDef {
  key: string;
  label: string;
  href?: Href;
}

const TABS: TabDef[] = [
  { key: 'mapa', label: 'Mapa', href: '/mapa' },
  { key: 'kyte', label: 'Kyte', href: '/kyte' },
  // O Lucas fica no meio da barra (pedido do usuário em 26/11/2026).
  { key: 'havena', label: 'Falar com o Lucas' },
  { key: 'whatsapp', label: 'WhatsApp', href: '/whatsapp' },
  { key: 'ajustes', label: 'Ajustes', href: '/configuracoes' },
];

/**
 * Barra de abas do celular em pé (referência: Instagram no iOS 26): pílula flutuante de
 * vidro, só ícones, com uma bolha clara atrás do ícone ativo. A bolha desliza ao trocar de
 * aba; arrastando o dedo pela barra ela acompanha (um pouco maior, como uma lente) e a tela
 * troca ao soltar. O Lucas abre por cima, sem trocar de tela.
 */
export function TabBar() {
  const c = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { setOverlay, immersive } = usePrototype();
  // Dentro de uma conversa do WhatsApp a barra desce e some (a conversa fica em tela cheia).
  const hide = useRef(new Animated.Value(immersive ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(hide, {
      toValue: immersive ? 1 : 0,
      damping: 24,
      stiffness: 280,
      useNativeDriver: false,
    }).start();
  }, [immersive, hide]);
  const lift = useTabBarLift();
  const dark = c.mode === 'dark';
  const ink = dark ? '#F2F2F7' : '#1C1C1E';
  const muted = dark ? '#9A9AA0' : '#6C6C70';

  const is = (p: string) => pathname.startsWith(p);
  // O índice vem da posição em TABS (o Lucas no meio não é uma tela e nunca fica ativo).
  const activeKey = MAP_ROUTES.some(is)
    ? 'mapa'
    : is('/kyte')
      ? 'kyte'
      : is('/whatsapp')
        ? 'whatsapp'
        : is('/configuracoes')
          ? 'ajustes'
          : 'mapa';
  const active = Math.max(
    0,
    TABS.findIndex((t) => t.key === activeKey),
  );

  // Largura de cada item (medida) e posição da bolha.
  const [width, setWidth] = useState(0);
  const item = width / TABS.length;
  const x = useRef(new Animated.Value(0)).current;
  const lens = useRef(new Animated.Value(1)).current;
  const [hover, setHover] = useState<number | null>(null);
  const placed = useRef(false);

  useEffect(() => {
    if (!item) return;
    const to = active * item;
    if (!placed.current) {
      placed.current = true;
      x.setValue(to);
      return;
    }
    Animated.spring(x, {
      toValue: to,
      damping: 22,
      stiffness: 260,
      useNativeDriver: false,
    }).start();
  }, [active, item, x]);

  const choose = (i: number) => {
    const t = TABS[i];
    if (!t) return;
    if (t.key === 'havena') {
      setOverlay(<HavenaPanel onClose={() => setOverlay(null)} />);
      // A bolha volta para a tela atual.
      Animated.spring(x, {
        toValue: active * item,
        damping: 22,
        stiffness: 260,
        useNativeDriver: false,
      }).start();
      return;
    }
    if (t.href) router.replace(t.href);
  };

  // Arrastar pela barra: a bolha segue o dedo e a aba troca ao soltar.
  const scale = useFrameScale();
  const geo = useRef({ left: 0, item: 0, scale: 1, active: 0 });
  geo.current = { ...geo.current, item, scale, active };
  const bar = useRef<ComponentRef<typeof View>>(null);
  const chooseRef = useRef(choose);
  chooseRef.current = choose;
  const indexAt = (pageX: number) => {
    const g = geo.current;
    const local = (pageX - g.left) / g.scale;
    return Math.max(0, Math.min(TABS.length - 1, Math.floor(local / Math.max(1, g.item))));
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        bar.current?.measureInWindow((left) => {
          geo.current.left = left;
        });
        Animated.spring(lens, {
          toValue: 1.18,
          damping: 16,
          stiffness: 300,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (e) => {
        const g = geo.current;
        const local = (e.nativeEvent.pageX - g.left) / g.scale;
        const clamped = Math.max(0, Math.min((TABS.length - 1) * g.item, local - g.item / 2));
        x.setValue(clamped);
        setHover(indexAt(e.nativeEvent.pageX));
      },
      onPanResponderRelease: (e) => {
        Animated.spring(lens, {
          toValue: 1,
          damping: 16,
          stiffness: 300,
          useNativeDriver: false,
        }).start();
        const i = indexAt(e.nativeEvent.pageX);
        setHover(null);
        Animated.spring(x, {
          toValue: i * geo.current.item,
          damping: 22,
          stiffness: 260,
          useNativeDriver: false,
        }).start();
        chooseRef.current(i);
      },
      onPanResponderTerminate: () => {
        setHover(null);
        Animated.spring(lens, { toValue: 1, useNativeDriver: false }).start();
        Animated.spring(x, {
          toValue: geo.current.active * geo.current.item,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  const highlighted = hover ?? active;
  const icon = (i: number, col: string): ReactNode => {
    switch (TABS[i]?.key) {
      case 'mapa':
        return <OutlineGlyph glyph="mapa" size={46} color={col} />;
      case 'havena':
        return <LucasCloud size={72} ambient />;
      case 'kyte':
        return <KyteLogo size={50} />;
      case 'whatsapp':
        return <WhatsAppLogo size={50} />;
      default:
        return <OutlineGlyph glyph="ajustes" size={46} color={col} />;
    }
  };

  return (
    <Animated.View
      pointerEvents={immersive ? 'none' : 'box-none'}
      style={[
        styles.wrap,
        {
          bottom: BOTTOM + lift,
          opacity: hide.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.4, 0] }),
          transform: [
            { translateY: hide.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_H + 60] }) },
          ],
        },
      ]}
    >
      <View
        ref={bar}
        collapsable={false}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width - 16)}
        style={[
          styles.bar,
          {
            borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
            shadowColor: '#000',
          },
        ]}
        {...pan.panHandlers}
      >
        <Blur radius={40} tint={c.material.tint} />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: LIVE_BLUR
                ? dark
                  ? 'rgba(28,28,30,0.62)'
                  : 'rgba(250,250,252,0.66)'
                : dark
                  ? 'rgba(30,30,32,0.95)'
                  : 'rgba(250,250,252,0.95)',
            },
          ]}
        />
        {item > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubble,
              {
                width: item,
                backgroundColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.07)',
                transform: [{ translateX: x }, { scale: lens }],
              },
            ]}
          />
        )}
        {TABS.map((t, i) => (
          <Touchable
            key={t.key}
            accessibilityRole={t.href ? 'tab' : 'button'}
            accessibilityLabel={t.label}
            accessibilityState={{ selected: i === active }}
            onPress={() => choose(i)}
            scaleTo={0.88}
            style={styles.tab}
          >
            {icon(i, i === highlighted ? ink : muted)}
          </Touchable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SIDE,
    right: SIDE,
    bottom: BOTTOM,
    height: BAR_H,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: BAR_H / 2,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  bubble: {
    position: 'absolute',
    left: 8,
    top: 10,
    bottom: 10,
    borderRadius: (BAR_H - 20) / 2,
  },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
});
