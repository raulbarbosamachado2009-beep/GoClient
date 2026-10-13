// src/screens/HomeScreen.js
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamilies } from '../theme/typography';
import { layout } from '../theme/layout';
import { mockNavigation, mockMusicLibrary, initialVehicleStatus } from '../mock/mockData';

export const HomeScreen = ({ onNavigate }) => {
  const [selectedTransport, setSelectedTransport] = useState('car'); // 'car' | 'walk' | 'bike'
  const [searchQuery, setSearchQuery] = useState('CENU - Centro Empresarial');
  const [isPlayingMusic, setIsPlayingMusic] = useState(true);

  return (
    <View style={styles.container}>
      {/* 1. BARRA LATERAL ESQUERDA (SIDEBAR ESTILO APPLE MAPS) */}
      <View style={styles.sidebar}>
        {/* Topo da Sidebar: Logo Maps / GoClient */}
        <View style={styles.sidebarTop}>
          <View style={styles.logoRow}>
            <Ionicons name="speedometer" size={24} color={colors.textPrimary} />
            <Text style={styles.logoTitle}>Maps</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>BETA</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.collapseBtn}>
            <Ionicons name="albums-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Menu Principal Vertical */}
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="grid-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>Guides</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemActive]}>
            <Ionicons name="navigate" size={20} color={colors.actionBlue} />
            <Text style={[styles.menuItemText, styles.menuItemTextActive]}>Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Recentes (Recents >) */}
        <View style={styles.recentsSection}>
          <View style={styles.recentsHeader}>
            <Text style={styles.recentsTitle}>Recents</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.recentsList}>
            <TouchableOpacity style={styles.recentItem}>
              <View style={[styles.recentCircle, { backgroundColor: colors.actionBlue }]}>
                <Ionicons name="star" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.recentItemText} numberOfLines={1}>
                CENU - Central...
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.recentItem}>
              <View style={[styles.recentCircle, { backgroundColor: colors.accentPurple }]}>
                <Ionicons name="business" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.recentItemText} numberOfLines={1}>
                Apex Soluções...
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.recentItem}>
              <View style={[styles.recentCircle, { backgroundColor: colors.accentOrange }]}>
                <Ionicons name="restaurant" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.recentItemText} numberOfLines={1}>
                Figueira Rubaiyat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.recentItem}>
              <View style={[styles.recentCircle, { backgroundColor: colors.accentGreen }]}>
                <Ionicons name="airplane" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.recentItemText} numberOfLines={1}>
                Aeroporto CGH
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Rodapé da Sidebar */}
        <View style={styles.sidebarFooter}>
          <Text style={styles.footerHelpText}>GoClient Automotive OS</Text>
          <TouchableOpacity>
            <Text style={styles.footerLinkText}>Gerenciar Negócios e Rotas ↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. PAINEL FLUTUANTE DE DIREÇÕES (DIRECTIONS PANEL) */}
      <View style={styles.directionsPanel}>
        {/* Cabeçalho do Painel: Título + Botão Compartilhar e Fechar */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Directions</Text>
          <View style={styles.panelHeaderActions}>
            <TouchableOpacity style={styles.headerCircleBtn}>
              <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerCircleBtn}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Seletor de Modal de Transporte */}
        <View style={styles.transportSelector}>
          <TouchableOpacity
            style={[
              styles.transportTab,
              selectedTransport === 'car' && styles.transportTabActive,
            ]}
            onPress={() => setSelectedTransport('car')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="car"
              size={18}
              color={selectedTransport === 'car' ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportTab,
              selectedTransport === 'walk' && styles.transportTabActive,
            ]}
            onPress={() => setSelectedTransport('walk')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="walk"
              size={18}
              color={selectedTransport === 'walk' ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportTab,
              selectedTransport === 'bike' && styles.transportTabActive,
            ]}
            onPress={() => setSelectedTransport('bike')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="bicycle"
              size={18}
              color={selectedTransport === 'bike' ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Linhas de Trajeto: Origem, Ponto Intermediário e Destino */}
        <View style={styles.routePointsBox}>
          {/* Ponto 1: Minha Localização */}
          <View style={styles.routeRow}>
            <View style={[styles.routePinDot, { backgroundColor: colors.actionBlue }]}>
              <Ionicons name="navigate" size={10} color="#FFFFFF" />
            </View>
            <Text style={styles.routeLocationText} numberOfLines={1}>
              Minha Localização (Av. Paulista)
            </Text>
            <Ionicons name="reorder-two-outline" size={18} color={colors.border} />
          </View>

          <View style={styles.connectorSegment} />

          {/* Ponto 2: Parada Intermediária */}
          <View style={styles.routeRow}>
            <View style={[styles.routePinDot, { backgroundColor: colors.accentPurple }]}>
              <Ionicons name="business" size={10} color="#FFFFFF" />
            </View>
            <Text style={styles.routeLocationText} numberOfLines={1}>
              Apex Soluções (Carlos Mendes)
            </Text>
            <Ionicons name="reorder-two-outline" size={18} color={colors.border} />
          </View>

          <View style={styles.connectorSegment} />

          {/* Ponto 3: Campo de Destino com Busca */}
          <View style={styles.activeDestinationInputRow}>
            <Ionicons name="add-circle" size={18} color={colors.actionBlue} />
            <TextInput
              style={styles.destinationInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Pesquisar destino..."
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={styles.inputMoreBtn}>
              <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <Ionicons name="reorder-two-outline" size={18} color={colors.border} />
          </View>
        </View>

        {/* Lista de Sugestões de Destinos / Locais com Marcadores Amarelos */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.suggestionsScroll}
          contentContainerStyle={styles.suggestionsContent}
        >
          {/* Item 1: Pesquisar nas proximidades */}
          <TouchableOpacity style={styles.suggestionItem}>
            <View style={[styles.suggestionIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.suggestionTexts}>
              <Text style={styles.suggestionTitle}>CENU</Text>
              <Text style={styles.suggestionSubtitle}>Buscar nas proximidades</Text>
            </View>
          </TouchableOpacity>

          {/* Item 2: CENU Torre Norte */}
          <TouchableOpacity style={styles.suggestionItem}>
            <View style={[styles.suggestionIconCircle, { backgroundColor: colors.accentYellow }]}>
              <Ionicons name="bag" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.suggestionTexts}>
              <Text style={styles.suggestionTitle}>CENU Torre Norte</Text>
              <Text style={styles.suggestionSubtitle}>
                9.4 km • Av. das Nações Unidas, 12901
              </Text>
              <Text style={styles.suggestionMeta}>★ Destaque em 3 Guias Automotivos</Text>
            </View>
          </TouchableOpacity>

          {/* Item 3: Estacionamento VIP */}
          <TouchableOpacity style={styles.suggestionItem}>
            <View style={[styles.suggestionIconCircle, { backgroundColor: colors.accentYellow }]}>
              <Ionicons name="car" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.suggestionTexts}>
              <Text style={styles.suggestionTitle}>CENU Estacionamento VIP</Text>
              <Text style={styles.suggestionSubtitle}>9.4 km • Entrada G2 Subsolo</Text>
            </View>
          </TouchableOpacity>

          {/* Item 4: Apex Soluções */}
          <TouchableOpacity style={styles.suggestionItem}>
            <View style={[styles.suggestionIconCircle, { backgroundColor: colors.accentYellow }]}>
              <Ionicons name="business" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.suggestionTexts}>
              <Text style={styles.suggestionTitle}>Apex Soluções - Faria Lima</Text>
              <Text style={styles.suggestionSubtitle}>5.1 km • Av. Brigadeiro Faria Lima, 3477</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Rodapé de Estimativa de Tempo (ETA) Idêntico à Referência */}
        <View style={styles.etaFooter}>
          <View style={styles.etaTextCol}>
            <Text style={styles.etaTimeNumber}>18 min</Text>
            <Text style={styles.etaSubDetails}>
              {mockNavigation.arrivalTime} ETA • {mockNavigation.distance}
            </Text>
          </View>
          <TouchableOpacity style={styles.infoCircleBtn}>
            <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. ÁREA AMPLA DO MAPA (MAP CANVAS) */}
      <View style={styles.mapCanvas}>
        {/* Renderização Vetorial Clara e Nítida do Mapa */}
        <View style={styles.mapVectorGrid}>
          {/* Rio / Corpo d'água */}
          <View style={styles.vectorRiver} />

          {/* Malha Viária da Cidade */}
          <View style={styles.avenueVertical} />
          <View style={styles.avenueHorizontal} />
          <View style={styles.avenueDiagonal} />
          <View style={styles.streetMinor1} />
          <View style={styles.streetMinor2} />

          {/* Área Verde / Parque Urbano */}
          <View style={styles.greenParkArea}>
            <Text style={styles.parkLabel}>Parque do Povo</Text>
          </View>

          {/* Traçado da Rota Principal em Azul Apple Maps */}
          <View style={styles.mainRouteLine} />

          {/* Rota Alternativa */}
          <View style={styles.altRouteLine} />

          {/* Pin de Origem */}
          <View style={styles.originPinWrapper}>
            <View style={styles.originPinOuter}>
              <View style={styles.originPinInner} />
            </View>
            <Text style={styles.pinLabel}>Av. Paulista</Text>
          </View>

          {/* Pin de Destino */}
          <View style={styles.destPinWrapper}>
            <View style={styles.destPinOuter}>
              <Ionicons name="flag" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.pinLabel}>CENU</Text>
          </View>

          {/* Balão Flutuante de ETA Principal: 18 min Mais Rápido */}
          <View style={styles.fastestRouteBadge}>
            <Text style={styles.fastestBadgeTime}>18 min</Text>
            <Text style={styles.fastestBadgeSub}>Mais Rápido</Text>
          </View>

          {/* Balão Flutuante da Rota Alternativa: 22 min */}
          <View style={styles.altRouteBadge}>
            <Text style={styles.altBadgeTime}>22 min</Text>
          </View>
        </View>

        {/* Widget Automotivo Flutuante no Topo do Mapa: Mídia & Clima */}
        <View style={styles.floatingMediaBar}>
          {/* Status do Veículo */}
          <View style={styles.vehicleStatPill}>
            <Ionicons name="thermometer-outline" size={16} color={colors.actionBlue} />
            <Text style={styles.vehicleStatText}>{initialVehicleStatus.cabinTemp}</Text>
          </View>

          <View style={styles.vehicleStatPill}>
            <Ionicons name="battery-charging-outline" size={16} color={colors.accentGreen} />
            <Text style={styles.vehicleStatText}>{initialVehicleStatus.rangeKm} km</Text>
          </View>

          {/* Mini Player de Áudio do Carro */}
          <View style={styles.miniPlayerPill}>
            <View
              style={[
                styles.miniPlayerCover,
                { backgroundColor: mockMusicLibrary.currentTrack.coverColor },
              ]}
            >
              <Ionicons name="musical-notes" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.miniPlayerTexts}>
              <Text style={styles.miniPlayerTitle} numberOfLines={1}>
                {mockMusicLibrary.currentTrack.title}
              </Text>
              <Text style={styles.miniPlayerArtist} numberOfLines={1}>
                {mockMusicLibrary.currentTrack.artist}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsPlayingMusic(!isPlayingMusic)}
              style={styles.miniPlayerBtn}
            >
              <Ionicons
                name={isPlayingMusic ? 'pause' : 'play'}
                size={18}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Controles Flutuantes do Mapa (Superior Direito) */}
        <View style={styles.mapTopControls}>
          <TouchableOpacity style={styles.mapRoundBtn}>
            <Ionicons name="compass" size={22} color={colors.actionBlue} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.mapRoundBtn}>
            <Ionicons name="locate" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.mapRoundBtn}>
            <Ionicons name="layers-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Controles de Zoom (Inferior Direito) */}
        <View style={styles.zoomControlsWrapper}>
          <View style={styles.zoomPill}>
            <TouchableOpacity style={styles.zoomStepBtn}>
              <Ionicons name="add" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.zoomStepBtn}>
              <Ionicons name="remove" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.mapCopyright}>
            Privacidade • Termos • Dados do Mapa © GoClient
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.sidebarBackground,
  },

  // 1. BARRA LATERAL
  sidebar: {
    width: layout.sidebarWidth,
    height: '100%',
    backgroundColor: colors.sidebarBackground,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  sidebarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  betaBadge: {
    backgroundColor: '#D9E6EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaBadgeText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 9,
    color: colors.textSecondary,
  },
  collapseBtn: {
    padding: 4,
  },
  menuGroup: {
    gap: 6,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: layout.radius.small,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
  },
  menuItemText: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  menuItemTextActive: {
    fontFamily: fontFamilies.semibold,
    color: colors.actionBlue,
  },
  recentsSection: {
    flex: 1,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  recentsTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  recentsList: {
    flex: 1,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  recentCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemText: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  sidebarFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHelpText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  footerLinkText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    color: colors.actionBlue,
  },

  // 2. PAINEL FLUTUANTE DE DIREÇÕES
  directionsPanel: {
    width: layout.panelWidth,
    height: '100%',
    backgroundColor: colors.cardSurface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 6,
      },
    }),
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  panelTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  panelHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportSelector: {
    flexDirection: 'row',
    backgroundColor: '#EAECEE',
    borderRadius: layout.radius.pill,
    padding: 3,
    marginBottom: 16,
  },
  transportTab: {
    flex: 1,
    height: 36,
    borderRadius: layout.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportTabActive: {
    backgroundColor: colors.actionBlue,
  },
  routePointsBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: layout.radius.card,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 32,
  },
  routePinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLocationText: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  connectorSegment: {
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    marginLeft: 10,
    marginVertical: 2,
  },
  activeDestinationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSurface,
    borderRadius: layout.radius.small,
    borderWidth: 1.5,
    borderColor: colors.actionBlue,
    paddingHorizontal: 8,
    height: 38,
    gap: 8,
  },
  destinationInput: {
    flex: 1,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  inputMoreBtn: {
    padding: 4,
  },
  suggestionsScroll: {
    flex: 1,
  },
  suggestionsContent: {
    gap: 8,
    paddingBottom: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: layout.radius.small,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  suggestionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  suggestionTexts: {
    flex: 1,
  },
  suggestionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  suggestionSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  suggestionMeta: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  etaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  etaTextCol: {
    flex: 1,
  },
  etaTimeNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    color: colors.textPrimary,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  etaSubDetails: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoCircleBtn: {
    padding: 6,
  },

  // 3. ÁREA AMPLA DO MAPA (MAP CANVAS)
  mapCanvas: {
    flex: 1,
    backgroundColor: colors.mapBackground,
    position: 'relative',
    overflow: 'hidden',
  },
  mapVectorGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F3EC',
  },
  vectorRiver: {
    position: 'absolute',
    top: -80,
    left: '22%',
    width: 90,
    height: '140%',
    backgroundColor: colors.mapRiver,
    transform: [{ rotate: '-22deg' }],
    opacity: 0.85,
  },
  avenueVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '42%',
    width: 22,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.mapRoadBorder,
  },
  avenueHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '48%',
    height: 26,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.mapRoadBorder,
  },
  avenueDiagonal: {
    position: 'absolute',
    top: -120,
    bottom: -120,
    left: '52%',
    width: 18,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '42deg' }],
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.mapRoadBorder,
  },
  streetMinor1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '25%',
    height: 10,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E0D8',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  streetMinor2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '72%',
    height: 10,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E0D8',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  greenParkArea: {
    position: 'absolute',
    top: '28%',
    left: '58%',
    width: 220,
    height: 180,
    backgroundColor: '#D9EED8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BDDFBC',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    color: '#3B7A38',
  },
  mainRouteLine: {
    position: 'absolute',
    top: '32%',
    left: '38%',
    width: 340,
    height: 190,
    borderColor: colors.routePrimary,
    borderTopWidth: 8,
    borderRightWidth: 8,
    borderRadius: 60,
    transform: [{ rotate: '12deg' }],
  },
  altRouteLine: {
    position: 'absolute',
    top: '26%',
    left: '44%',
    width: 320,
    height: 210,
    borderColor: colors.routeAlternative,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderRadius: 70,
    transform: [{ rotate: '-8deg' }],
  },
  originPinWrapper: {
    position: 'absolute',
    top: '46%',
    left: '35%',
    alignItems: 'center',
  },
  originPinOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.actionBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  originPinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  destPinWrapper: {
    position: 'absolute',
    top: '25%',
    left: '74%',
    alignItems: 'center',
  },
  destPinOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.actionBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  pinLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fastestRouteBadge: {
    position: 'absolute',
    top: '34%',
    left: '52%',
    backgroundColor: colors.actionBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: layout.radius.pill,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(10, 132, 255, 0.35)' },
      default: { elevation: 4 },
    }),
  },
  fastestBadgeTime: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  fastestBadgeSub: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    color: '#E0F0FF',
  },
  altRouteBadge: {
    position: 'absolute',
    top: '24%',
    left: '58%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  altBadgeTime: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // WIDGET FLUTUANTE DE MÍDIA & VEÍCULO
  floatingMediaBar: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  vehicleStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
      default: { elevation: 2 },
    }),
  },
  vehicleStatText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  miniPlayerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
      default: { elevation: 3 },
    }),
  },
  miniPlayerCover: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayerTexts: {
    maxWidth: 160,
  },
  miniPlayerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  miniPlayerArtist: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  miniPlayerBtn: {
    padding: 4,
  },

  // CONTROLES FLUTUANTES DO MAPA
  mapTopControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    gap: 10,
    zIndex: 10,
  },
  mapRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      default: { elevation: 2 },
    }),
  },
  zoomControlsWrapper: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 10,
  },
  zoomPill: {
    backgroundColor: colors.cardSurface,
    borderRadius: layout.radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      default: { elevation: 2 },
    }),
  },
  zoomStepBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  mapCopyright: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
});
