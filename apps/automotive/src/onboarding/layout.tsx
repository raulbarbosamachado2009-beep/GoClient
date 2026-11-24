import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { usePhone, useSystemInsets } from '../layout/form-factor';
import { nativeDriver, spacing, useColors } from '../theme';
import { LogoMark } from '../ui/brand';
import { Appear, appleEase, useSpring } from '../ui/motion';
import { Text, Touchable } from '../ui/primitives';
import { SceneFrame } from './scenes';

/**
 * Molde das telas do onboarding e do login (referências enviadas: ilustração animada num
 * quadro arredondado, selo pequeno, título grande, texto curto, pontos de página e botão
 * em pílula). Celular em pé: quadro em cima e texto embaixo. Multimídia: quadro à esquerda
 * e texto à direita, centrado na altura.
 */
export function OnboardingLayout({
  scene,
  sceneKey,
  badge,
  title,
  text,
  dots,
  actions,
  onSkip,
  footer,
  centered = false,
}: {
  /** Ilustração; `null` = tela só com marca, texto e ações (ex.: login). */
  scene: ReactNode | null;
  /** Muda a cada página, para a cena e os textos entrarem de novo com animação. */
  sceneKey: string;
  badge?: string;
  title: string;
  text?: string;
  dots?: { index: number; count: number };
  actions: ReactNode;
  onSkip?: () => void;
  footer?: ReactNode;
  /** Sem ilustração: texto e ações juntos no meio da tela (formulários). */
  centered?: boolean;
}) {
  const c = useColors();
  const phone = usePhone();
  const insets = useSystemInsets();

  // Texto centrado no celular e nas telas sem ilustração.
  const mid = phone || scene === null;
  const copy = (
    <View style={[styles.copy, mid ? styles.copyPhone : styles.copyCar]}>
      <Appear key={`b-${sceneKey}`} distance={12} style={mid ? styles.centerSelf : undefined}>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: c.fill }]}>
            <Text variant="subhead" tone="accent" style={{ fontSize: 26, lineHeight: 32 }}>
              {badge}
            </Text>
          </View>
        ) : (
          <LogoMark size={scene === null ? 112 : phone ? 72 : 84} />
        )}
      </Appear>
      <Appear key={`t-${sceneKey}`} delay={60} distance={14}>
        <Text
          variant="largeTitle"
          style={[phone ? styles.titlePhone : styles.titleCar, mid && styles.center]}
        >
          {title}
        </Text>
      </Appear>
      {text ? (
        <Appear key={`x-${sceneKey}`} delay={120} distance={14}>
          <Text
            variant="body"
            tone="secondary"
            style={[
              phone ? styles.textPhone : styles.textCar,
              mid && styles.center,
              mid && { alignSelf: 'center' },
            ]}
          >
            {text}
          </Text>
        </Appear>
      ) : null}
    </View>
  );

  const bottom = (
    <View style={{ gap: spacing[5], alignSelf: 'stretch' }}>
      {dots && dots.count > 1 && (
        <View style={[styles.dots, !phone && { justifyContent: 'flex-start' }]}>
          {Array.from({ length: dots.count }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: páginas fixas
            <Dot key={i} active={i === dots.index} />
          ))}
        </View>
      )}
      <View style={{ gap: spacing[3] }}>{actions}</View>
      {footer}
    </View>
  );

  return (
    <View
      style={[
        styles.page,
        { backgroundColor: c.background },
        phone
          ? // O topo (câmera) já é afastado pela pilha de telas; aqui só a área de gestos.
            { paddingTop: spacing[4], paddingBottom: insets.bottom + spacing[8] }
          : scene === null
            ? { alignItems: 'center' }
            : styles.pageCar,
      ]}
    >
      {scene === null ? (
        // Sem ilustração: tudo numa coluna centrada, com espaço para os campos respirarem.
        <View
          style={[
            styles.plain,
            phone ? styles.plainPhone : styles.plainCar,
            centered && { justifyContent: 'center' },
          ]}
        >
          <View style={centered ? undefined : { flex: 1, justifyContent: 'center' }}>{copy}</View>
          {bottom}
        </View>
      ) : phone ? (
        <>
          <View style={styles.topBar}>{onSkip && <SkipButton onPress={onSkip} />}</View>
          <View style={styles.scenePhone}>
            <FadeIn key={sceneKey}>
              <SceneFrame>{scene}</SceneFrame>
            </FadeIn>
          </View>
          <View style={styles.bottomPhone}>
            {copy}
            {bottom}
          </View>
        </>
      ) : (
        <>
          <View style={styles.sceneCar}>
            <FadeIn key={sceneKey}>
              <SceneFrame>{scene}</SceneFrame>
            </FadeIn>
          </View>
          <View style={styles.sideCar}>
            {onSkip && (
              <View style={styles.skipCar}>
                <SkipButton onPress={onSkip} />
              </View>
            )}
            <View style={{ flex: 1, justifyContent: 'center', gap: spacing[10] }}>
              {copy}
              {bottom}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/** Troca de cena: entra crescendo de leve (curva da Apple). */
function FadeIn({ children }: { children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 460,
      easing: appleEase,
      useNativeDriver: nativeDriver,
    }).start();
  }, [v]);
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: v,
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Ponto de página: o ativo vira uma pílula (a largura anda por mola). */
function Dot({ active }: { active: boolean }) {
  const c = useColors();
  const w = useSpring(active ? 1 : 0);
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: active ? c.text : c.textTertiary,
          transform: [{ scaleX: w.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }],
          marginHorizontal: active ? 14 : 0,
        },
      ]}
    />
  );
}

function SkipButton({ onPress }: { onPress: () => void }) {
  return (
    <Touchable accessibilityRole="button" onPress={onPress} style={styles.skip}>
      <Text variant="headline" tone="secondary">
        Pular
      </Text>
    </Touchable>
  );
}

/**
 * Botão em pílula das referências: `primary` = branco sobre o escuro (preto no tema claro);
 * `secondary` = cinza translúcido.
 */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'plain';
  icon?: ReactNode;
}) {
  const c = useColors();
  const phone = usePhone();
  const bg = variant === 'primary' ? c.text : variant === 'secondary' ? c.fill : 'transparent';
  const fg = variant === 'primary' ? c.background : variant === 'secondary' ? c.text : c.accent;
  const height = phone ? 100 : 104;
  return (
    <Touchable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.97}
      style={[styles.pill, { height, borderRadius: height / 2, backgroundColor: bg }]}
    >
      {icon}
      <Text variant="title2" color={fg} style={{ fontSize: 32, lineHeight: 38 }}>
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  plain: { flex: 1, alignSelf: 'center', width: '100%', gap: spacing[10] },
  plainPhone: { paddingHorizontal: 48, paddingTop: spacing[8] },
  plainCar: { maxWidth: 760, paddingVertical: spacing[8] },
  pageCar: { flexDirection: 'row', padding: spacing[8], gap: spacing[16] },
  topBar: { height: 72, flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 32 },
  scenePhone: { flex: 1, paddingHorizontal: 24 },
  bottomPhone: { paddingHorizontal: 48, paddingTop: spacing[10], gap: spacing[10] },
  sceneCar: { flex: 1.05 },
  sideCar: { flex: 1, paddingRight: spacing[8] },
  skipCar: { position: 'absolute', top: 0, right: 0, zIndex: 1 },
  copy: { gap: spacing[4] },
  copyPhone: { alignItems: 'stretch' },
  copyCar: { alignItems: 'flex-start' },
  centerSelf: { alignSelf: 'center' },
  center: { textAlign: 'center' },
  titlePhone: { fontSize: 56, lineHeight: 62, letterSpacing: -0.8 },
  titleCar: { fontSize: 64, lineHeight: 70, letterSpacing: -1 },
  textPhone: { fontSize: 30, lineHeight: 39 },
  textCar: { fontSize: 30, lineHeight: 40, maxWidth: 620 },
  badge: { height: 56, paddingHorizontal: 24, borderRadius: 28, justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  skip: { height: 72, paddingHorizontal: 20, justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[8],
  },
});
