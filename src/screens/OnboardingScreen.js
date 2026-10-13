// src/screens/OnboardingScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { AutomotiveButton } from '../components/AutomotiveButton';

const ONBOARDING_STEPS = [
  {
    id: 1,
    tag: 'BEM-VINDO AO GOCLIENT',
    title: 'Sua Central Automotiva de Alta Fidelidade',
    subtitle: 'Projetada para a melhor experiência em telas veiculares widescreen 16:9.',
    heroIcon: 'speedometer',
    heroBadge: 'SISTEMA OPERACIONAL VEICULAR',
    features: [
      {
        icon: 'navigate',
        color: colors.accentBlue,
        title: 'Navegação e Rotas Inteligentes',
        desc: 'Mapeamento detalhado e cálculo de tempo estimado com alertas de tráfego em tempo real.',
      },
      {
        icon: 'musical-notes',
        color: colors.primary,
        title: 'Áudio e Multimídia Integrados',
        desc: 'Controles táteis ergonômicos e acesso direto às suas playlists e álbuns preferidos.',
      },
      {
        icon: 'briefcase',
        color: colors.accentGreen,
        title: 'Agenda de Clientes e Visitas',
        desc: 'Acesse rapidamente contatos comerciais e trace trajetos imediatos para seus compromissos.',
      },
    ],
    privacyText: 'Suas preferências de rota e reprodução são salvas com criptografia local para a sua máxima segurança ao volante.',
  },
  {
    id: 2,
    tag: 'RECURSOS PROFISSIONAIS',
    title: 'Ergonomia Feita para o Condutor',
    subtitle: 'Botões amplos, alto contraste e elementos dispostos para toque seguro sem distrações.',
    heroIcon: 'car-sport',
    heroBadge: 'CONTROLE ERGONÔMICO',
    features: [
      {
        icon: 'shield-checkmark',
        color: colors.accentGreen,
        title: 'Foco Total na Pista',
        desc: 'Interface em tema escuro nativo para minimizar reflexos na condução noturna ou sob sol forte.',
      },
      {
        icon: 'cellular',
        color: colors.accentOrange,
        title: 'Sincronização em Nuvem',
        desc: 'Integração contínua com seu repositório seguro e sincronização entre computadores e veículos.',
      },
      {
        icon: 'options',
        color: colors.accentPurple,
        title: 'Painéis Flutuantes Rápidos',
        desc: 'Alternância instantânea entre mapa, áudio e contatos sem interromper a navegação ativa.',
      },
    ],
    privacyText: 'O GoClient respeita as diretrizes internacionais de ergonomia e acessibilidade para interfaces veiculares.',
  },
  {
    id: 3,
    tag: 'PRONTIDÃO DE CONDUÇÃO',
    title: 'Experiência Veicular Personalizada',
    subtitle: 'Tudo configurado para iniciar sua jornada com praticidade e elegância.',
    heroIcon: 'sparkles',
    heroBadge: 'PRONTO PARA PARTIDA',
    features: [
      {
        icon: 'bluetooth',
        color: colors.accentBlue,
        title: 'Conexão Automática do Dispositivo',
        desc: 'Seu smartphone e sistema de som conectados com emparelhamento de baixa latência.',
      },
      {
        icon: 'location',
        color: colors.primary,
        title: 'Destinos e Clientes Pré-carregados',
        desc: 'Rotas frequentes e dados empresariais prontos no painel principal com um único toque.',
      },
      {
        icon: 'hardware-chip',
        color: colors.accentCyan,
        title: 'Desempenho Otimizado Expo SDK 57',
        desc: 'Transições a 60 FPS garantindo fluidez e responsividade imediata na central multimídia.',
      },
    ],
    privacyText: 'Você pode personalizar parâmetros de áudio, tema e dados a qualquer momento na aba Ajustes.',
  },
];

export const OnboardingScreen = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = ONBOARDING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar com Skip */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <Ionicons name="speedometer" size={24} color={colors.primary} />
          </View>
          <Text style={styles.logoTitle}>GoClient</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>16:9 Landscape</Text>
          </View>
        </View>

        {!isLastStep && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onComplete}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Pular Apresentação</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Conteúdo Split-Screen Horizontal (16:9 Widescreen) */}
      <View style={styles.splitContent}>
        {/* Lado Esquerdo: Hero Showcase Automotivo */}
        <View style={styles.leftShowcase}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{step.heroBadge}</Text>
          </View>

          <View style={styles.heroCircle}>
            <Ionicons name={step.heroIcon} size={84} color={colors.primary} />
          </View>

          <Text style={styles.heroStepTag}>
            ETAPA {currentStepIndex + 1} DE {ONBOARDING_STEPS.length}
          </Text>

          {/* Indicadores de Progresso em Pílulas Táteis */}
          <View style={styles.indicatorContainer}>
            {ONBOARDING_STEPS.map((s, idx) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setCurrentStepIndex(idx)}
                style={[
                  styles.indicatorBar,
                  idx === currentStepIndex && styles.indicatorBarActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Lado Direito: Conteúdo e Interação */}
        <View style={styles.rightContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.stepTag}>{step.tag}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.subtitle}>{step.subtitle}</Text>

            {/* Lista dos 3 Recursos com Ícones */}
            <View style={styles.featuresList}>
              {step.features.map((item, index) => (
                <View key={index} style={styles.featureItem}>
                  <View
                    style={[
                      styles.featureIconContainer,
                      { backgroundColor: `${item.color}1E` },
                    ]}
                  >
                    <Ionicons name={item.icon} size={28} color={item.color} />
                  </View>
                  <View style={styles.featureTexts}>
                    <Text style={styles.featureTitle}>{item.title}</Text>
                    <Text style={styles.featureDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Nota de Privacidade Discreta */}
            <View style={styles.privacyBox}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.privacyText}>{step.privacyText}</Text>
            </View>
          </ScrollView>

          {/* Barra de Ações Inferior com Botões Grandes */}
          <View style={styles.actionFooter}>
            {currentStepIndex > 0 ? (
              <AutomotiveButton
                title="Voltar"
                variant="secondary"
                size="large"
                icon="arrow-back"
                onPress={handlePrev}
                style={styles.backButton}
              />
            ) : (
              <View style={styles.backPlaceholder} />
            )}

            <AutomotiveButton
              title={isLastStep ? 'Começar a Dirigir' : 'Continuar'}
              variant="primary"
              size="large"
              iconRight={isLastStep ? 'checkmark-circle' : 'arrow-forward'}
              onPress={handleNext}
              style={styles.nextButton}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.spacing.xxl,
    paddingVertical: layout.spacing.lg,
    justifyContent: 'space-between',
  },
  topBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: layout.spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  logoTitle: {
    ...typography.title2,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  versionBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  versionBadgeText: {
    ...typography.caption,
    color: colors.accentCyan,
    fontSize: 11,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: layout.radius.pill,
    backgroundColor: colors.surface,
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  splitContent: {
    flex: 1,
    flexDirection: 'row',
    gap: layout.spacing.xxl,
  },
  leftShowcase: {
    flex: 0.42,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.spacing.xl,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: layout.radius.pill,
    marginBottom: layout.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 12,
  },
  heroCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 59, 48, 0.25)',
    marginBottom: layout.spacing.xl,
  },
  heroStepTag: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: layout.spacing.lg,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  indicatorBar: {
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceBorderStrong,
  },
  indicatorBarActive: {
    width: 52,
    backgroundColor: colors.primary,
  },
  rightContent: {
    flex: 0.58,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingRight: 8,
    paddingBottom: 16,
  },
  stepTag: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: 4,
  },
  title: {
    ...typography.title1,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: layout.spacing.lg,
  },
  featuresList: {
    gap: 16,
    marginBottom: layout.spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated || colors.surface,
    padding: 16,
    borderRadius: layout.radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 16,
  },
  featureIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTexts: {
    flex: 1,
  },
  featureTitle: {
    ...typography.title3,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    ...typography.body,
    color: colors.textSecondary,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: layout.radius.md,
    marginTop: 4,
  },
  privacyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    gap: layout.spacing.md,
  },
  backButton: {
    minWidth: 160,
  },
  backPlaceholder: {
    minWidth: 160,
  },
  nextButton: {
    flex: 1,
  },
});
