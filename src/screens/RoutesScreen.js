// src/screens/RoutesScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { AutomotiveCard } from '../components/AutomotiveCard';
import { AutomotiveButton } from '../components/AutomotiveButton';
import { AutomotiveHeader } from '../components/AutomotiveHeader';
import { mockNavigation } from '../mock/mockData';

export const RoutesScreen = ({ onStartRoute }) => {
  const [selectedRoute, setSelectedRoute] = useState(mockNavigation.recentRoutes[0]);
  const [routesList, setRoutesList] = useState(mockNavigation.recentRoutes);

  const toggleFavorite = (id) => {
    setRoutesList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  return (
    <View style={styles.container}>
      <AutomotiveHeader
        title="Planejamento de Rotas"
        subtitle="Destinos Frequentes • Cálculo de Trajetos Otimizados"
      />

      {/* Grid Principal Widescreen 16:9 */}
      <View style={styles.splitLayout}>
        {/* Lado Esquerdo: Lista de Destinos Recentes & Favoritos */}
        <View style={styles.leftColumn}>
          <View style={styles.listSectionHeader}>
            <Text style={styles.sectionTitle}>DESTINOS RECENTES & SALVOS</Text>
            <View style={styles.routesCountBadge}>
              <Text style={styles.routesCountText}>{routesList.length} locais</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.routesScroll}>
            {routesList.map((route) => {
              const isSelected = selectedRoute.id === route.id;
              return (
                <TouchableOpacity
                  key={route.id}
                  style={[styles.routeItemCard, isSelected && styles.routeItemCardActive]}
                  onPress={() => setSelectedRoute(route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.routeCategoryIconBox}>
                    <Ionicons
                      name={
                        route.category === 'work'
                          ? 'briefcase'
                          : route.category === 'client'
                          ? 'business'
                          : route.category === 'transit'
                          ? 'airplane'
                          : 'leaf'
                      }
                      size={24}
                      color={isSelected ? colors.primary : colors.accentBlue}
                    />
                  </View>

                  <View style={styles.routeItemInfo}>
                    <Text style={styles.routeTitle} numberOfLines={1}>
                      {route.title}
                    </Text>
                    <Text style={styles.routeAddress} numberOfLines={1}>
                      {route.address}
                    </Text>
                  </View>

                  <View style={styles.routeItemStats}>
                    <Text style={styles.routeDuration}>{route.duration}</Text>
                    <Text style={styles.routeDistance}>{route.distance}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => toggleFavorite(route.id)}
                    style={styles.favIconBtn}
                  >
                    <Ionicons
                      name={route.isFavorite ? 'star' : 'star-outline'}
                      size={20}
                      color={route.isFavorite ? colors.accentOrange : colors.textMuted}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lado Direito: Pré-visualização do Trajeto Selecionado */}
        <View style={styles.rightColumn}>
          <AutomotiveCard style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewTagGroup}>
                <Ionicons name="navigate-circle" size={24} color={colors.accentGreen} />
                <Text style={styles.previewTagText}>ITINERÁRIO RECOMENDADO</Text>
              </View>
              <View style={styles.bestTimeBadge}>
                <Text style={styles.bestTimeText}>Melhor Horário</Text>
              </View>
            </View>

            <View style={styles.destinationDisplay}>
              <Text style={styles.destinationName}>{selectedRoute.title}</Text>
              <Text style={styles.destinationFullAddress}>{selectedRoute.address}</Text>
            </View>

            {/* Painel com Métricas de Trânsito */}
            <View style={styles.metricsBox}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{selectedRoute.duration}</Text>
                <Text style={styles.metricSub}>TEMPO ESTIMADO</Text>
              </View>

              <View style={styles.metricSep} />

              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{selectedRoute.distance}</Text>
                <Text style={styles.metricSub}>DISTÂNCIA TOTAL</Text>
              </View>

              <View style={styles.metricSep} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: colors.accentGreen }]}>Sem Pedágio</Text>
                <Text style={styles.metricSub}>TARIFA</Text>
              </View>
            </View>

            {/* Simulação Gráfica dos Trechos */}
            <View style={styles.timelineContainer}>
              <View style={styles.timelineStep}>
                <View style={[styles.stepDot, { backgroundColor: colors.accentGreen }]} />
                <View style={styles.stepTexts}>
                  <Text style={styles.stepName}>Ponto de Partida</Text>
                  <Text style={styles.stepDesc}>{mockNavigation.currentLocation}</Text>
                </View>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.timelineStep}>
                <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
                <View style={styles.stepTexts}>
                  <Text style={styles.stepName}>Destino Final</Text>
                  <Text style={styles.stepDesc}>{selectedRoute.title}</Text>
                </View>
              </View>
            </View>

            {/* Botão de Iniciar Rota com 1 Toque */}
            <AutomotiveButton
              title="Iniciar Trajeto no Mapa"
              variant="primary"
              size="large"
              icon="paper-plane"
              onPress={() => {
                if (onStartRoute) onStartRoute(selectedRoute);
              }}
              style={styles.startRouteBtn}
            />
          </AutomotiveCard>
        </View>
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
  leftColumn: {
    flex: 0.46,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: layout.spacing.md,
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: layout.spacing.md,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  routesCountBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: layout.radius.pill,
  },
  routesCountText: {
    ...typography.caption,
    color: colors.accentCyan,
    fontSize: 10,
  },
  routesScroll: {
    gap: 10,
  },
  routeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
    borderRadius: layout.radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  routeItemCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated || '#22222D',
  },
  routeCategoryIconBox: {
    width: 48,
    height: 48,
    borderRadius: layout.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeItemInfo: {
    flex: 1,
  },
  routeTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  routeAddress: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  routeItemStats: {
    alignItems: 'flex-end',
  },
  routeDuration: {
    ...typography.title3,
    color: colors.accentGreen,
  },
  routeDistance: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  favIconBtn: {
    padding: 4,
    marginLeft: 4,
  },
  rightColumn: {
    flex: 0.54,
  },
  previewCard: {
    flex: 1,
    justifyContent: 'space-between',
    padding: layout.spacing.xl,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTagText: {
    ...typography.caption,
    color: colors.accentGreen,
  },
  bestTimeBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: layout.radius.pill,
  },
  bestTimeText: {
    ...typography.caption,
    color: colors.accentGreen,
    fontSize: 10,
  },
  destinationDisplay: {
    marginVertical: layout.spacing.sm,
  },
  destinationName: {
    ...typography.title1,
    color: colors.textPrimary,
  },
  destinationFullAddress: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: layout.radius.lg,
    paddingVertical: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    ...typography.title2,
    color: colors.textPrimary,
  },
  metricSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  metricSep: {
    width: 1,
    height: 36,
    backgroundColor: colors.surfaceBorder,
  },
  timelineContainer: {
    paddingHorizontal: 10,
    marginVertical: layout.spacing.sm,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepTexts: {
    flex: 1,
  },
  stepName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: colors.surfaceBorderStrong,
    marginLeft: 6,
    marginVertical: 4,
  },
  startRouteBtn: {
    width: '100%',
  },
});
