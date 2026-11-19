import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { type Href, usePathname, useRouter } from 'expo-router';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { HavenaOrb } from '../havena/orb';
import { HavenaPanel } from '../havena/panel';
import { usePrototype } from '../prototype/state';
import { spacing, useColors } from '../theme';
import { useSpring } from '../ui/motion';
import { AppIcon, Blur, Icon, type IconName, Text, Touchable } from '../ui/primitives';
import { type AppGlyph, GoAppIcon } from './app-icons';

interface Item {
  href: Href;
  match: string;
  label: string;
  icon: IconName;
  color: string;
  glyph?: string;
  /** Ícone desenhado do app (ver app-icons.tsx). */
  app?: AppGlyph;
  /** Ícone de marca no lugar do ícone genérico. */
  brand?: 'spotify';
}

const ITEMS: Item[] = [
  { href: '/mapa', match: '/mapa', label: 'Mapa', icon: 'map', color: '#3A3A3C', app: 'mapa' },
  {
    href: '/clientes',
    match: '/clientes',
    label: 'Clientes',
    icon: 'storefront',
    color: '#3A3A3C',
    app: 'clientes',
  },
  {
    href: '/produtos',
    match: '/produtos',
    label: 'Produtos',
    icon: 'shirt',
    color: '#3A3A3C',
    app: 'produtos',
  },
  {
    href: '/rotas',
    match: '/rotas',
    label: 'Rotas',
    icon: 'trail-sign',
    color: '#3A3A3C',
    app: 'rotas',
  },
  {
    href: '/musica',
    match: '/musica',
    label: 'Música',
    icon: 'musical-notes',
    color: '#000000',
    brand: 'spotify',
  },
];

const SLOT = 104; // altura do item + espaço entre itens

/**
 * Barra lateral do CarPlay: hora e sinal no topo, ícones dos apps e Ajustes no rodapé.
 * O destaque do app atual desliza por mola até o item selecionado.
 */
export function Sidebar() {
  const c = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = ITEMS.findIndex((i) => pathname.startsWith(i.match));
  const y = useSpring(Math.max(activeIndex, 0) * SLOT);
  const settingsActive = pathname.startsWith('/configuracoes');
  const { setOverlay } = usePrototype();
  const openHavena = () => setOverlay(<HavenaPanel onClose={() => setOverlay(null)} />);

  return (
    <View style={[styles.bar, { borderRightColor: c.material.border }]}>
      <Blur radius={40} tint={c.material.tint} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: c.mode === 'dark' ? 'rgba(20,20,22,0.42)' : 'rgba(240,240,244,0.5)' },
        ]}
      />
      <View style={styles.status}>
        <Text variant="headline">09:41</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="cellular" size={18} color={c.textSecondary} />
          <Text variant="footnote" tone="secondary">
            5G
          </Text>
        </View>
      </View>

      <View>
        {activeIndex >= 0 && (
          <Animated.View
            style={[styles.plate, { backgroundColor: c.fill, transform: [{ translateY: y }] }]}
          />
        )}
        {ITEMS.map((item) => (
          <Touchable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: pathname.startsWith(item.match) }}
            onPress={() => router.replace(item.href)}
            scaleTo={0.9}
            style={styles.item}
          >
            {item.app ? (
              <GoAppIcon glyph={item.app} size={72} />
            ) : item.brand === 'spotify' ? (
              <SpotifyIcon size={72} />
            ) : (
              <AppIcon icon={item.icon} color={item.color} glyph={item.glyph} size={72} />
            )}
          </Touchable>
        ))}
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Falar com a Havena"
          onPress={openHavena}
          scaleTo={0.88}
          style={styles.item}
        >
          <HavenaOrb size={62} />
        </Touchable>
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajustes"
        onPress={() => router.replace('/configuracoes')}
        style={[styles.item, settingsActive && { backgroundColor: c.fill, borderRadius: 24 }]}
      >
        <AppIcon icon="settings-sharp" color="#8E8E93" size={72} />
      </Pressable>
    </View>
  );
}

/** Ícone do app do Spotify: logo verde sobre fundo preto, no formato de ícone do CarPlay. */
function SpotifyIcon({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.235,
        backgroundColor: '#000000',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FontAwesome5 name="spotify" size={size * 0.64} color="#1ED760" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 120,
    paddingVertical: spacing[5],
    alignItems: 'center',
    overflow: 'hidden',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  status: { alignItems: 'center', gap: 2, marginBottom: spacing[5] },
  plate: { position: 'absolute', left: 4, top: 0, width: 96, height: 96, borderRadius: 24 },
  item: { width: 104, height: SLOT, alignItems: 'center', justifyContent: 'center' },
});
