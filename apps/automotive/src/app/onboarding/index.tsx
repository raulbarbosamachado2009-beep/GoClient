import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, nativeDriver, spacing } from '../../theme';
import { LogoMark, Wordmark } from '../../ui/brand';
import { Button, Icon, type IconName, Text } from '../../ui/primitives';

const HIGHLIGHTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'people-outline', title: 'Clientes', text: 'Carteira, histórico e contato em um toque' },
  {
    icon: 'git-network-outline',
    title: 'Rotas',
    text: 'Selecione as visitas e a rota se organiza',
  },
  { icon: 'sparkles-outline', title: 'Havena', text: 'Sua assistente por voz durante o trajeto' },
];

/**
 * Onboarding — apresentação.
 * 1. A marca aparece e sai. 2. Título, subtítulo e destaques entram em sequência.
 * 3. Só então o botão para avançar aparece.
 */
export default function Welcome() {
  const router = useRouter();
  const [phase, setPhase] = useState<'logo' | 'content'>('logo');

  const logo = useRef(new Animated.Value(0)).current;
  const items = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const ease = Easing.bezier(0.2, 0, 0, 1);
    Animated.sequence([
      Animated.timing(logo, {
        toValue: 1,
        duration: 700,
        easing: ease,
        useNativeDriver: nativeDriver,
      }),
      Animated.delay(900),
      Animated.timing(logo, {
        toValue: 2,
        duration: 450,
        easing: Easing.in(Easing.quad),
        useNativeDriver: nativeDriver,
      }),
    ]).start(() => {
      setPhase('content');
      Animated.stagger(
        160,
        items.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 520,
            easing: ease,
            useNativeDriver: nativeDriver,
          }),
        ),
      ).start();
    });
  }, [logo, items]);

  const enter = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  if (phase === 'logo') {
    return (
      <View style={styles.center}>
        <Animated.View
          style={{
            alignItems: 'center',
            gap: spacing[5],
            opacity: logo.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
            transform: [
              { scale: logo.interpolate({ inputRange: [0, 1, 2], outputRange: [0.86, 1, 1.06] }) },
            ],
          }}
        >
          <LogoMark size={168} />
          <Wordmark size={56} />
        </Animated.View>
      </View>
    );
  }

  const [i0, i1, i2, i3, i4] = items as [
    Animated.Value,
    Animated.Value,
    Animated.Value,
    Animated.Value,
    Animated.Value,
  ];

  return (
    <View style={styles.page}>
      <View style={styles.copy}>
        <Animated.View
          style={[enter(i0), { flexDirection: 'row', alignItems: 'center', gap: spacing[4] }]}
        >
          <LogoMark size={64} />
          <Text variant="headline" tone="secondary">
            GoClient
          </Text>
        </Animated.View>
        <Animated.View style={enter(i1)}>
          <Text variant="display" style={{ fontSize: 72, lineHeight: 80 }}>
            Bem-vindo{'\n'}ao seu escritório{'\n'}sobre rodas.
          </Text>
        </Animated.View>
        <Animated.View style={enter(i2)}>
          <Text
            variant="body"
            tone="secondary"
            style={{ maxWidth: 640, fontSize: 26, lineHeight: 36 }}
          >
            Clientes, produtos, rotas de visita e música reunidos em um só lugar — pensado para quem
            vende na estrada.
          </Text>
        </Animated.View>
      </View>

      <View style={styles.side}>
        <Animated.View style={[enter(i3), { gap: spacing[4] }]}>
          {HIGHLIGHTS.map((h) => (
            <View key={h.title} style={styles.highlight}>
              <View style={styles.highlightIcon}>
                <Icon name={h.icon} size={36} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="headline">{h.title}</Text>
                <Text variant="caption" tone="secondary">
                  {h.text}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>
        <Animated.View style={enter(i4)}>
          <Button
            label="Continuar"
            icon="arrow-forward"
            onPress={() => router.push('/onboarding/permissoes')}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 96,
    paddingVertical: 80,
    gap: 96,
    backgroundColor: colors.background,
  },
  copy: { flex: 1.2, justifyContent: 'center', gap: spacing[8] },
  side: { flex: 1, justifyContent: 'center', gap: spacing[10] },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    padding: spacing[5],
    borderRadius: 24,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(10,132,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
