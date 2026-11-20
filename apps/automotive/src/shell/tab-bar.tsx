import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HavenaOrb } from '../havena/orb';
import { HavenaPanel } from '../havena/panel';
import { TAB_BAR_HEIGHT } from '../layout/form-factor';
import { usePrototype } from '../prototype/state';
import { useColors } from '../theme';
import { Blur, Text, Touchable } from '../ui/primitives';
import { OutlineGlyph } from './app-icons';
import { NowPlayingTile } from './now-playing-tile';

/** Telas que ficam dentro da aba "Mais" no celular. */
export const MORE_ROUTES = ['/mais', '/produtos', '/rotas', '/kyte', '/configuracoes'];

/**
 * Barra de abas do celular em pé (estilo iOS): Mapa, Clientes, Havena no centro, Música e
 * Mais (Produtos, Rotas, Kyte e Ajustes). Fica por cima do conteúdo, com desfoque.
 */
export function TabBar() {
  const c = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { setOverlay, nowPlaying, playing } = usePrototype();
  const dark = c.mode === 'dark';
  const ink = dark ? '#8E8E93' : '#6C6C70';
  const openHavena = () => setOverlay(<HavenaPanel onClose={() => setOverlay(null)} />);

  const is = (p: string) => pathname.startsWith(p);
  const more = MORE_ROUTES.some(is);
  const tab = (label: string, href: Href, active: boolean, icon: (color: string) => ReactNode) => (
    <Touchable
      key={label}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => router.replace(href)}
      scaleTo={0.9}
      style={styles.tab}
    >
      {icon(active ? c.accent : ink)}
      <Text variant="caption" color={active ? c.accent : ink} style={styles.label}>
        {label}
      </Text>
    </Touchable>
  );

  return (
    <View style={[styles.bar, { borderTopColor: c.material.border }]}>
      <Blur radius={40} tint={c.material.tint} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dark ? 'rgba(18,18,20,0.72)' : 'rgba(248,248,250,0.72)' },
        ]}
      />
      {tab('Mapa', '/mapa', is('/mapa'), (col) => (
        <OutlineGlyph glyph="mapa" size={44} color={col} />
      ))}
      {tab('Clientes', '/clientes', is('/clientes'), (col) => (
        <OutlineGlyph glyph="clientes" size={44} color={col} />
      ))}
      <Touchable
        accessibilityRole="button"
        accessibilityLabel="Falar com a Havena"
        onPress={openHavena}
        scaleTo={0.9}
        style={styles.tab}
      >
        <HavenaOrb size={76} />
      </Touchable>
      {tab('Música', '/musica', is('/musica'), (col) =>
        // Fora da Música, mostra a capa da música tocando no lugar do logo.
        nowPlaying && !is('/musica') ? (
          <NowPlayingTile
            cover={nowPlaying.image}
            tint={nowPlaying.tint}
            playing={playing}
            width={56}
            height={44}
            radius={10}
          />
        ) : (
          <FontAwesome5 name="spotify" size={42} color={col} />
        ),
      )}
      {tab('Mais', '/mais', more, (col) => (
        <Ionicons name="ellipsis-horizontal-circle-outline" size={46} color={col} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontSize: 20, lineHeight: 24 },
});
