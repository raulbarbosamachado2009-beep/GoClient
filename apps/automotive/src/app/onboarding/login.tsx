import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { usePhone } from '../../layout/form-factor';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { concentric, spacing, type, useColors } from '../../theme';
import { Appear, Swap } from '../../ui/motion';
import { Icon, type IconName, Text, Touchable } from '../../ui/primitives';

/**
 * Onboarding — login, depois das permissões e antes do mapa (referência: telas de entrada
 * com ilustração em cima, marca, e botões em pílula embaixo).
 * - Início: "Continuar com e-mail" e, na multimídia, "Entrar com o celular" (código QR).
 * - E-mail: campos agrupados no estilo do iOS e o botão Entrar.
 * Protótipo de design: entrar segue para o mapa; o provedor de login ainda não foi definido.
 */
type Stage = 'start' | 'email' | 'qr';

export default function Login() {
  const [stage, setStage] = useState<Stage>('start');
  // Trocar de etapa tem a mesma transição da aba "Rotas" do celular (sai e entra deslizando).
  return (
    <Swap id={stage} dir={stage === 'start' ? -1 : 1} style={{ flex: 1 }}>
      <LoginStage stage={stage} setStage={setStage} />
    </Swap>
  );
}

function LoginStage({ stage, setStage }: { stage: Stage; setStage: (s: Stage) => void }) {
  const c = useColors();
  const router = useRouter();
  const phone = usePhone();
  const enter = () => router.replace('/mapa');

  if (stage === 'email') {
    return (
      <OnboardingLayout
        sceneKey="email"
        scene={null}
        centered
        title="Entre com seu e-mail"
        text="Use a mesma conta do GoClient no celular e no carro."
        actions={
          <>
            <Appear delay={140} distance={14} style={styles.fields}>
              <Field
                label="E-mail"
                icon="mail-outline"
                placeholder="nome@empresa.com.br"
                keyboard="email-address"
              />
              <Field label="Senha" icon="lock-closed-outline" placeholder="Sua senha" secure />
            </Appear>
            <View style={{ height: spacing[3] }} />
            <PillButton label="Entrar" onPress={enter} />
            <View style={styles.links}>
              <LinkButton label="Voltar" onPress={() => setStage('start')} />
              <LinkButton label="Esqueci minha senha" onPress={() => {}} />
            </View>
          </>
        }
      />
    );
  }

  if (stage === 'qr') {
    return (
      <OnboardingLayout
        sceneKey="qr"
        scene={
          <View style={styles.qrScene}>
            <View style={styles.qr}>
              <MockQr size={300} />
            </View>
          </View>
        }
        title="Entre com o celular"
        text="Aponte a câmera do celular para o código, ou abra o GoClient no celular e digite o código abaixo."
        actions={
          <>
            <Text variant="largeTitle" style={{ letterSpacing: 8 }}>
              GK7 · 42Q
            </Text>
            <PillButton label="Voltar" variant="secondary" onPress={() => setStage('start')} />
          </>
        }
      />
    );
  }

  return (
    <OnboardingLayout
      sceneKey="start"
      scene={null}
      title="Venda mais em cada visita"
      text="Entre para ver seus clientes, produtos e rotas no carro e no celular."
      actions={
        <>
          <PillButton
            label="Continuar com e-mail"
            icon={<Icon name="mail" size={34} color={c.background} />}
            onPress={() => setStage('email')}
          />
          {/* Código QR só faz sentido na central multimídia: no celular, o login é direto. */}
          {!phone && (
            <PillButton
              label="Entrar com o celular"
              variant="secondary"
              icon={<Icon name="qr-code" size={32} color={c.text} />}
              onPress={() => setStage('qr')}
            />
          )}
        </>
      }
      footer={
        <View style={styles.legal}>
          <Text variant="caption" tone="tertiary" style={styles.legalText}>
            Política de privacidade
          </Text>
          <Text variant="caption" tone="tertiary" style={styles.legalText}>
            Termos de uso
          </Text>
        </View>
      }
    />
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Touchable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text variant="headline" tone="accent">
        {label}
      </Text>
    </Touchable>
  );
}

/**
 * Campo de login: rótulo visível em cima e a caixa embaixo, com ícone à esquerda. A borda fica
 * azul enquanto o campo está em foco; a senha tem o olho para mostrar/esconder.
 */
function Field({
  label,
  icon,
  placeholder,
  secure,
  keyboard,
}: {
  label: string;
  icon: IconName;
  placeholder: string;
  secure?: boolean;
  keyboard?: 'email-address';
}) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={{ gap: spacing[2] }}>
      <Text variant="subhead" tone="secondary" style={styles.label}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          { backgroundColor: c.grouped, borderColor: focused ? c.accent : c.separator },
        ]}
      >
        <Icon name={icon} size={36} color={focused ? c.accent : c.textSecondary} />
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={c.textTertiary}
          secureTextEntry={hidden}
          keyboardType={keyboard}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            type.body,
            styles.input,
            { color: c.text },
            (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object,
          ]}
        />
        {secure && (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Esconder senha'}
            onPress={() => setHidden((h) => !h)}
            style={styles.eye}
          >
            <Icon
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={36}
              color={c.textSecondary}
            />
          </Touchable>
        )}
      </View>
    </View>
  );
}

/**
 * Código QR ilustrativo (não é lido por câmeras): padrão fixo com os três quadrados de
 * posição. O código real virá do provedor de login quando ele for escolhido.
 */
function MockQr({ size }: { size: number }) {
  const n = 25;
  const cell = size / n;
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (finder(x, y)) continue;
      // Embaralhamento fixo (hash inteiro) para o padrão parecer o de um QR de verdade.
      let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      if (((h ^ (h >>> 16)) & 1) === 1) cells.push({ x, y });
    }
  const square = (x: number, y: number) => (
    <>
      <Rect x={x * cell} y={y * cell} width={cell * 7} height={cell * 7} fill="#000" />
      <Rect x={(x + 1) * cell} y={(y + 1) * cell} width={cell * 5} height={cell * 5} fill="#FFF" />
      <Rect x={(x + 2) * cell} y={(y + 2) * cell} width={cell * 3} height={cell * 3} fill="#000" />
    </>
  );
  return (
    <Svg width={size} height={size}>
      <Rect width={size} height={size} fill="#FFF" />
      {cells.map((p) => (
        <Rect
          key={`${p.x}-${p.y}`}
          x={p.x * cell}
          y={p.y * cell}
          width={cell}
          height={cell}
          fill="#000"
        />
      ))}
      {square(0, 0)}
      {square(n - 7, 0)}
      {square(0, n - 7)}
    </Svg>
  );
}

/** Campos com a mesma altura da pílula "Entrar"; cantos de 28 (arredondados, sem virar pílula). */
const FIELD_H = 100;
const FIELD_R = 28;

const styles = StyleSheet.create({
  fields: { gap: spacing[5] },
  label: { fontSize: 24, lineHeight: 30, paddingLeft: spacing[2] },
  field: {
    height: FIELD_H,
    borderRadius: FIELD_R,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingLeft: spacing[6],
    paddingRight: spacing[3],
  },
  input: { flex: 1, minWidth: 0, height: '100%', fontSize: 30 },
  eye: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { height: 72, justifyContent: 'center', paddingHorizontal: spacing[2] },
  legalText: { fontSize: 24, lineHeight: 30 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: spacing[8] },
  qrScene: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  qr: { padding: 24, borderRadius: concentric(56, 24), backgroundColor: '#FFFFFF' },
});
