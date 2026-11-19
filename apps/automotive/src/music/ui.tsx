import { type Href, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing, useColors } from '../theme';
import { Icon, type IconName, Material, Text, Touchable } from '../ui/primitives';

/** Pílula de filtro da Música: verde quando selecionada (referências 3 e 5). */
export function MusicChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
  const fg = selected ? c.music.onAccent : c.text;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: c.music.accent, paddingHorizontal: icon ? spacing[8] : 52 }
          : { backgroundColor: c.music.card, borderColor: c.music.cardBorder, borderWidth: 1 },
      ]}
    >
      {icon && <Icon name={icon} size={34} color={fg} />}
      <Text variant="headline" color={fg} style={{ fontSize: 28 }}>
        {label}
      </Text>
    </Touchable>
  );
}

/** Título de seção com ação opcional à direita ("Ver mais"). */
export function MusicSection({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.section}>
      <Text variant="title2" style={{ fontSize: 34, lineHeight: 40 }}>
        {title}
      </Text>
      {action && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="callout" tone="secondary">
            {action}
          </Text>
          <Icon name="chevron-forward" size={24} />
        </View>
      )}
    </View>
  );
}

/** Linha/cartão de playlist com capa encostada à esquerda (referências 3 e 5). */
export function PlaylistTile({
  cover,
  title,
  subtitle,
  onPress,
  height = 104,
}: {
  cover: ReactNode;
  title: string;
  subtitle?: ReactNode;
  onPress?: () => void;
  height?: number;
}) {
  const c = useColors();
  return (
    <Touchable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.98}
      style={[
        styles.tile,
        { height, backgroundColor: c.music.card, borderColor: c.music.cardBorder },
      ]}
    >
      {cover}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title2" style={{ fontSize: 30, lineHeight: 36 }} numberOfLines={2}>
          {title}
        </Text>
        {subtitle}
      </View>
      <Icon name="chevron-forward" size={38} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 74,
    borderRadius: 37,
    paddingHorizontal: spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingRight: spacing[6],
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

/**
 * Botão de voltar das páginas internas da Música. Vai sempre para um destino explícito
 * (e não para o histórico), para nunca cair em outra seção do app por engano.
 */
export function MusicBack({ to, size = 96 }: { to: Href; size?: number }) {
  const router = useRouter();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      onPress={() => router.replace(to)}
      scaleTo={0.9}
    >
      <Material
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        radius={20}
      >
        <Icon name="chevron-back" size={size * 0.46} color="#FFFFFF" />
      </Material>
    </Touchable>
  );
}
