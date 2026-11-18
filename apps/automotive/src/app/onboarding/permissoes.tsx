import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, nativeDriver, spacing } from '../../theme';
import { Button, Icon, type IconName, Text } from '../../ui/primitives';

const PERMISSIONS: { icon: IconName; title: string; text: string; required: boolean }[] = [
  {
    icon: 'mic-outline',
    title: 'Microfone',
    text: 'Para você falar com a Havena sem tirar as mãos do volante.',
    required: true,
  },
  {
    icon: 'location-outline',
    title: 'Localização',
    text: 'Para mostrar o mapa e calcular as rotas até seus clientes.',
    required: true,
  },
  {
    icon: 'sparkles-outline',
    title: 'Havena · Inteligência Artificial',
    text: 'Seus pedidos de voz são processados para consultar e organizar informações.',
    required: false,
  },
  {
    icon: 'server-outline',
    title: 'Memória e armazenamento',
    text: 'Guardamos clientes e produtos no aparelho para funcionar sem internet.',
    required: true,
  },
];

/** Onboarding — permissões necessárias para o app funcionar no carro. */
export default function Permissions() {
  const router = useRouter();
  const items = useRef([0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      110,
      items.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 460,
          easing: Easing.bezier(0.2, 0, 0, 1),
          useNativeDriver: nativeDriver,
        }),
      ),
    ).start();
  }, [items]);

  const enter = (v: Animated.Value | undefined) =>
    v
      ? {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }
      : {};

  return (
    <View style={styles.page}>
      <Animated.View style={[styles.copy, enter(items[0])]}>
        <View style={styles.badge}>
          <Icon name="shield-checkmark-outline" size={44} color={colors.accent} />
        </View>
        <Text variant="display">Antes de começar</Text>
        <Text variant="body" tone="secondary" style={{ fontSize: 26, lineHeight: 36 }}>
          Para funcionar bem no carro, o GoClient precisa de alguns acessos. Você pode revisar cada
          um depois em Configurações.
        </Text>
        <View style={{ gap: spacing[4], marginTop: spacing[6] }}>
          <Button label="Permitir e continuar" onPress={() => router.replace('/mapa')} />
          <Button label="Agora não" variant="ghost" onPress={() => router.replace('/mapa')} />
        </View>
      </Animated.View>

      <View style={styles.grid}>
        {PERMISSIONS.map((p, i) => (
          <Animated.View key={p.title} style={[styles.card, enter(items[i + 1])]}>
            <View style={styles.cardTop}>
              <View style={styles.iconWrap}>
                <Icon name={p.icon} size={40} color={colors.text} />
              </View>
              <Text variant="label" tone={p.required ? 'accent' : 'tertiary'}>
                {p.required ? 'NECESSÁRIO' : 'OPCIONAL'}
              </Text>
            </View>
            <Text variant="headline">{p.title}</Text>
            <Text variant="callout" tone="secondary">
              {p.text}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 96,
    paddingVertical: 72,
    gap: 72,
    backgroundColor: colors.background,
  },
  copy: { width: 560, justifyContent: 'center', gap: spacing[5] },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(10,132,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    gap: spacing[5],
  },
  card: {
    width: '47.5%',
    minHeight: 300,
    padding: spacing[8],
    borderRadius: 28,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.panelHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
