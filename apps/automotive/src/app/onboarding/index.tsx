import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { LucasIntro } from '../../havena/cloud-intro';
import { usePhone } from '../../layout/form-factor';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { ClientsScene, RouteScene, VoiceScene } from '../../onboarding/scenes';
import { useColors } from '../../theme';
import { usePageTransition } from '../../ui/motion';

/**
 * Onboarding — 1) a nuvem do Lucas se forma e sai; 2) uma página só com três etapas (27/11: o
 * quadro fica, os elementos dele saem e entram; os textos trocam desfocando) com uma ilustração cada
 * (clientes, rota, voz), no mesmo molde no celular e na multimídia.
 */
export default function Welcome() {
  const router = useRouter();
  const [phase, setPhase] = useState<'logo' | 'content'>('logo');
  // Sair para as permissões: a página recua e desfoca antes de trocar (ver usePageTransition).
  const page = usePageTransition();
  return (
    <Animated.View style={[{ flex: 1 }, page.style]}>
      {phase === 'logo' ? (
        <Intro onDone={() => setPhase('content')} />
      ) : (
        <Pages onDone={() => page.leave(() => router.push('/onboarding/permissoes'))} />
      )}
    </Animated.View>
  );
}

/**
 * Abertura: só a nuvem do Lucas, sem o nome (pedido de 26/11/2026). Ela se forma bolha por
 * bolha, abre os olhos, olha em volta e some (ver `havena/cloud-intro.tsx`).
 */
function Intro({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const phone = usePhone();
  return (
    <View style={[styles.center, { backgroundColor: c.background }]}>
      <LucasIntro size={phone ? 260 : 300} onDone={onDone} />
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
        morph
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
