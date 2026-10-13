// src/screens/HomeScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { AutomotiveCard } from '../components/AutomotiveCard';
import { AutomotiveButton } from '../components/AutomotiveButton';
import { AutomotiveHeader } from '../components/AutomotiveHeader';
import { initialVehicleStatus, mockMusicLibrary, mockNavigation, mockClients } from '../mock/mockData';

export const HomeScreen = ({ onNavigate, onOpenOnboarding }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(mockMusicLibrary.currentTrack.isLiked);

  const vipClient = mockClients.find((c) => c.isFavorite) || mockClients[0];

  return (
    <View style={styles.container}>
      <AutomotiveHeader
        title="Central Multimídia"
        subtitle="Painel Principal GoClient • Modo Condução Ativo"
        onHelpPress={onOpenOnboarding}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Grade Superior: Rota Ativa (Esq) + Mídia Atual (Dir) */}
        <View style={styles.topGrid}>
          {/* Card de Rota e Navegação Rápida */}
          <AutomotiveCard style={styles.routeCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTagRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.cardTagText}>NAVEGAÇÃO ATIVA</Text>
              </View>
              <Text style={styles.etaHighlight}>{mockNavigation.eta}</Text>
            </View>

            <Text style={styles.destinationTitle}>{mockNavigation.destination}</Text>
            <Text style={styles.destinationSubtitle}>
              Chegada prevista às {mockNavigation.arrivalTime} • {mockNavigation.distance}
            </Text>

            <View style={styles.trafficAlertBox}>
              <Ionicons name="speedometer-outline" size={18} color={colors.accentOrange} />
              <Text style={styles.trafficAlertText}>{mockNavigation.trafficStatus}</Text>
            </View>

            <View style={styles.cardActionsRow}>
              <AutomotiveButton
                title="Abrir no Mapa"
                variant="primary"
                size="medium"
                icon="map"
                onPress={() => onNavigate('map')}
                style={styles.cardBtn}
              />
              <AutomotiveButton
                title="Ver Rotas"
                variant="secondary"
                size="medium"
                icon="navigate-outline"
                onPress={() => onNavigate('routes')}
                style={styles.cardBtn}
              />
            </View>
          </AutomotiveCard>

          {/* Card de Mídia / Música Atual */}
          <AutomotiveCard style={styles.musicCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTagRow}>
                <Ionicons name="disc-outline" size={16} color={colors.primary} />
                <Text style={[styles.cardTagText, { color: colors.primary }]}>REPRODUZINDO AGORA</Text>
              </View>
              <TouchableOpacity onPress={() => setIsLiked(!isLiked)} style={styles.heartBtn}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isLiked ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.musicRow}>
              {/* Capa do Álbum em Destaque */}
              <View style={[styles.albumCoverPlaceholder, { backgroundColor: mockMusicLibrary.currentTrack.coverColor }]}>
                <Ionicons name="musical-notes" size={42} color="#FFFFFF" />
              </View>

              <View style={styles.musicInfo}>
                <Text style={styles.musicTitle} numberOfLines={1}>
                  {mockMusicLibrary.currentTrack.title}
                </Text>
                <Text style={styles.musicArtist}>
                  {mockMusicLibrary.currentTrack.artist} • {mockMusicLibrary.currentTrack.album}
                </Text>

                {/* Barra de Progresso da Faixa */}
                <View style={styles.trackProgressContainer}>
                  <View style={styles.trackProgressBar}>
                    <View style={[styles.trackProgressFill, { width: '62%' }]} />
                  </View>
                  <View style={styles.trackTimeRow}>
                    <Text style={styles.trackTimeText}>2:22</Text>
                    <Text style={styles.trackTimeText}>{mockMusicLibrary.currentTrack.duration}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Controles Táteis Grandes de Música */}
            <View style={styles.musicControlsRow}>
              <TouchableOpacity
                style={styles.controlIconBtn}
                onPress={() => {}}
                activeOpacity={0.7}
              >
                <Ionicons name="play-skip-back" size={26} color={colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playPauseBtn}
                onPress={() => setIsPlaying(!isPlaying)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={colors.textOnPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlIconBtn}
                onPress={() => {}}
                activeOpacity={0.7}
              >
                <Ionicons name="play-skip-forward" size={26} color={colors.textPrimary} />
              </TouchableOpacity>

              <AutomotiveButton
                title="Biblioteca"
                variant="glass"
                size="medium"
                icon="albums-outline"
                onPress={() => onNavigate('music')}
                style={styles.libraryBtn}
              />
            </View>
          </AutomotiveCard>
        </View>

        {/* Grade Inferior: Acesso Rápido a Clientes & Telemetria Veicular */}
        <View style={styles.bottomGrid}>
          {/* Card de Cliente VIP Rápido */}
          <AutomotiveCard style={styles.clientQuickCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTagText}>CONTATO FREQUENTE</Text>
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>{vipClient.status}</Text>
              </View>
            </View>

            <View style={styles.clientDetailsRow}>
              <View style={[styles.clientAvatar, { backgroundColor: vipClient.avatarBg }]}>
                <Text style={styles.clientAvatarText}>{vipClient.avatarInitials}</Text>
              </View>

              <View style={styles.clientInfoCol}>
                <Text style={styles.clientName}>{vipClient.name}</Text>
                <Text style={styles.clientCompany}>{vipClient.company}</Text>
                <Text style={styles.clientAddress} numberOfLines={1}>{vipClient.address}</Text>
              </View>
            </View>

            <View style={styles.clientActionsRow}>
              <AutomotiveButton
                title="Ligar"
                variant="glass"
                size="medium"
                icon="call"
                onPress={() => {}}
                style={styles.halfBtn}
              />
              <AutomotiveButton
                title="Agenda Completa"
                variant="secondary"
                size="medium"
                icon="people"
                onPress={() => onNavigate('contacts')}
                style={styles.halfBtn}
              />
            </View>
          </AutomotiveCard>

          {/* Card de Telemetria e Status do Carro */}
          <AutomotiveCard style={styles.telemetryCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTagText}>DIAGNÓSTICO DO VEÍCULO</Text>
              <Text style={styles.telemetryModeText}>MODO {initialVehicleStatus.driveMode.toUpperCase()}</Text>
            </View>

            <View style={styles.telemetryMetricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{initialVehicleStatus.speedKmh}</Text>
                <Text style={styles.metricLabel}>KM/H ATUAL</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: colors.accentGreen }]}>
                  {initialVehicleStatus.batteryPercent}%
                </Text>
                <Text style={styles.metricLabel}>BATERIA</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: colors.accentCyan }]}>
                  {initialVehicleStatus.cabinTemp}
                </Text>
                <Text style={styles.metricLabel}>CLIMATIZAÇÃO</Text>
              </View>
            </View>

            <View style={styles.deviceRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.accentBlue} />
              <Text style={styles.deviceText}>Conectado a {initialVehicleStatus.deviceName}</Text>
            </View>
          </AutomotiveCard>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: layout.spacing.xl,
    gap: layout.spacing.xl,
  },
  topGrid: {
    flexDirection: 'row',
    gap: layout.spacing.xl,
    height: 380,
  },
  routeCard: {
    flex: 0.5,
    justifyContent: 'space-between',
    borderColor: 'rgba(10, 132, 255, 0.25)',
  },
  musicCard: {
    flex: 0.5,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentGreen,
  },
  cardTagText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  etaHighlight: {
    ...typography.title2,
    color: colors.accentGreen,
  },
  destinationTitle: {
    ...typography.title1,
    color: colors.textPrimary,
    marginTop: 6,
  },
  destinationSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  trafficAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    padding: 12,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.25)',
  },
  trafficAlertText: {
    ...typography.bodySmall,
    color: colors.accentOrange,
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: layout.spacing.md,
  },
  cardBtn: {
    flex: 1,
  },
  heartBtn: {
    padding: 4,
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.spacing.lg,
  },
  albumCoverPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicInfo: {
    flex: 1,
  },
  musicTitle: {
    ...typography.title2,
    color: colors.textPrimary,
  },
  musicArtist: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  trackProgressContainer: {
    marginTop: 12,
  },
  trackProgressBar: {
    height: 6,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  trackTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  trackTimeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  musicControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  controlIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryBtn: {
    marginLeft: layout.spacing.sm,
  },
  bottomGrid: {
    flexDirection: 'row',
    gap: layout.spacing.xl,
    height: 250,
  },
  clientQuickCard: {
    flex: 0.5,
    justifyContent: 'space-between',
  },
  vipBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: layout.radius.pill,
  },
  vipBadgeText: {
    ...typography.caption,
    color: colors.accentBlue,
  },
  clientDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.spacing.md,
  },
  clientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    ...typography.title2,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  clientInfoCol: {
    flex: 1,
  },
  clientName: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  clientCompany: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clientAddress: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  clientActionsRow: {
    flexDirection: 'row',
    gap: layout.spacing.md,
  },
  halfBtn: {
    flex: 1,
  },
  telemetryCard: {
    flex: 0.5,
    justifyContent: 'space-between',
  },
  telemetryModeText: {
    ...typography.caption,
    color: colors.accentCyan,
  },
  telemetryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: layout.spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    ...typography.hero,
    fontSize: 40,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.surfaceBorder,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
    borderRadius: layout.radius.md,
  },
  deviceText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
