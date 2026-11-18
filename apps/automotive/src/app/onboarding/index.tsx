import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { nativeDriver, spacing, useColors } from '../../theme';
import { LogoMark } from '../../ui/brand';
import { Appear } from '../../ui/motion';
import { Button, Icon, type IconName, Text } from '../../ui/primitives';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'people',
    title: 'Sua carteira no painel',
    text: 'Clientes, pedidos e histórico de visitas a um toque.',
  },
  {
    icon: 'git-network',
    title: 'Rotas que se organizam',
    text: 'Escolha quem visitar hoje e o GoClient monta o trajeto.',
  },
  {
    icon: 'mic',
    title: 'Havena ao seu lado',
    text: 'Pergunte e organize por voz, sem tirar as mãos do volante.',
  },
];

/**
 * Onboarding — 1) a marca aparece e sai; 2) título, subtítulo e destaques entram em
 * sequência; 3) por último, o botão para continuar.
 */
export default function Welcome() {
  const c = useColors();
  const router = useRouter();
  const [phase, setPhase] = useState<'logo' | 'content'>('logo');
  const logo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logo, {
        toValue: 1,
        damping: 14,
        stiffness: 120,
        useNativeDriver: nativeDriver,
      }),
      Animated.delay(700),
      Animated.timing(logo, {
        toValue: 2,
        duration: 380,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
    ]).start(() => setPhase('content'));
  }, [logo]);

  if (phase === 'logo') {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Animated.View
          style={{
            opacity: logo.interpolate({ inputRange: [0, 0.4, 1, 2], outputRange: [0, 1, 1, 0] }),
            transform: [
              { scale: logo.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 0.9] }) },
            ],
          }}
        >
          <LogoMark size={180} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: c.background }]}>
      <View style={styles.column}>
        <Appear distance={20}>
          <LogoMark size={88} />
        </Appear>
        <Appear delay={90} distance={20} style={{ alignItems: 'center', gap: spacing[3] }}>
          <Text variant="largeTitle" style={{ textAlign: 'center' }}>
            Bem-vindo ao GoClient
          </Text>
          <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 760 }}>
            Tudo o que você precisa para vender na estrada, pensado para a tela do seu carro.
          </Text>
        </Appear>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <Appear key={f.title} delay={260 + i * 110} distance={18} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={48} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{f.title}</Text>
                <Text variant="callout" tone="secondary">
                  {f.text}
                </Text>
              </View>
            </Appear>
          ))}
        </View>

        <Appear delay={760} distance={16} style={{ width: 560 }}>
          <Button label="Continuar" onPress={() => router.push('/onboarding/permissoes')} />
        </Appear>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: { width: 820, alignItems: 'center', gap: spacing[8] },
  features: { alignSelf: 'stretch', gap: spacing[6], paddingHorizontal: spacing[10] },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing[6] },
  featureIcon: { width: 64, alignItems: 'center' },
});
