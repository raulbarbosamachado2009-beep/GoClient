import { type Href, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, layout, spacing } from '../theme';
import { LogoMark } from '../ui/brand';
import { Icon, type IconName, Text, Touchable } from '../ui/primitives';

interface Item {
  href: Href;
  match: string;
  label: string;
  icon: IconName;
  iconActive: IconName;
}

const ITEMS: Item[] = [
  { href: '/mapa', match: '/mapa', label: 'Mapa', icon: 'map-outline', iconActive: 'map' },
  {
    href: '/clientes',
    match: '/clientes',
    label: 'Clientes',
    icon: 'people-outline',
    iconActive: 'people',
  },
  {
    href: '/produtos',
    match: '/produtos',
    label: 'Produtos',
    icon: 'cube-outline',
    iconActive: 'cube',
  },
  {
    href: '/rotas',
    match: '/rotas',
    label: 'Rotas',
    icon: 'git-network-outline',
    iconActive: 'git-network',
  },
  {
    href: '/musica',
    match: '/musica',
    label: 'Música',
    icon: 'musical-notes-outline',
    iconActive: 'musical-notes',
  },
];

/** Menu lateral fixo do Automotive: alvos grandes, rótulo sempre visível, item ativo evidente. */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const renderItem = (item: Item) => {
    const active = pathname.startsWith(item.match);
    return (
      <Touchable
        key={item.label}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        onPress={() => router.replace(item.href)}
        style={[styles.item, active && styles.itemActive]}
      >
        <Icon
          name={active ? item.iconActive : item.icon}
          size={34}
          color={active ? colors.accent : colors.textSecondary}
        />
        <Text variant="label" tone={active ? 'primary' : 'secondary'} style={{ fontSize: 16 }}>
          {item.label}
        </Text>
      </Touchable>
    );
  };

  const settingsActive = pathname.startsWith('/configuracoes');

  return (
    <View style={styles.bar}>
      <View style={styles.status}>
        <Text variant="headline" style={{ fontSize: 24 }}>
          09:41
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Icon name="cellular" size={18} color={colors.textSecondary} />
          <Icon name="wifi" size={18} color={colors.textSecondary} />
        </View>
      </View>

      <View style={{ gap: spacing[2] }}>{ITEMS.map(renderItem)}</View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: spacing[3], alignItems: 'center' }}>
        {/* Havena: botão de voz (apenas visual nesta fase). */}
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Falar com a Havena"
          style={styles.havena}
        >
          <Icon name="mic" size={34} color="#FFFFFF" />
        </Touchable>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          onPress={() => router.replace('/configuracoes')}
          style={[styles.item, settingsActive && styles.itemActive, { height: 84 }]}
        >
          <Icon
            name={settingsActive ? 'settings' : 'settings-outline'}
            size={32}
            color={settingsActive ? colors.accent : colors.textSecondary}
          />
        </Touchable>
        <LogoMark size={40} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: layout.sidebarWidth,
    paddingVertical: spacing[5],
    paddingHorizontal: 12,
    backgroundColor: colors.panel,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    alignItems: 'stretch',
  },
  status: { alignItems: 'center', gap: 4, marginBottom: spacing[6] },
  item: {
    height: 96,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  itemActive: { backgroundColor: colors.panelHigh },
  havena: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
