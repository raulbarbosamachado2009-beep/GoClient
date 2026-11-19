import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Slot, usePathname, useRouter } from 'expo-router';
import { Animated, StyleSheet, View } from 'react-native';
import { SpotifyConnect } from '../../../music/connect';
import { usePrototype } from '../../../prototype/state';
import { MiniPlayer } from '../../../shell/mini-player';
import { layout, spacing, useColors } from '../../../theme';
import { ScreenTransition, useSpring } from '../../../ui/motion';
import { Icon, type IconName, Text, Touchable } from '../../../ui/primitives';

const TABS: {
  href: Href | null;
  match: string;
  label: string;
  icon: IconName;
  iconActive: IconName;
}[] = [
  { href: '/musica', match: '/musica', label: 'Início', icon: 'home-outline', iconActive: 'home' },
  {
    href: '/musica/buscar',
    match: '/musica/buscar',
    label: 'Buscar',
    icon: 'search-outline',
    iconActive: 'search',
  },
  {
    href: '/musica/biblioteca',
    match: '/musica/biblioteca',
    label: 'Sua Biblioteca',
    icon: 'library-outline',
    iconActive: 'library',
  },
  // "Criar" fica visível como na referência; a tela será desenhada em uma próxima etapa.
  { href: null, match: '/musica/criar', label: 'Criar', icon: 'add', iconActive: 'add' },
];

const TAB_W = 1480 / TABS.length;

/**
 * Área de Música: primeiro a apresentação/login; depois o conteúdo, o player minimizado
 * (somente aqui) e, abaixo dele, as abas.
 */
export default function MusicLayout() {
  const c = useColors();
  const { musicConnected, setMusicConnected } = usePrototype();
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.match === pathname),
  );
  const x = useSpring(activeIndex * TAB_W);

  if (!musicConnected) return <SpotifyConnect onConnect={() => setMusicConnected(true)} />;

  return (
    <View style={{ flex: 1 }}>
      {/* O fundo continua por baixo da barra lateral, que o desfoca. */}
      <View style={[styles.bleed, { backgroundColor: c.music.background }]}>
        <LinearGradient
          colors={[c.music.ambient, `${c.music.ambient}00`]}
          style={[StyleSheet.absoluteFill, { height: 360 }]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <ScreenTransition routeKey={pathname}>
          <Slot />
        </ScreenTransition>
      </View>

      <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[2] }}>
        <MiniPlayer />
      </View>

      <View style={[styles.tabs, { backgroundColor: c.music.tabBar }]}>
        <Animated.View
          style={[styles.indicator, { backgroundColor: c.text, transform: [{ translateX: x }] }]}
        />
        {TABS.map((t) => {
          const active = pathname === t.match;
          return (
            <Touchable
              key={t.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => t.href && router.replace(t.href)}
              scaleTo={0.9}
              style={styles.tab}
            >
              <Icon
                name={active ? t.iconActive : t.icon}
                size={36}
                color={active ? c.text : c.textSecondary}
              />
              <Text variant="footnote" tone={active ? 'primary' : 'secondary'}>
                {t.label}
              </Text>
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { position: 'absolute', top: 0, right: 0, bottom: 0, left: -layout.sidebarWidth },
  tabs: { flexDirection: 'row', height: 100 },
  tab: { width: TAB_W, height: 100, alignItems: 'center', justifyContent: 'center', gap: 4 },
  indicator: {
    position: 'absolute',
    bottom: 10,
    left: TAB_W / 2 - 80,
    width: 160,
    height: 5,
    borderRadius: 3,
  },
});
