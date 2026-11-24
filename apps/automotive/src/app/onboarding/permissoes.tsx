import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, AppState, StyleSheet, View } from 'react-native';
import { usePhone } from '../../layout/form-factor';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { hasPermission, requestPermission } from '../../onboarding/permissions';
import { PermissionHero } from '../../onboarding/scenes';
import { concentric, spacing, useColors } from '../../theme';
import { usePageTransition } from '../../ui/motion';
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
  // 'settings': o Android não mostra mais o pop-up (recusado antes); mandamos para os Ajustes.
  const [state, setState] = useState<'idle' | 'asking' | 'granted' | 'settings'>('idle');
  const cur = STEPS[Math.min(step, STEPS.length - 1)] as Step;
  const page = usePageTransition();
  const next = () => {
    setState('idle');
    if (step + 1 < STEPS.length) setStep(step + 1);
    else page.leave(() => router.replace('/onboarding/login'));
  };
  const grantedThenNext = () => {
    setState('granted');
    setTimeout(next, 700);
  };

  // Já liberada (ex.: instalou por cima): mostra "Permitido" em vez de pedir de novo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refaz só ao trocar de etapa
  useEffect(() => {
    let alive = true;
    hasPermission(cur.kind).then((ok) => alive && ok && setState('granted'));
    return () => {
      alive = false;
    };
  }, [cur.kind]);

  // Voltou dos Ajustes do aparelho: confere de novo e segue se a pessoa liberou.
  // biome-ignore lint/correctness/useExhaustiveDependencies: depende só do estado da etapa
  useEffect(() => {
    if (state !== 'settings') return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') hasPermission(cur.kind).then((ok) => ok && grantedThenNext());
    });
    return () => sub.remove();
  }, [state, cur.kind]);

  const onAllow = () => {
    if (state === 'asking') return;
    if (state === 'granted') return next();
    setState('asking');
    requestPermission(cur.kind).then((r) => {
      if (r === 'granted') grantedThenNext();
      else if (r === 'settings') setState('settings');
      else setState('idle');
    });
  };

  const text =
    state === 'settings'
      ? 'O Android não mostra mais o pedido porque ele foi recusado antes. Abrimos os Ajustes do GoClient: toque em Permissões e libere. Depois é só voltar.'
      : state === 'granted'
        ? 'Permitido. Tudo certo.'
        : cur.text;
  const label =
    state === 'granted'
      ? 'Continuar'
      : state === 'settings'
        ? 'Abrir Ajustes de novo'
        : state === 'asking'
          ? 'Aguardando…'
          : 'Permitir';

  return (
    <Animated.View style={[{ flex: 1 }, page.style]}>
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
        hero={<PermissionHero icon={state === 'granted' ? 'checkmark-circle' : cur.icon} />}
        title={cur.title}
        text={text}
        body={phone ? <Perks perks={cur.perks} /> : undefined}
        dots={{ index: step, count: STEPS.length }}
        actions={
          <>
            <PillButton label={label} onPress={onAllow} />
            {state !== 'granted' && <PillButton label="Agora não" variant="plain" onPress={next} />}
          </>
        }
      />
    </Animated.View>
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
