import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePhone } from '../../layout/form-factor';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { requestPermission } from '../../onboarding/permissions';
import { PermissionHero } from '../../onboarding/scenes';
import { concentric, spacing, useColors } from '../../theme';
import { Icon, type IconName, Text } from '../../ui/primitives';

interface Step {
  kind: 'location' | 'microphone';
  icon: IconName;
  title: string;
  text: string;
  /** O que a permissão libera, em três linhas curtas. */
  perks: { icon: IconName; title: string; text: string }[];
}

const STEPS: Step[] = [
  {
    kind: 'location',
    icon: 'location',
    title: 'Rotas até seus clientes',
    text: 'O GoClient usa a localização só enquanto o app está aberto.',
    perks: [
      { icon: 'navigate', title: 'Onde você está', text: 'Seu ponto no mapa, em tempo real.' },
      { icon: 'trail-sign', title: 'Rota do dia', text: 'As visitas na melhor ordem.' },
      { icon: 'volume-high', title: 'Navegação com voz', text: 'Cada curva falada em voz alta.' },
    ],
  },
  {
    kind: 'microphone',
    icon: 'mic',
    title: 'Converse com o Lucas',
    text: 'O microfone só escuta quando você chama o Lucas.',
    perks: [
      { icon: 'chatbubble-ellipses', title: '"Olá, Lucas"', text: 'Chame sem tocar na tela.' },
      { icon: 'people', title: 'Clientes e pedidos', text: 'Pergunte e ouça a resposta.' },
      { icon: 'map', title: 'Rotas por voz', text: 'Monte o dia falando.' },
    ],
  },
];

/** Raio do grupo e espaçamento interno: os ícones das linhas seguem a borda concêntrica. */
const GROUP_R = 40;
const GROUP_PAD = 24;

/**
 * Onboarding — uma tela por permissão (celular e multimídia): ícone com anéis pulsando,
 * título, uma frase sobre privacidade e o que a permissão libera. "Permitir" abre o pedido do
 * próprio sistema; "Agora não" segue sem ela (dá para mudar depois em Ajustes).
 */
export default function Permissions() {
  const router = useRouter();
  const phone = usePhone();
  const [step, setStep] = useState(0);
  const cur = STEPS[Math.min(step, STEPS.length - 1)] as Step;
  const next = () =>
    step + 1 < STEPS.length ? setStep(step + 1) : router.replace('/onboarding/login');
  return (
    <OnboardingLayout
      sceneKey={cur.kind}
      // Celular: tudo numa coluna. Multimídia: a lista vai no quadro da esquerda (não cabe
      // embaixo do texto na altura da tela).
      scene={
        phone ? null : (
          <View style={styles.sceneCar}>
            <Perks perks={cur.perks} plain />
          </View>
        )
      }
      hero={<PermissionHero icon={cur.icon} />}
      title={cur.title}
      text={cur.text}
      body={phone ? <Perks perks={cur.perks} /> : undefined}
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

function Perks({ perks, plain }: { perks: Step['perks']; plain?: boolean }) {
  const c = useColors();
  return (
    <View
      style={
        plain ? undefined : [styles.group, { backgroundColor: c.grouped, marginTop: spacing[4] }]
      }
    >
      {perks.map((p, i) => (
        <View key={p.title}>
          {i > 0 && <View style={[styles.sep, { backgroundColor: c.separator }]} />}
          <View style={styles.row}>
            <View style={[styles.tile, { backgroundColor: c.fill }]}>
              <Icon name={p.icon} size={36} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline" style={styles.rowTitle} numberOfLines={1}>
                {p.title}
              </Text>
              <Text variant="callout" tone="secondary" style={styles.rowText} numberOfLines={2}>
                {p.text}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sceneCar: { flex: 1, justifyContent: 'center' },
  group: { borderRadius: GROUP_R, paddingHorizontal: GROUP_PAD, paddingVertical: spacing[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[5], paddingVertical: spacing[4] },
  tile: {
    width: 72,
    height: 72,
    borderRadius: concentric(GROUP_R, GROUP_PAD),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 72 + spacing[5] },
  rowTitle: { fontSize: 28, lineHeight: 34 },
  rowText: { fontSize: 24, lineHeight: 30 },
});
