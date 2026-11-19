import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { type Href, usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { HavenaOrb } from '../havena/orb';
import { HavenaPanel } from '../havena/panel';
import { usePrototype } from '../prototype/state';
import { layout, spacing, useColors } from '../theme';
import { useSpring } from '../ui/motion';
import { Blur, Icon, Text, Touchable } from '../ui/primitives';
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
  { href: '/clientes', match: '/clientes', label: 'Clientes', glyph: 'clientes' },
  { href: '/produtos', match: '/produtos', label: 'Produtos', glyph: 'produtos' },
  { href: '/rotas', match: '/rotas', label: 'Rotas', glyph: 'rotas' },
  { href: '/musica', match: '/musica', label: 'Música' },
];

const TILE_W = 112;
const TILE_H = 92;
const GAP = 10;
const SLOT = TILE_H + GAP;

/**
 * Barra lateral (referência enviada): cada app num bloco cinza arredondado com ícone de
 * contorno. O app ativo fica azul, com uma barra azul na borda esquerda; o destaque desliza
 * por mola até o item selecionado.
 */
export function Sidebar() {
  const c = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { setOverlay, nowPlaying, playing } = usePrototype();
  // Fora da Música, o bloco do Spotify mostra a música tocando.
  const showPlaying = nowPlaying !== null && !pathname.startsWith('/musica');
  const activeIndex = ITEMS.findIndex((i) => pathname.startsWith(i.match));
  const settingsActive = pathname.startsWith('/configuracoes');
  const y = useSpring(Math.max(activeIndex, 0) * SLOT);
  const openHavena = () => setOverlay(<HavenaPanel onClose={() => setOverlay(null)} />);

  const dark = c.mode === 'dark';
  const tile = dark ? '#1C1C1F' : 'rgba(0,0,0,0.05)';
  const selected = dark ? 'rgba(10,132,255,0.16)' : 'rgba(0,122,255,0.12)';
  const ink = dark ? '#F2F2F7' : '#1C1C1E';

  return (
    <View style={[styles.bar, { borderRightColor: c.material.border }]}>
      <Blur radius={40} tint={c.material.tint} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dark ? 'rgba(10,10,12,0.62)' : 'rgba(240,240,244,0.6)' },
        ]}
      />

      <View style={styles.status}>
        <Text variant="title2" style={{ fontSize: 28, lineHeight: 32 }}>
          09:41
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="subhead" style={{ fontSize: 20 }}>
            5G
          </Text>
          <Icon name="cellular" size={22} color={c.text} />
        </View>
      </View>

      <View style={{ height: ITEMS.length * SLOT + TILE_H }}>
        {/* Fundo dos blocos, destaque deslizante e barra azul ficam atrás dos ícones. */}
        {ITEMS.map((item, i) => (
          <View
            key={item.label}
            style={[styles.tileBg, { top: i * SLOT, backgroundColor: tile }]}
          />
        ))}
        <View style={[styles.tileBg, { top: ITEMS.length * SLOT, backgroundColor: tile }]} />
        {activeIndex >= 0 && (
          <>
            <Animated.View
              style={[styles.tileBg, { backgroundColor: selected, transform: [{ translateY: y }] }]}
            />
            <Animated.View
              style={[
                styles.indicator,
                { backgroundColor: c.accent, transform: [{ translateY: y }] },
              ]}
            />
          </>
        )}

        {ITEMS.map((item, i) => {
          const active = i === activeIndex;
          const color = active ? c.accent : ink;
          return (
            <Tile
              key={item.label}
              top={i * SLOT}
              label={item.label}
              selected={active}
              onPress={() => router.replace(item.href)}
            >
              {item.glyph ? (
                <OutlineGlyph glyph={item.glyph} size={50} color={color} />
              ) : showPlaying && nowPlaying ? (
                <NowPlayingTile
                  cover={nowPlaying.image}
                  playing={playing}
                  width={TILE_W}
                  height={TILE_H}
                  radius={24}
                />
              ) : (
                <FontAwesome5
                  name="spotify"
                  size={50}
                  color={active ? c.accent : dark ? '#C7C7CC' : '#3A3A3C'}
                />
              )}
            </Tile>
          );
        })}
        <Tile top={ITEMS.length * SLOT} label="Falar com a Havena" onPress={openHavena}>
          <HavenaOrb size={64} />
        </Tile>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ height: TILE_H }}>
        <View
          style={[styles.tileBg, { top: 0, backgroundColor: settingsActive ? selected : tile }]}
        />
        {settingsActive && <View style={[styles.indicator, { backgroundColor: c.accent }]} />}
        <Tile
          top={0}
          label="Ajustes"
          selected={settingsActive}
          onPress={() => router.replace('/configuracoes')}
        >
          <OutlineGlyph glyph="ajustes" size={50} color={settingsActive ? c.accent : ink} />
        </Tile>
      </View>
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
      scaleTo={0.92}
      style={[styles.tile, { top }]}
    >
      {children}
    </Touchable>
  );
}

const LEFT = (layout.sidebarWidth - TILE_W) / 2;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: layout.sidebarWidth,
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    overflow: 'hidden',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  status: { alignItems: 'center', gap: 2, marginBottom: spacing[5] },
  tileBg: {
    position: 'absolute',
    left: LEFT,
    width: TILE_W,
    height: TILE_H,
    borderRadius: 24,
  },
  tile: {
    position: 'absolute',
    left: LEFT,
    width: TILE_W,
    height: TILE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 6,
    height: TILE_H,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});
