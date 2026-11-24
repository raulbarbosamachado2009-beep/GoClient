import { useRouter } from 'expo-router';
import { useState } from 'react';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { requestPermission } from '../../onboarding/permissions';
import { PermissionScene } from '../../onboarding/scenes';
import type { IconName } from '../../ui/primitives';

const STEPS: {
  kind: 'location' | 'microphone';
  icon: IconName;
  badge: string;
  title: string;
  text: string;
}[] = [
  {
    kind: 'location',
    icon: 'location',
    badge: 'Localização',
    title: 'Rotas até seus clientes',
    text: 'Permita a localização para o GoClient mostrar onde você está e traçar o caminho até cada visita.',
  },
  {
    kind: 'microphone',
    icon: 'mic',
    badge: 'Microfone',
    title: 'Converse com o Lucas',
    text: 'Permita o microfone para pedir rotas, consultar clientes e organizar o dia por voz.',
  },
];

/**
 * Onboarding — uma tela por permissão (celular e multimídia). "Permitir" abre o pedido do
 * próprio sistema; "Agora não" segue sem ela (dá para mudar depois em Ajustes).
 */
export default function Permissions() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const cur = STEPS[Math.min(step, STEPS.length - 1)] as (typeof STEPS)[number];
  const next = () =>
    step + 1 < STEPS.length ? setStep(step + 1) : router.replace('/onboarding/login');
  return (
    <OnboardingLayout
      sceneKey={cur.kind}
      scene={<PermissionScene icon={cur.icon} />}
      badge={cur.badge}
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
  );
}
