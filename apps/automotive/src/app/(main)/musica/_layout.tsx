import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SpotifyConnect } from '../../../music/connect';
import { usePrototype } from '../../../prototype/state';
import { colors, spacing } from '../../../theme';
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
    icon: 'search',
    iconActive: 'search',
  },
  {
    href: '/musica/biblioteca',
    match: '/musica/biblioteca',
    label: 'Sua Biblioteca',
    icon: 'library-outline',
    iconActive: 'library',
  },
  // "Criar" fica visível como na referência; a tela será desenhada numa próxima etapa.
  { href: null, match: '/musica/criar', label: 'Criar', icon: 'add', iconActive: 'add' },
];

/** Área de música: primeiro a apresentação/login; depois as abas próprias do módulo. */
export default function MusicLayout() {
  const { musicConnected, setMusicConnected } = usePrototype();
  const pathname = usePathname();
  const router = useRouter();

  if (!musicConnected) return <SpotifyConnect onConnect={() => setMusicConnected(true)} />;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['rgba(15,74,38,0.55)', 'rgba(0,0,0,0)']}
        style={[StyleSheet.absoluteFill, { height: 320 }]}
      />
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = pathname === t.match;
          return (
            <Touchable
              key={t.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => t.href && router.replace(t.href)}
              style={styles.tab}
            >
              <Icon
                name={active ? t.iconActive : t.icon}
                size={34}
                color={active ? colors.text : colors.textSecondary}
              />
              <Text variant="label" tone={active ? 'primary' : 'secondary'}>
                {t.label}
              </Text>
              {active && <View style={styles.indicator} />}
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    height: 96,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#0A0A0B',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[1] },
  indicator: {
    position: 'absolute',
    bottom: 8,
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
});
