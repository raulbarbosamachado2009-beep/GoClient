import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Animated } from 'react-native';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { requestPermission } from '../../onboarding/permissions';
import { useColors } from '../../theme';
import { usePageTransition } from '../../ui/motion';
import { Icon, type IconName } from '../../ui/primitives';

interface Step {
  kind: 'location' | 'microphone';
  icon: IconName;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    kind: 'location',
    icon: 'location',
    title: 'Permitir localização',
    text: 'Para traçar rotas até seus clientes. Usada só com o app aberto.',
  },
  {
    kind: 'microphone',
    icon: 'mic',
    title: 'Permitir microfone',
    text: 'Para conversar com o Lucas. Ele só escuta quando você chama.',
  },
];

/**
 * Onboarding — uma tela por permissão (celular e multimídia), minimalista: ícone pequeno,
 * título e subtítulo no meio da tela, e os botões embaixo. "Permitir" abre o pedido do
 * próprio sistema; "Agora não" segue sem ela (dá para mudar depois em Ajustes).
 */
export default function Permissions() {
  const router = useRouter();
  const c = useColors();
  const [step, setStep] = useState(0);
  const cur = STEPS[Math.min(step, STEPS.length - 1)] as Step;
  const page = usePageTransition();
  const next = () =>
    step + 1 < STEPS.length
      ? setStep(step + 1)
      : page.leave(() => router.replace('/onboarding/login'));
  return (
    <Animated.View style={[{ flex: 1 }, page.style]}>
      <OnboardingLayout
        sceneKey={cur.kind}
        scene={null}
        hero={<Icon name={cur.icon} size={64} color={c.accent} />}
        title={cur.title}
        text={cur.text}
        dots={{ index: step, count: STEPS.length }}
        actions={
          <>
            <PillButton
              label="Permitir"
              onPress={() => {
                requestPermission(cur.kind).finally(next);
              }}
            />
            <PillButton label="Agora não" variant="plain" onPress={next} />
          </>
        }
      />
    </Animated.View>
  );
}
