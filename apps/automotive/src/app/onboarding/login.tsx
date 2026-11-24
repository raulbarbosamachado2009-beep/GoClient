import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { usePhone } from '../../layout/form-factor';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { concentric, spacing, type, useColors } from '../../theme';
import { Appear } from '../../ui/motion';
import { Icon, Text, Touchable } from '../../ui/primitives';

/**
 * Onboarding — login, depois das permissões e antes do mapa (referência: telas de entrada
 * com ilustração em cima, marca, e botões em pílula embaixo).
 * - Início: "Continuar com e-mail" e, na multimídia, "Entrar com o celular" (código QR).
 * - E-mail: campos agrupados no estilo do iOS e o botão Entrar.
 * Protótipo de design: entrar segue para o mapa; o provedor de login ainda não foi definido.
 */
export default function Login() {
  const c = useColors();
  const router = useRouter();
  const phone = usePhone();
  const enter = () => router.replace('/mapa');
  const [stage, setStage] = useState<'start' | 'email' | 'qr'>('start');

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
            <Appear delay={140} distance={14}>
              <View
                style={[styles.group, { backgroundColor: c.grouped, borderColor: c.separator }]}
              >
                <Field label="E-mail" placeholder="nome@empresa.com.br" keyboard="email-address" />
                <View style={[styles.separator, { backgroundColor: c.separator }]} />
                <Field label="Senha" placeholder="Obrigatória" secure />
              </View>
            </Appear>
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

/** Linha de formulário no estilo dos Ajustes do iOS: rótulo à esquerda, campo à direita. */
function Field({
  label,
  placeholder,
  secure,
  keyboard,
}: {
  label: string;
  placeholder: string;
  secure?: boolean;
  keyboard?: 'email-address';
}) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text variant="body" style={{ width: 120, fontSize: 28 }}>
        {label}
      </Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        secureTextEntry={secure}
        keyboardType={keyboard}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          type.body,
          { flex: 1, minWidth: 0, color: c.text, height: '100%', fontSize: 28 },
          (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object,
        ]}
      />
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

/** Grupo dos campos: mesma curva da pílula (raio = metade da altura do campo). */
const FIELD_H = 100;
const GROUP_R = 34;

const styles = StyleSheet.create({
  group: { borderRadius: GROUP_R, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  field: {
    height: FIELD_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing[8] },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { height: 72, justifyContent: 'center', paddingHorizontal: spacing[2] },
  legalText: { fontSize: 24, lineHeight: 30 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: spacing[8] },
  qrScene: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  qr: { padding: 24, borderRadius: concentric(56, 24), backgroundColor: '#FFFFFF' },
});
