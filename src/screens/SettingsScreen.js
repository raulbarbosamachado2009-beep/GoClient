// src/screens/SettingsScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { AutomotiveCard } from '../components/AutomotiveCard';
import { AutomotiveHeader } from '../components/AutomotiveHeader';
import { initialVehicleStatus } from '../mock/mockData';

const SETTINGS_SECTIONS = [
  { id: 'audio', title: 'Áudio & Som', icon: 'volume-high-outline' },
  { id: 'connectivity', title: 'Conectividade', icon: 'bluetooth-outline' },
  { id: 'display', title: 'Tela & Visual', icon: 'desktop-outline' },
  { id: 'vehicle', title: 'Veículo & Telemetria', icon: 'car-sport-outline' },
  { id: 'about', title: 'Sobre o Sistema', icon: 'information-circle-outline' },
];

export const SettingsScreen = ({ onOpenOnboarding }) => {
  const [activeSection, setActiveSection] = useState('audio');

  // Estados de configurações táteis
  const [loudness, setLoudness] = useState(true);
  const [bluetoothAuto, setBluetoothAuto] = useState(true);
  const [nightModeAuto, setNightModeAuto] = useState(true);
  const [speedAlerts, setSpeedAlerts] = useState(true);

  return (
    <View style={styles.container}>
      <AutomotiveHeader
        title="Ajustes do Sistema"
        subtitle="Preferências da Central Automotiva • GoClient OS"
      />

      {/* Split Widescreen 16:9: Abas à esquerda e Opções à direita */}
      <View style={styles.splitLayout}>
        {/* Painel Esquerdo: Menu de Seções */}
        <View style={styles.leftNavPanel}>
          <Text style={styles.menuHeaderTag}>CATEGORIAS DE AJUSTES</Text>
          <View style={styles.menuList}>
            {SETTINGS_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <TouchableOpacity
                  key={section.id}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => setActiveSection(section.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={section.icon}
                    size={24}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                    {section.title}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isActive ? colors.primary : colors.textMuted}
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Atalho para rever a Apresentação Inicial */}
          <TouchableOpacity
            style={styles.replayOnboardingBtn}
            onPress={onOpenOnboarding}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={styles.replayOnboardingText}>Ver Apresentação Inicial</Text>
          </TouchableOpacity>
        </View>

        {/* Painel Direito: Configurações da Seção Ativa */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.rightContentPanel}>
          {activeSection === 'audio' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Preferências de Áudio & Acústica</Text>
              <Text style={styles.sectionSubtitle}>
                Ajuste o processamento sonoro para a acústica interna da cabine.
              </Text>

              <AutomotiveCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Graves Dinâmicos (Bass Boost)</Text>
                    <Text style={styles.settingDesc}>
                      Reforça frequências baixas para compensar o ruído da pista.
                    </Text>
                  </View>
                  <Switch
                    value={loudness}
                    onValueChange={setLoudness}
                    trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Atenuação em Manobras</Text>
                    <Text style={styles.settingDesc}>
                      Diminui o volume da música automaticamente ao engatar a marcha ré.
                    </Text>
                  </View>
                  <Switch
                    value={true}
                    onValueChange={() => {}}
                    trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Saída Primária de Áudio</Text>
                    <Text style={styles.settingDesc}>
                      Alto-falantes estéreo integrados via Bluetooth de alta fidelidade.
                    </Text>
                  </View>
                  <View style={styles.outputBadge}>
                    <Text style={styles.outputBadgeText}>Sistema do Carro</Text>
                  </View>
                </View>
              </AutomotiveCard>
            </View>
          )}

          {activeSection === 'connectivity' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Conectividade & Dispositivos</Text>
              <Text style={styles.sectionSubtitle}>
                Gerenciamento de emparelhamento sem fio com smartphones e sensores.
              </Text>

              <AutomotiveCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Reconexão Automática Bluetooth</Text>
                    <Text style={styles.settingDesc}>
                      Conecta imediatamente ao detectar o smartphone cadastrado.
                    </Text>
                  </View>
                  <Switch
                    value={bluetoothAuto}
                    onValueChange={setBluetoothAuto}
                    trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Dispositivo Atual Vinculado</Text>
                    <Text style={styles.settingDesc}>
                      {initialVehicleStatus.deviceName} • Sinal Forte
                    </Text>
                  </View>
                  <View style={[styles.outputBadge, { backgroundColor: 'rgba(48,209,88,0.15)' }]}>
                    <Text style={[styles.outputBadgeText, { color: colors.accentGreen }]}>
                      Conectado
                    </Text>
                  </View>
                </View>
              </AutomotiveCard>
            </View>
          )}

          {activeSection === 'display' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Tela & Ergonomia Visual</Text>
              <Text style={styles.sectionSubtitle}>
                Parâmetros calibrados para resolução 1600 × 900 widescreen.
              </Text>

              <AutomotiveCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Tema Automotivo Escuro (Dark)</Text>
                    <Text style={styles.settingDesc}>
                      Alto contraste com pretos profundos para eliminar reflexos no para-brisa.
                    </Text>
                  </View>
                  <Switch
                    value={nightModeAuto}
                    onValueChange={setNightModeAuto}
                    trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Resolução Nativa de Referência</Text>
                    <Text style={styles.settingDesc}>
                      1600 × 900 pixels • Proporção 16:9 Landscape
                    </Text>
                  </View>
                  <View style={styles.outputBadge}>
                    <Text style={styles.outputBadgeText}>16:9 Nativo</Text>
                  </View>
                </View>
              </AutomotiveCard>
            </View>
          )}

          {activeSection === 'vehicle' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Veículo & Telemetria Integrada</Text>
              <Text style={styles.sectionSubtitle}>
                Monitoramento de dados de bordo e assistência de condução.
              </Text>

              <AutomotiveCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Alertas de Velocidade da Via</Text>
                    <Text style={styles.settingDesc}>
                      Aviso visual sutil caso ultrapasse o limite regulamentado.
                    </Text>
                  </View>
                  <Switch
                    value={speedAlerts}
                    onValueChange={setSpeedAlerts}
                    trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Unidade de Velocidade</Text>
                    <Text style={styles.settingDesc}>Quilômetros por hora (km/h)</Text>
                  </View>
                  <View style={styles.outputBadge}>
                    <Text style={styles.outputBadgeText}>km/h</Text>
                  </View>
                </View>
              </AutomotiveCard>
            </View>
          )}

          {activeSection === 'about' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Sobre o GoClient</Text>
              <Text style={styles.sectionSubtitle}>
                Informações de compilação, engenharia e integridade do software.
              </Text>

              <AutomotiveCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Versão do GoClient</Text>
                    <Text style={styles.settingDesc}>Fase 1 (Design Visual & Navegação Automotiva)</Text>
                  </View>
                  <Text style={styles.versionValue}>v1.0.0-rc1</Text>
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Framework & Motor</Text>
                    <Text style={styles.settingDesc}>React Native 0.86 • Expo SDK 57</Text>
                  </View>
                  <Text style={styles.versionValue}>SDK 57.0</Text>
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingName}>Repositório do Código</Text>
                    <Text style={styles.settingDesc}>GitHub: raulbarbosamachado2009-beep/GoClient</Text>
                  </View>
                  <Ionicons name="logo-github" size={24} color={colors.textPrimary} />
                </View>
              </AutomotiveCard>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: layout.spacing.xl,
    gap: layout.spacing.xl,
  },
  leftNavPanel: {
    width: 340,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: layout.spacing.lg,
    justifyContent: 'space-between',
  },
  menuHeaderTag: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: layout.spacing.md,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: layout.radius.lg,
    gap: 14,
  },
  menuItemActive: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  menuItemText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  menuItemTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  replayOnboardingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    paddingVertical: 14,
    borderRadius: layout.radius.pill,
    gap: 10,
    marginTop: 16,
  },
  replayOnboardingText: {
    ...typography.buttonMedium,
    color: colors.primary,
  },
  rightContentPanel: {
    flex: 1,
  },
  sectionContainer: {
    gap: layout.spacing.lg,
  },
  sectionTitle: {
    ...typography.title2,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -8,
  },
  settingCard: {
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingTexts: {
    flex: 0.8,
  },
  settingName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  outputBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  outputBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  versionValue: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.accentCyan,
  },
});
