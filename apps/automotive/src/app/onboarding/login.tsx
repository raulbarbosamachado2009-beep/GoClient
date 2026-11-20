import { useRouter } from 'expo-router';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { NO_FLEX, usePhone } from '../../layout/form-factor';
import { spacing, type, useColors } from '../../theme';
import { Appear } from '../../ui/motion';
import { Button, Icon, Text } from '../../ui/primitives';

/**
 * Onboarding — login, depois das permissões e antes do mapa.
 * Duas formas, como no Apple TV: digitar e-mail e senha, ou ler um código com o celular
 * (mais prático no carro). Protótipo de design: qualquer botão segue para o mapa; o
 * provedor de autenticação ainda não foi definido.
 */
export default function Login() {
  const c = useColors();
  const router = useRouter();
  const enter = () => router.replace('/mapa');
  const phone = usePhone();

  return (
    <View style={[styles.page, { backgroundColor: c.background }]}>
      <View style={[styles.column, phone && PHONE_COLUMN]}>
        <Appear distance={20}>
          <Icon name="person-circle" size={96} color={c.accent} />
        </Appear>
        <Appear delay={80} distance={20} style={{ alignItems: 'center', gap: spacing[3] }}>
          <Text variant="largeTitle" style={{ textAlign: 'center' }}>
            Entre na sua conta
          </Text>
          <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 820 }}>
            Use a mesma conta do GoClient no celular e no computador. Seus clientes, produtos e
            rotas aparecem aqui automaticamente.
          </Text>
        </Appear>

        <View style={[styles.options, phone && { flexDirection: 'column', gap: spacing[6] }]}>
          <Appear
            delay={220}
            distance={18}
            style={[styles.side, phone && { alignSelf: 'stretch', ...NO_FLEX }]}
          >
            <View style={[styles.group, { backgroundColor: c.grouped }]}>
              <Field label="E-mail" placeholder="nome@empresa.com.br" />
              <View style={[styles.separator, { backgroundColor: c.separator }]} />
              <Field label="Senha" placeholder="Obrigatória" secure />
            </View>
            <Button label="Entrar" onPress={enter} />
            <Button label="Esqueci minha senha" variant="plain" size="md" onPress={() => {}} />
          </Appear>

          <Appear
            delay={300}
            distance={18}
            style={[styles.divider, phone && { flexDirection: 'row', alignSelf: 'stretch' }]}
          >
            <View style={[styles.line, { backgroundColor: c.separator }, phone && HLINE]} />
            <Text variant="subhead" tone="secondary">
              ou
            </Text>
            <View style={[styles.line, { backgroundColor: c.separator }, phone && HLINE]} />
          </Appear>

          <Appear
            delay={380}
            distance={18}
            style={[styles.side, { alignItems: 'center' }, phone && NO_FLEX]}
          >
            <View style={styles.qr}>
              <MockQr size={196} />
            </View>
            <Text variant="headline" style={{ textAlign: 'center' }}>
              Entrar com o celular
            </Text>
            <Text variant="callout" tone="secondary" style={{ textAlign: 'center' }}>
              Aponte a câmera do celular para o código, ou abra o GoClient no celular e digite
            </Text>
            <Text variant="title2" style={{ letterSpacing: 6 }}>
              GK7 · 42Q
            </Text>
          </Appear>
        </View>
      </View>
    </View>
  );
}

/** Linha de formulário no estilo dos Ajustes do iOS: rótulo à esquerda, campo à direita. */
function Field({
  label,
  placeholder,
  secure,
}: {
  label: string;
  placeholder: string;
  secure?: boolean;
}) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text variant="body" style={{ width: 120 }}>
        {label}
      </Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        secureTextEntry={secure}
        autoCapitalize="none"
        style={[
          type.body,
          { flex: 1, color: c.text, height: '100%' },
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

const HLINE = { width: undefined, height: StyleSheet.hairlineWidth, flex: 1 } as const;

/** Celular em pé: a coluna ocupa a largura toda, com margens. */
const PHONE_COLUMN = { width: '100%', paddingHorizontal: 40 } as const;

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: { width: 1180, alignItems: 'center', gap: spacing[8] },
  options: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: spacing[8] },
  side: { flex: 1, gap: spacing[4] },
  group: { borderRadius: 22, overflow: 'hidden' },
  field: { height: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[6] },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing[6] },
  divider: { alignItems: 'center', gap: spacing[3], alignSelf: 'stretch' },
  line: { width: StyleSheet.hairlineWidth, flex: 1 },
  qr: { padding: 14, borderRadius: 22, backgroundColor: '#FFFFFF' },
});
