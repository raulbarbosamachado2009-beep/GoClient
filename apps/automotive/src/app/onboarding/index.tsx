import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { ClientsScene, RouteScene, VoiceScene } from '../../onboarding/scenes';
import { nativeDriver, useColors } from '../../theme';
import { LogoMark } from '../../ui/brand';

/**
 * Onboarding — 1) a marca aparece e sai; 2) três páginas com uma ilustração animada cada
 * (clientes, rota, voz), no mesmo molde no celular e na multimídia.
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

  return <Pages onDone={() => router.push('/onboarding/permissoes')} />;
}

const PAGES = [
  {
    key: 'clientes',
    badge: 'Clientes do Kyte',
    title: 'Sua carteira inteira no painel',
    text: 'Clientes, pedidos e produtos do Kyte a um toque, no carro e no celular.',
    scene: <ClientsScene />,
  },
  {
    key: 'rotas',
    badge: 'Rotas',
    title: 'O dia organizado em uma rota',
    text: 'Escolha quem visitar e o GoClient traça o caminho, parada por parada.',
    scene: <RouteScene />,
  },
  {
    key: 'voz',
    badge: 'Assistente de voz',
    title: 'Fale com o Lucas',
    text: 'Pergunte pelo próximo cliente ou monte a rota sem tirar as mãos do volante.',
    scene: <VoiceScene />,
  },
];

/** Páginas de apresentação: deslizar para os lados ou tocar em Continuar. */
function Pages({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const page = PAGES[index] as (typeof PAGES)[number];
  const last = index === PAGES.length - 1;
  const next = () => (last ? onDone() : setIndex(index + 1));
  const indexRef = useRef(index);
  indexRef.current = index;
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -50 && indexRef.current < PAGES.length - 1) setIndex(indexRef.current + 1);
        else if (g.dx > 50 && indexRef.current > 0) setIndex(indexRef.current - 1);
      },
    }),
  ).current;
  return (
    <View style={{ flex: 1 }} {...swipe.panHandlers}>
      <OnboardingLayout
        sceneKey={page.key}
        scene={page.scene}
        badge={page.badge}
        title={page.title}
        text={page.text}
        dots={{ index, count: PAGES.length }}
        onSkip={last ? undefined : onDone}
        actions={<PillButton label={last ? 'Começar' : 'Continuar'} onPress={next} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
