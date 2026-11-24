import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';
import { usePhone } from '../../layout/form-factor';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { ClientsScene, RouteScene, VoiceScene } from '../../onboarding/scenes';
import { nativeDriver, useColors } from '../../theme';
import { LogoMark } from '../../ui/brand';
import { appleEase } from '../../ui/motion';
import { Text } from '../../ui/primitives';

/**
 * Onboarding — 1) a marca aparece e sai; 2) três páginas com uma ilustração animada cada
 * (clientes, rota, voz), no mesmo molde no celular e na multimídia.
 */
export default function Welcome() {
  const router = useRouter();
  const [phase, setPhase] = useState<'logo' | 'content'>('logo');
  if (phase === 'logo') return <Intro onDone={() => setPhase('content')} />;
  return <Pages onDone={() => router.push('/onboarding/permissoes')} />;
}

/**
 * Abertura: a logo aparece sozinha no centro (cresce com mola), depois desliza para a
 * esquerda e o nome "GoClient" surge de trás dela; por fim tudo some junto.
 */
function Intro({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const phone = usePhone();
  const logoIn = useRef(new Animated.Value(0)).current;
  const name = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  // Largura do nome, medida na tela, para a logo começar exatamente no centro.
  const [nameW, setNameW] = useState(0);
  const size = phone ? 128 : 150;
  const gap = phone ? 24 : 32;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (nameW === 0) return;
    const anim = Animated.sequence([
      Animated.spring(logoIn, {
        toValue: 1,
        damping: 14,
        stiffness: 140,
        useNativeDriver: nativeDriver,
      }),
      Animated.delay(200),
      Animated.timing(name, {
        toValue: 1,
        duration: 620,
        easing: appleEase,
        useNativeDriver: nativeDriver,
      }),
      Animated.delay(900),
      Animated.timing(out, {
        toValue: 1,
        duration: 360,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
    ]);
    anim.start(({ finished }) => finished && done.current());
    return () => anim.stop();
  }, [nameW, logoIn, name, out]);

  const shift = (nameW + gap) / 2;
  return (
    <View style={[styles.center, { backgroundColor: c.background }]}>
      <Animated.View
        style={[
          styles.lockup,
          {
            gap,
            opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }],
          },
        ]}
      >
        <Animated.View
          style={{
            zIndex: 1,
            opacity: logoIn.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateX: name.interpolate({ inputRange: [0, 1], outputRange: [shift, 0] }) },
              { scale: logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
          }}
        >
          <LogoMark size={size} />
        </Animated.View>
        <Animated.View
          onLayout={(e) => setNameW(e.nativeEvent.layout.width)}
          style={{
            // O nome só aparece quando a logo já abriu espaço (não aparece por trás dela).
            opacity: name.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0, 1] }),
            transform: [
              {
                translateX: name.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-48, 0],
                }),
              },
            ],
          }}
        >
          <Text
            variant="largeTitle"
            style={{
              fontSize: phone ? 72 : 88,
              lineHeight: phone ? 80 : 98,
              letterSpacing: -1.5,
            }}
          >
            GoClient
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
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
  lockup: { flexDirection: 'row', alignItems: 'center' },
});
