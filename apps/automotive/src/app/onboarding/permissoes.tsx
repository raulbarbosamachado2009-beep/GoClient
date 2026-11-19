import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { spacing, useColors } from '../../theme';
import { Appear } from '../../ui/motion';
import { Button, Icon, type IconName, Text } from '../../ui/primitives';

const PERMISSIONS: { icon: IconName; title: string; text: string; optional?: boolean }[] = [
  { icon: 'mic', title: 'Microfone', text: 'Para você conversar com a Havena enquanto dirige.' },
  {
    icon: 'location',
    title: 'Localização',
    text: 'Para mostrar o mapa e calcular rotas até seus clientes.',
  },
  {
    icon: 'sparkles',
    title: 'Havena (inteligência artificial)',
    text: 'Seus pedidos de voz são processados para consultar e organizar informações.',
    optional: true,
  },
  {
    icon: 'server',
    title: 'Memória e armazenamento',
    text: 'Clientes e produtos ficam no aparelho para funcionar sem internet.',
  },
];

/** Onboarding — o que o app precisa para funcionar no carro. */
export default function Permissions() {
  const c = useColors();
  const router = useRouter();
  const go = () => router.replace('/onboarding/login');

  return (
    <View style={[styles.page, { backgroundColor: c.background }]}>
      <View style={styles.column}>
        <Appear distance={20}>
          <Icon name="hand-left" size={84} color={c.accent} />
        </Appear>
        <Appear delay={80} distance={20} style={{ alignItems: 'center', gap: spacing[3] }}>
          <Text variant="largeTitle" style={{ textAlign: 'center' }}>
            Permissões
          </Text>
          <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 760 }}>
            Para funcionar no carro, o GoClient precisa de alguns acessos. Você pode mudar isso
            depois em Ajustes.
          </Text>
        </Appear>

        <View style={styles.list}>
          {PERMISSIONS.map((p, i) => (
            <Appear key={p.title} delay={220 + i * 90} distance={18} style={styles.item}>
              <View style={styles.icon}>
                <Icon name={p.icon} size={44} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[3] }}>
                  <Text variant="headline">{p.title}</Text>
                  {p.optional && (
                    <Text variant="caption" tone="secondary">
                      Opcional
                    </Text>
                  )}
                </View>
                <Text variant="callout" tone="secondary">
                  {p.text}
                </Text>
              </View>
            </Appear>
          ))}
        </View>

        <Appear delay={640} distance={16} style={{ width: 560, gap: spacing[2] }}>
          <Button label="Permitir e continuar" onPress={go} />
          <Button label="Agora não" variant="plain" onPress={go} />
        </Appear>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: { width: 860, alignItems: 'center', gap: spacing[6] },
  list: { alignSelf: 'stretch', gap: spacing[5], paddingHorizontal: spacing[10] },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing[6] },
  icon: { width: 64, alignItems: 'center' },
});
