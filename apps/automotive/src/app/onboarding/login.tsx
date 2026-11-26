import { useRouter } from 'expo-router';
import { type ComponentRef, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { usePhone, useSystemInsets } from '../../layout/form-factor';
import { AuroraBackground } from '../../onboarding/aurora';
import { OnboardingLayout, PillButton } from '../../onboarding/layout';
import { concentric, spacing, type, useColors } from '../../theme';
import { LogoMark } from '../../ui/brand';
import { Appear, usePageTransition } from '../../ui/motion';
import { Icon, type IconName, Text, Touchable } from '../../ui/primitives';

/**
 * Onboarding — login, depois das permissões e antes do mapa. Fundo "aurora" em todas as
 * etapas (ver `onboarding/aurora.tsx`) e a nuvem do Lucas animada no lugar do logo.
 *
 * Escolha do método e campos são **uma tela só que muda de forma** (pedido de 26/11/2026):
 * ao tocar em "Continuar com e-mail", a nuvem diminui e sobe, o título troca, o botão vira
 * o campo de e-mail (o preto vira o campo claro e os cantos se ajustam) e o campo de senha,
 * o Entrar e os links entram abrindo espaço. "Voltar" desfaz o mesmo caminho.
 * Na multimídia há ainda "Entrar com o celular" (código QR).
 * Protótipo de design: entrar segue para o mapa; o provedor de login ainda não foi definido.
 */
type Stage = 'start' | 'email' | 'qr';

export default function Login() {
  const [stage, setStage] = useState<Stage>('start');
  const router = useRouter();
  const page = usePageTransition();
  const enter = () => page.leave(() => router.replace('/mapa'));
  return (
    <Animated.View style={[{ flex: 1 }, page.style]}>
      {stage === 'qr' ? (
        <QrStage back={() => setStage('start')} />
      ) : (
        <MorphLogin email={stage === 'email'} setStage={setStage} enter={enter} />
      )}
    </Animated.View>
  );
}

/** Curva da troca de forma (parecida com a mola das folhas do iOS, sem quicar). */
const MORPH_EASE = Easing.bezier(0.32, 0.72, 0, 1);
const MORPH_MS = 560;

function MorphLogin({
  email,
  setStage,
  enter,
}: {
  email: boolean;
  setStage: (s: Stage) => void;
  enter: () => void;
}) {
  const c = useColors();
  const phone = usePhone();
  const insets = useSystemInsets();
  const p = useRef(new Animated.Value(email ? 1 : 0)).current;
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    Animated.timing(p, {
      toValue: email ? 1 : 0,
      duration: MORPH_MS,
      easing: MORPH_EASE,
      useNativeDriver: false,
    }).start();
    if (!email) input.current?.blur();
  }, [email, p]);
  const back = useMemo(() => p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), [p]);
  const fwd = useMemo(() => p.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), [p]);

  // Nuvem: grande na escolha, menor e mais acima nos campos (a caixa encolhe junto, então
  // tudo abaixo sobe sem corte).
  const big = phone ? 230 : 210;
  const small = phone ? 150 : 110;
  const boxH = (s: number) => s * 0.74 + spacing[4];
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.page, { paddingBottom: insets.bottom }]}>
      <AuroraBackground />
      <View style={[styles.column, phone ? styles.columnPhone : styles.columnCar]}>
        <Animated.View
          style={{
            height: p.interpolate({ inputRange: [0, 1], outputRange: [boxH(big), boxH(small)] }),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={{
              transform: [
                { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, small / big] }) },
              ],
            }}
          >
            <LogoMark size={big} />
          </Animated.View>
        </Animated.View>

        {/* Título e texto: um troca pelo outro no mesmo lugar. */}
        <View style={{ marginTop: spacing[4] }}>
          <CopyBlock
            v={back}
            title="Venda mais em cada visita"
            text="Entre para ver seus clientes, produtos e rotas no carro e no celular."
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <CopyBlock
              v={fwd}
              title="Entre com seu e-mail"
              text="Use a mesma conta do GoClient no celular e no carro."
            />
          </View>
        </View>

        <View style={{ height: spacing[10] }} />

        <Collapse v={fwd}>
          <Text
            variant="subhead"
            tone="secondary"
            style={[styles.label, { marginBottom: spacing[2] }]}
          >
            E-mail
          </Text>
        </Collapse>

        {/* O botão "Continuar com e-mail" vira o campo de e-mail. */}
        <Animated.View
          style={[
            styles.morph,
            {
              borderRadius: p.interpolate({
                inputRange: [0, 1],
                outputRange: [FIELD_H / 2, FIELD_R],
              }),
              backgroundColor: p.interpolate({
                inputRange: [0, 1],
                outputRange: [c.text, c.grouped],
              }),
              borderColor: focused
                ? c.accent
                : p.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(0,0,0,0)', c.separator],
                  }),
            },
          ]}
        >
          <Animated.View
            pointerEvents={email ? 'none' : 'auto'}
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: p.interpolate({
                  inputRange: [0, 0.35],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: p.interpolate({
                      inputRange: [0, 0.35],
                      outputRange: [1, 0.94],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <Touchable
              accessibilityRole="button"
              onPress={() => setStage('email')}
              scaleTo={0.97}
              style={styles.morphButton}
            >
              <Icon name="mail" size={34} color={c.background} />
              <Text variant="title2" color={c.background} style={{ fontSize: 32, lineHeight: 38 }}>
                Continuar com e-mail
              </Text>
            </Touchable>
          </Animated.View>
          <Animated.View
            pointerEvents={email ? 'auto' : 'none'}
            style={[
              styles.morphField,
              {
                opacity: p.interpolate({
                  inputRange: [0.45, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateX: p.interpolate({
                      inputRange: [0.45, 1],
                      outputRange: [16, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <Icon name="mail-outline" size={36} color={focused ? c.accent : c.textSecondary} />
            <TextInput
              ref={input}
              accessibilityLabel="E-mail"
              placeholder="nome@empresa.com.br"
              placeholderTextColor={c.textTertiary}
              keyboardType="email-address"
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
          </Animated.View>
        </Animated.View>

        {/* Senha, Entrar e os links entram abrindo espaço (na volta, recolhem). */}
        <Collapse v={fwd} delay={0.15}>
          <View style={{ paddingTop: spacing[5] }}>
            <Field label="Senha" icon="lock-closed-outline" placeholder="Sua senha" secure />
          </View>
        </Collapse>
        <Collapse v={fwd} delay={0.25}>
          <View style={{ paddingTop: spacing[8] }}>
            <PillButton label="Entrar" onPress={enter} />
          </View>
        </Collapse>
        <Collapse v={fwd} delay={0.3}>
          <View style={[styles.links, { paddingTop: spacing[3] }]}>
            <LinkButton label="Voltar" onPress={() => setStage('start')} />
            <LinkButton label="Esqueci minha senha" onPress={() => {}} />
          </View>
        </Collapse>

        {/* Código QR só faz sentido na central multimídia: no celular, o login é direto. */}
        {!phone && (
          <Collapse v={back}>
            <View style={{ paddingTop: spacing[3] }}>
              <PillButton
                label="Entrar com o celular"
                variant="secondary"
                icon={<Icon name="qr-code" size={32} color={c.text} />}
                onPress={() => setStage('qr')}
              />
            </View>
          </Collapse>
        )}
        <Collapse v={back}>
          <View style={[styles.legal, { paddingTop: spacing[5] }]}>
            <Text variant="caption" tone="tertiary" style={styles.legalText}>
              Política de privacidade
            </Text>
            <Text variant="caption" tone="tertiary" style={styles.legalText}>
              Termos de uso
            </Text>
          </View>
        </Collapse>
      </View>
    </View>
  );
}

/** Título e texto centrados, que entram/saem com `v` (0 = escondido, 1 = visível). */
function CopyBlock({
  v,
  title,
  text,
}: {
  v: Animated.AnimatedInterpolation<number>;
  title: string;
  text: string;
}) {
  const phone = usePhone();
  return (
    <Animated.View
      style={{
        gap: spacing[4],
        opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Text
        variant="largeTitle"
        style={[phone ? styles.titlePhone : styles.titleCar, styles.center]}
      >
        {title}
      </Text>
      <Text variant="body" tone="secondary" style={[styles.text, styles.center]}>
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * Bloco que abre e fecha a própria altura com `v` (0 = fechado, 1 = aberto). O conteúdo é
 * medido uma vez; `delay` (0 a 1) faz ele abrir um pouco depois dos outros.
 */
function Collapse({
  v,
  delay = 0,
  children,
}: {
  v: Animated.AnimatedInterpolation<number>;
  delay?: number;
  children: ReactNode;
}) {
  const [h, setH] = useState(0);
  const range = [delay, 1];
  return (
    <Animated.View
      style={{
        height: v.interpolate({ inputRange: [0, 1], outputRange: [0, h] }),
        overflow: 'hidden',
        opacity: v.interpolate({ inputRange: range, outputRange: [0, 1], extrapolate: 'clamp' }),
      }}
    >
      <Animated.View
        onLayout={(e) => setH(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          transform: [
            {
              translateY: v.interpolate({
                inputRange: range,
                outputRange: [14, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

/** Multimídia: entrar pelo celular, lendo o código QR. */
function QrStage({ back }: { back: () => void }) {
  return (
    <OnboardingLayout
      sceneKey="qr"
      backdrop={<AuroraBackground />}
      scene={null}
      centered
      title="Entre com o celular"
      text="Aponte a câmera do celular para o código, ou abra o GoClient no celular e digite o código abaixo."
      actions={
        <Appear key="qr" delay={140} distance={14} style={styles.qrBlock}>
          <View style={styles.qr}>
            <MockQr size={240} />
          </View>
          <Text variant="largeTitle" style={{ letterSpacing: 8 }}>
            GK7 · 42Q
          </Text>
          <View style={{ alignSelf: 'stretch' }}>
            <PillButton label="Voltar" variant="secondary" onPress={back} />
          </View>
        </Appear>
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
  page: { flex: 1 },
  column: { flex: 1, alignSelf: 'center', width: '100%', justifyContent: 'center' },
  columnPhone: { paddingHorizontal: 48 },
  columnCar: { maxWidth: 760, paddingVertical: spacing[8] },
  titlePhone: { fontSize: 56, lineHeight: 62, letterSpacing: -0.8 },
  titleCar: { fontSize: 64, lineHeight: 70, letterSpacing: -1 },
  text: { fontSize: 30, lineHeight: 39 },
  center: { textAlign: 'center' },
  morph: { height: FIELD_H, borderWidth: 2, overflow: 'hidden' },
  morphButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  morphField: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingLeft: spacing[6],
    paddingRight: spacing[3],
  },
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
  qrBlock: { alignItems: 'center', gap: spacing[5] },
  qr: { padding: 24, borderRadius: concentric(56, 24), backgroundColor: '#FFFFFF' },
});
