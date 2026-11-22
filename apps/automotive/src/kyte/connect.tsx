import { ScrollView, StyleSheet, View } from 'react-native';
import { useBleed, usePhone, useSystemInsets, useTabBarSpace } from '../layout/form-factor';
import { FONT, spacing, useColors } from '../theme';
import { KyteLogo } from '../ui/brand';
import { Appear } from '../ui/motion';
import { Icon, type IconName, Text, Touchable } from '../ui/primitives';

const ACCENT = '#0A84FF';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'people',
    title: 'Clientes e produtos',
    text: 'A sua carteira e o seu catálogo do Kyte, sempre à mão.',
  },
  {
    icon: 'receipt',
    title: 'Pedidos e vendas',
    text: 'Acompanhe o que foi vendido sem sair do GoClient.',
  },
  {
    icon: 'lock-closed',
    title: 'Sua senha fica com o Kyte',
    text: 'Você entra na página oficial do Kyte. O GoClient não vê nem guarda a senha.',
  },
];

/**
 * Apresentação do Kyte antes do login, no estilo das telas de boas-vindas da Apple: ícone,
 * título, três destaques e um único botão. Por enquanto só e-mail e senha: o login do Google
 * não funciona dentro de janelas embutidas em apps. O botão abre a página oficial de login do
 * Kyte; a senha é digitada lá, nunca aqui.
 */
export function KyteConnect({ onOpen }: { onOpen: () => void }) {
  const c = useColors();
  const bleed = useBleed();
  const phone = usePhone();
  const system = useSystemInsets();
  const tabSpace = useTabBarSpace();
  // Celular: medidas do iOS (1 pt ≈ 1,83 unidade na tela de referência de 720).
  const t = phone ? PHONE : CAR;

  return (
    <View style={{ flex: 1 }}>
      <View style={[StyleSheet.absoluteFill, { left: -bleed, backgroundColor: c.background }]} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: phone ? tabSpace + 40 : 64, paddingTop: phone ? system.top : 0 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Celular: uma coluna centrada. Multimídia: apresentação à esquerda, destaques e
            botão à direita (cabe na tela deitada sem rolar). */}
        <View style={[styles.column, { maxWidth: t.column, gap: t.gap }, !phone && styles.wide]}>
          <Appear
            delay={60}
            style={[
              { alignItems: phone ? 'center' : 'flex-start', gap: t.titleGap },
              !phone && { flex: 1 },
            ]}
          >
            <KyteLogo size={t.tile} />
            <Text variant="largeTitle" style={[t.title, { textAlign: phone ? 'center' : 'left' }]}>
              Kyte no GoClient
            </Text>
            <Text
              variant="body"
              tone="secondary"
              style={[t.lead, { textAlign: phone ? 'center' : 'left' }]}
            >
              Entre na sua conta do Kyte para trazer o seu PDV para dentro do app.
            </Text>
          </Appear>

          <View style={[{ alignSelf: 'stretch', gap: t.gap }, !phone && { flex: 1 }]}>
            <View style={{ gap: t.rowGap, alignSelf: 'stretch' }}>
              {FEATURES.map((f, i) => (
                <Appear key={f.title} delay={160 + i * 70} distance={12}>
                  <View style={styles.feature}>
                    <View style={{ width: t.featureIcon + 8, alignItems: 'center' }}>
                      <Icon name={f.icon} size={t.featureIcon} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="headline" style={t.featureTitle}>
                        {f.title}
                      </Text>
                      <Text variant="body" tone="secondary" style={t.featureText}>
                        {f.text}
                      </Text>
                    </View>
                  </View>
                </Appear>
              ))}
            </View>

            <Appear delay={420} distance={12} style={{ alignSelf: 'stretch', gap: t.noteGap }}>
              <Touchable
                accessibilityRole="button"
                onPress={onOpen}
                scaleTo={0.97}
                style={[styles.button, { height: t.button, borderRadius: t.button / 2 }]}
              >
                <Text variant="headline" color="#FFFFFF" style={t.buttonText}>
                  Continuar com e-mail
                </Text>
              </Touchable>
              <Text
                variant="caption"
                tone="secondary"
                style={[t.note, { textAlign: 'center', alignSelf: 'center' }]}
              >
                Por enquanto, só e-mail e senha. A entrada com o Google não funciona dentro de
                outros apps.
              </Text>
            </Appear>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const PHONE = {
  column: 640,
  gap: 72,
  titleGap: 22,
  tile: 168,
  title: { fontSize: 62, lineHeight: 70, letterSpacing: -0.6 },
  lead: { fontSize: 31, lineHeight: 40 },
  rowGap: 40,
  featureIcon: 52,
  featureTitle: { fontSize: 29, lineHeight: 36 },
  featureText: { fontSize: 29, lineHeight: 37 },
  button: 100,
  buttonText: { fontSize: 31, lineHeight: 38, fontFamily: FONT.displaySemibold },
  noteGap: 24,
  note: { fontSize: 22, lineHeight: 28, maxWidth: 560 },
};

const CAR = {
  column: 1240,
  gap: 48,
  titleGap: 24,
  tile: 150,
  title: { fontSize: 72, lineHeight: 80, letterSpacing: -1 },
  lead: { fontSize: 28, lineHeight: 38 },
  rowGap: 32,
  featureIcon: 46,
  featureTitle: { fontSize: 28, lineHeight: 34 },
  featureText: { fontSize: 25, lineHeight: 33 },
  button: 96,
  buttonText: { fontSize: 30, lineHeight: 36, fontFamily: FONT.displaySemibold },
  noteGap: 20,
  note: { fontSize: 21, lineHeight: 27, maxWidth: 620 },
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48 },
  column: { width: '100%', alignItems: 'center' },
  wide: { flexDirection: 'row', alignItems: 'center', gap: 96 },
  tile: { backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] },
  button: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
