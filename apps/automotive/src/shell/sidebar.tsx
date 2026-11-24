import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, usePathname, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { HavenaOrb } from '../havena/orb';
import { HavenaPanel } from '../havena/panel';
import { usePrototype } from '../prototype/state';
import { concentric, layout, nativeDriver, spacing, useColors } from '../theme';
import { LIVE_BLUR } from '../ui/blur-target';
import { KyteLogo } from '../ui/brand';
import { useSpring } from '../ui/motion';
import { Blur, Text, Touchable } from '../ui/primitives';
import { type AppGlyph, OutlineGlyph } from './app-icons';
import { NowPlayingTile } from './now-playing-tile';

interface Item {
  href: Href;
  match: string;
  label: string;
  /** Ícone de contorno; sem ele, o item usa o logo do Spotify. */
  glyph?: AppGlyph;
}

const ITEMS: Item[] = [
  { href: '/mapa', match: '/mapa', label: 'Mapa', glyph: 'mapa' },
  { href: '/musica', match: '/musica', label: 'Música' },
  { href: '/kyte', match: '/kyte', label: 'Kyte', glyph: 'kyte' },
];

/**
 * Painel flutuante (referência: barra lateral do painel do carro): um bloco arredondado
 * afastado das bordas, com a hora em cima, os apps como ícones de app empilhados e os
 * Ajustes no pé. Bordas concêntricas: raio do painel − espaçamento = raio dos ícones.
 */
const INSET = 16;
const PANEL_W = layout.sidebarWidth - INSET * 2;
const PANEL_R = 52;
const PANEL_PAD = 22;
const ICON = PANEL_W - PANEL_PAD * 2;
const ICON_R = concentric(PANEL_R, PANEL_PAD);
const GAP = 18;
const SLOT = ICON + GAP;

export function Sidebar() {
  const c = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { setOverlay, nowPlaying, playing, kyteOpen } = usePrototype();
  // Fora da Música, o ícone do Spotify mostra a música tocando.
  const showPlaying = nowPlaying !== null && !pathname.startsWith('/musica');
  const activeIndex = ITEMS.findIndex((i) => pathname.startsWith(i.match));
  const settingsActive = pathname.startsWith('/configuracoes');
  const y = useSpring(Math.max(activeIndex, 0) * SLOT);
  const openHavena = () => setOverlay(<HavenaPanel onClose={() => setOverlay(null)} />);

  // O painel acompanha a página aberta: claro no Kyte (fundo cinza-claro), escuro no resto.
  // (Só depois de conectado: a tela de conexão do Kyte é escura.)
  const onKyte = pathname.startsWith('/kyte') && kyteOpen;
  const dark = c.mode === 'dark' && !onKyte;
  const ink = dark ? '#F2F2F7' : '#1C1C1E';
  const panelBg = onKyte
    ? 'rgba(255,255,255,0.92)'
    : LIVE_BLUR
      ? dark
        ? 'rgba(28,28,30,0.62)'
        : 'rgba(255,255,255,0.6)'
      : dark
        ? 'rgba(28,28,30,0.96)'
        : 'rgba(255,255,255,0.94)';

  return (
    <View style={[styles.bar, { backgroundColor: onKyte ? '#EEF1F5' : c.background }]}>
      <View
        style={[styles.panel, { borderColor: onKyte ? 'rgba(0,0,0,0.06)' : c.material.border }]}
      >
        <Blur radius={40} tint={c.material.tint} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: panelBg }]} />

        <View style={styles.status}>
          <Clock color={ink} />
          <View style={styles.signal}>
            <Ionicons name="cellular" size={22} color={ink} />
            <Ionicons name="battery-full" size={26} color={ink} />
          </View>
        </View>

        <View style={{ height: (ITEMS.length + 1) * SLOT }}>
          {activeIndex >= 0 && (
            <Animated.View
              style={[
                styles.indicator,
                { backgroundColor: c.accent, transform: [{ translateY: y }] },
              ]}
            />
          )}
          {ITEMS.map((item, i) => (
            <Tile
              key={item.label}
              top={i * SLOT}
              label={item.label}
              selected={i === activeIndex}
              onPress={() => router.replace(item.href)}
            >
              {item.glyph === 'kyte' ? (
                <KyteLogo size={ICON} />
              ) : item.glyph ? (
                <View style={[styles.icon, { backgroundColor: c.accent }]}>
                  <OutlineGlyph glyph={item.glyph} size={60} color="#FFFFFF" />
                </View>
              ) : (
                <MusicSwap
                  show={showPlaying}
                  logo={
                    <View style={[styles.icon, styles.spotify]}>
                      <FontAwesome5 name="spotify" size={64} color="#1ED760" />
                    </View>
                  }
                  playingTile={
                    nowPlaying && (
                      <NowPlayingTile
                        cover={nowPlaying.image}
                        tint={nowPlaying.tint}
                        playing={playing}
                        width={ICON}
                        height={ICON}
                        radius={ICON_R}
                      />
                    )
                  }
                />
              )}
            </Tile>
          ))}
          <Tile top={ITEMS.length * SLOT} label="Falar com o Lucas" onPress={openHavena}>
            <HavenaOrb size={ICON - 8} ambient />
          </Tile>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ height: ICON }}>
          {settingsActive && <View style={[styles.indicator, { backgroundColor: c.accent }]} />}
          <Tile
            top={0}
            label="Ajustes"
            selected={settingsActive}
            onPress={() => router.replace('/configuracoes')}
          >
            <View style={[styles.icon, { backgroundColor: dark ? '#3A3A3C' : '#8E8E93' }]}>
              <OutlineGlyph glyph="ajustes" size={60} color="#FFFFFF" />
            </View>
          </Tile>
        </View>
      </View>
    </View>
  );
}

/**
 * Troca animada entre o logo do Spotify e a música tocando: o logo encolhe e some enquanto
 * a capa cresce no lugar (e o inverso ao voltar para a Música).
 */
function MusicSwap({
  show,
  logo,
  playingTile,
}: {
  show: boolean;
  logo: ReactNode;
  playingTile: ReactNode;
}) {
  const p = useRef(new Animated.Value(show ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(p, {
      toValue: show ? 1 : 0,
      duration: 460,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: nativeDriver,
    }).start();
  }, [p, show]);
  return (
    <View style={styles.swap}>
      <Animated.View
        style={[
          styles.swapLayer,
          {
            opacity: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }),
            transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }],
          },
        ]}
      >
        {logo}
      </Animated.View>
      {playingTile && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.swapLayer,
            {
              opacity: p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
              transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
            },
          ]}
        >
          {playingTile}
        </Animated.View>
      )}
    </View>
  );
}

function Tile({
  top,
  label,
  selected,
  onPress,
  children,
}: {
  top: number;
  label: string;
  selected?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      scaleTo={0.9}
      style={[styles.tile, { top }]}
    >
      {children}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: layout.sidebarWidth },
  panel: {
    position: 'absolute',
    left: INSET,
    top: INSET,
    bottom: INSET,
    width: PANEL_W,
    borderRadius: PANEL_R,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: spacing[5],
    paddingBottom: PANEL_PAD,
  },
  status: { alignItems: 'center', gap: 4, marginBottom: spacing[5] },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tile: {
    position: 'absolute',
    left: PANEL_PAD,
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON_R,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotify: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  swap: { width: ICON, height: ICON },
  swapLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Marca do app aberto: traço curto na borda esquerda do painel, que desliza por mola.
  indicator: {
    position: 'absolute',
    left: 0,
    top: ICON / 2 - 22,
    width: 6,
    height: 44,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});

/** Hora de verdade (atualiza a cada minuto). */
function Clock({ color }: { color: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const wait = 60_000 - (Date.now() % 60_000);
    let every: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      tick();
      every = setInterval(tick, 60_000);
    }, wait);
    return () => {
      clearTimeout(first);
      if (every) clearInterval(every);
    };
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <Text variant="title2" color={color} style={{ fontSize: 30, lineHeight: 34 }}>
      {hh}:{mm}
    </Text>
  );
}
