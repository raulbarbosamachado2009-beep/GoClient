import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useBleed, usePhone, useSystemInsets, useTabBarSpace } from '../layout/form-factor';
import { FONT, spacing, useColors } from '../theme';
import { Appear } from './motion';
import { Icon, type IconName, Text, Touchable } from './primitives';

export interface IntroFeature {
  icon: IconName;
  title: string;
  text: string;
}

/**
 * Apresentação de um app antes de conectar (Kyte, WhatsApp), no estilo das telas de
 * boas-vindas da Apple: ícone, título, três destaques e um único botão.
 */
export function AppIntro({
  logo,
  title,
  lead,
  features,
  button,
  note,
  accent,
  onOpen,
}: {
  logo: (size: number) => ReactNode;
  title: string;
  lead: string;
  features: IntroFeature[];
  button: string;
  note: string;
  accent: string;
  onOpen: () => void;
}) {
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
            {logo(t.tile)}
            <Text variant="largeTitle" style={[t.title, { textAlign: phone ? 'center' : 'left' }]}>
              {title}
            </Text>
            <Text
              variant="body"
              tone="secondary"
              style={[t.lead, { textAlign: phone ? 'center' : 'left' }]}
            >
              {lead}
            </Text>
          </Appear>

          <View style={[{ alignSelf: 'stretch', gap: t.gap }, !phone && { flex: 1 }]}>
            <View style={{ gap: t.rowGap, alignSelf: 'stretch' }}>
              {features.map((f, i) => (
                <Appear key={f.title} delay={160 + i * 70} distance={12}>
                  <View style={styles.feature}>
                    <View style={{ width: t.featureIcon + 8, alignItems: 'center' }}>
                      <Icon name={f.icon} size={t.featureIcon} color={accent} />
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
                style={[
                  styles.button,
                  { height: t.button, borderRadius: t.button / 2, backgroundColor: accent },
                ]}
              >
                <Text variant="headline" color="#FFFFFF" style={t.buttonText}>
                  {button}
                </Text>
              </Touchable>
              <Text
                variant="caption"
                tone="secondary"
                style={[t.note, { textAlign: 'center', alignSelf: 'center' }]}
              >
                {note}
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
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
