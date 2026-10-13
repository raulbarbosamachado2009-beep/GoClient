// src/screens/MapScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { AutomotiveButton } from '../components/AutomotiveButton';
import { mockNavigation } from '../mock/mockData';

export const MapScreen = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransport, setSelectedTransport] = useState('car'); // 'car' | 'transit' | 'pedestrian'
  const [isNavigating, setIsNavigating] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);

  return (
    <View style={styles.container}>
      {/* Painel Lateral Flutuante de Direções / Busca (Inspirado no Apple Maps) */}
      <View style={styles.directionsPanel}>
        {/* Cabeçalho do Painel */}
        <View style={styles.panelHeader}>
          <View style={styles.panelHeaderLeft}>
            <Ionicons name="navigate" size={24} color={colors.accentBlue} />
            <Text style={styles.panelTitle}>Navegação</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>GPS ATIVO</Text>
          </View>
        </View>

        {/* Seleção do Modo de Transporte */}
        <View style={styles.transportSelector}>
          <TouchableOpacity
            style={[
              styles.transportBtn,
              selectedTransport === 'car' && styles.transportBtnActive,
            ]}
            onPress={() => setSelectedTransport('car')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="car"
              size={20}
              color={selectedTransport === 'car' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.transportBtnText,
                selectedTransport === 'car' && styles.transportBtnTextActive,
              ]}
            >
              Carro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportBtn,
              selectedTransport === 'transit' && styles.transportBtnActive,
            ]}
            onPress={() => setSelectedTransport('transit')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="bus"
              size={20}
              color={selectedTransport === 'transit' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.transportBtnText,
                selectedTransport === 'transit' && styles.transportBtnTextActive,
              ]}
            >
              Ônibus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportBtn,
              selectedTransport === 'pedestrian' && styles.transportBtnActive,
            ]}
            onPress={() => setSelectedTransport('pedestrian')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="walk"
              size={20}
              color={selectedTransport === 'pedestrian' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.transportBtnText,
                selectedTransport === 'pedestrian' && styles.transportBtnTextActive,
              ]}
            >
              A pé
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inputs de Origem e Destino */}
        <View style={styles.routeInputsContainer}>
          <View style={styles.routeInputRow}>
            <View style={styles.locationPinDot} />
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>ORIGEM</Text>
              <Text style={styles.inputValueText} numberOfLines={1}>
                {mockNavigation.currentLocation}
              </Text>
            </View>
          </View>

          <View style={styles.connectorLine} />

          <View style={styles.routeInputRow}>
            <View style={[styles.locationPinDot, { backgroundColor: colors.accentBlue }]} />
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>DESTINO SELECIONADO</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Pesquisar endereço ou cliente..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery || mockNavigation.destination}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        </View>

        {/* Estimativa de Rota em Destaque */}
        <View style={styles.etaCard}>
          <View style={styles.etaHeader}>
            <View>
              <Text style={styles.etaTime}>{mockNavigation.eta}</Text>
              <Text style={styles.etaDetails}>
                Chegada {mockNavigation.arrivalTime} • {mockNavigation.distance}
              </Text>
            </View>
            <View style={styles.fastestBadge}>
              <Text style={styles.fastestBadgeText}>Mais Rápido</Text>
            </View>
          </View>

          <View style={styles.trafficAlertRow}>
            <Ionicons name="information-circle" size={16} color={colors.accentOrange} />
            <Text style={styles.trafficAlertText}>
              {mockNavigation.trafficStatus}
            </Text>
          </View>
        </View>

        {/* Botão de Ação: Iniciar Navegação */}
        <AutomotiveButton
          title={isNavigating ? 'Encerrar Rota' : 'Iniciar Navegação'}
          variant={isNavigating ? 'danger' : 'primary'}
          size="large"
          icon={isNavigating ? 'close-circle' : 'navigate'}
          onPress={() => setIsNavigating(!isNavigating)}
          style={styles.startNavBtn}
        />
      </View>

      {/* Área Principal de Renderização do Mapa Automotivo */}
      <View style={styles.mapCanvas}>
        {/* Simulação Visual do Mapa Vetorial com Ruas e Rio */}
        <View style={styles.mapGridMock}>
          {/* Rio fictício */}
          <View style={styles.riverCurve} />

          {/* Vias Expressas e Ruas */}
          <View style={styles.roadAvenida} />
          <View style={styles.roadMarginal} />
          <View style={styles.roadDiagonal} />

          {/* Traçado da Rota Navegável (Azul Apple Maps) */}
          <View style={styles.routeTrajectoryLine} />

          {/* Pin de Origem */}
          <View style={[styles.mapPin, styles.originPin]}>
            <View style={styles.originInnerDot} />
          </View>

          {/* Pin de Destino */}
          <View style={[styles.mapPin, styles.destinationPin]}>
            <Ionicons name="flag" size={18} color="#FFFFFF" />
          </View>

          {/* Balão de ETA Flutuante no Meio da Rota */}
          <View style={styles.floatingEtaBubble}>
            <Text style={styles.floatingEtaText}>{mockNavigation.eta}</Text>
          </View>
        </View>

        {/* Controles Flutuantes do Mapa (Superior Direito) */}
        <View style={styles.mapFloatingControls}>
          <TouchableOpacity
            style={styles.floatingCtrlBtn}
            onPress={() => {}}
            activeOpacity={0.8}
          >
            <Ionicons name="compass" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.floatingCtrlBtn,
              showTraffic && styles.floatingCtrlBtnActive,
            ]}
            onPress={() => setShowTraffic(!showTraffic)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="car-outline"
              size={22}
              color={showTraffic ? colors.accentGreen : colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={styles.zoomCtrlGroup}>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => {}}>
              <Ionicons name="add" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.zoomBtn} onPress={() => {}}>
              <Ionicons name="remove" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de Próxima Manobra (Quando em Navegação Ativa) */}
        {isNavigating && (
          <View style={styles.navigationBanner}>
            <View style={styles.maneuverIconBox}>
              <Ionicons name="arrow-undo" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.maneuverTextBox}>
              <Text style={styles.maneuverDistance}>A 350 metros</Text>
              <Text style={styles.maneuverStreet}>Vire à esquerda na Av. Brigadeiro Faria Lima</Text>
            </View>
            <View style={styles.speedLimitBadge}>
              <Text style={styles.speedLimitNumber}>60</Text>
              <Text style={styles.speedLimitText}>KM/H</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  directionsPanel: {
    width: 440,
    height: '100%',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceBorder,
    padding: layout.spacing.xl,
    justifyContent: 'space-between',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: layout.spacing.md,
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelTitle: {
    ...typography.title2,
    color: colors.textPrimary,
  },
  statusBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: layout.radius.pill,
  },
  statusBadgeText: {
    ...typography.caption,
    color: colors.accentGreen,
    fontSize: 10,
  },
  transportSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: layout.radius.pill,
    padding: 4,
    gap: 4,
    marginBottom: layout.spacing.lg,
  },
  transportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: layout.radius.pill,
    gap: 6,
  },
  transportBtnActive: {
    backgroundColor: colors.accentBlue,
  },
  transportBtnText: {
    ...typography.buttonMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  transportBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  routeInputsContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: layout.spacing.lg,
  },
  routeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationPinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentGreen,
  },
  connectorLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.surfaceBorderStrong,
    marginLeft: 5,
    marginVertical: 4,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  inputValueText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  inputField: {
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 2,
  },
  etaCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    marginBottom: layout.spacing.lg,
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  etaTime: {
    ...typography.title1,
    color: colors.accentGreen,
  },
  etaDetails: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fastestBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: layout.radius.pill,
  },
  fastestBadgeText: {
    ...typography.caption,
    color: colors.accentGreen,
  },
  trafficAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: 8,
  },
  trafficAlertText: {
    ...typography.bodySmall,
    color: colors.accentOrange,
    flex: 1,
  },
  startNavBtn: {
    width: '100%',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#15171C',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridMock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#191B22',
  },
  riverCurve: {
    position: 'absolute',
    top: 140,
    left: -50,
    right: -50,
    height: 100,
    backgroundColor: '#0E2238',
    transform: [{ rotate: '-8deg' }],
    opacity: 0.8,
  },
  roadAvenida: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '35%',
    width: 24,
    backgroundColor: '#262935',
  },
  roadMarginal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '55%',
    height: 32,
    backgroundColor: '#2A2E3D',
  },
  roadDiagonal: {
    position: 'absolute',
    top: -100,
    bottom: -100,
    left: '50%',
    width: 20,
    backgroundColor: '#262935',
    transform: [{ rotate: '42deg' }],
  },
  routeTrajectoryLine: {
    position: 'absolute',
    top: '30%',
    left: '30%',
    width: 380,
    height: 160,
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderColor: colors.accentBlue,
    borderRadius: 80,
    transform: [{ rotate: '15deg' }],
  },
  mapPin: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  originPin: {
    top: '42%',
    left: '28%',
    backgroundColor: colors.accentGreen,
  },
  originInnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  destinationPin: {
    top: '25%',
    left: '68%',
    backgroundColor: colors.primary,
  },
  floatingEtaBubble: {
    position: 'absolute',
    top: '28%',
    left: '46%',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: colors.accentBlue,
  },
  floatingEtaText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  mapFloatingControls: {
    position: 'absolute',
    top: 24,
    right: 24,
    gap: 12,
  },
  floatingCtrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  floatingCtrlBtnActive: {
    borderColor: colors.accentGreen,
  },
  zoomCtrlGroup: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  navigationBanner: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 120,
    backgroundColor: colors.surfaceElevated || '#1A1C23',
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accentBlue,
    gap: 16,
  },
  maneuverIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maneuverTextBox: {
    flex: 1,
  },
  maneuverDistance: {
    ...typography.caption,
    color: colors.accentCyan,
    fontSize: 12,
  },
  maneuverStreet: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  speedLimitBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FF3B30',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedLimitNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  speedLimitText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#000000',
    marginTop: -2,
  },
});
