// src/screens/HomeScreen.js
import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { layout } from '../theme/layout';
import { mockMusicLibrary, initialVehicleStatus } from '../mock/mockData';

// Habilitar LayoutAnimation no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Constantes da sidebar
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_EXPANDED_WIDTH = 240;
const SIDEBAR_ICON_COLLAPSED = 30;
const SIDEBAR_ICON_EXPANDED = 20;

// Constantes do painel de direções
const PANEL_MIN_WIDTH = 350;
const PANEL_MAX_WIDTH = 620;
const PANEL_DEFAULT_WIDTH = 480;

// Lista de clientes simulados para entrega / rota comercial
const CLIENTS_LIST = [
  {
    id: 'c1',
    name: 'Mizael Dorotéia',
    status: 'Ativo',
    avatarEmoji: '👨‍💼',
    avatarBg: '#EBF3FA',
    orderTitle: 'Pedido',
    orderItems: [
      '1x Pomada Caramelo',
      '5x Cola Comercial',
      '10x Shampoo 5L',
      '20x Pomada Barbearia',
    ],
    addressLine1: 'Rua Padre Natal Pigato, 17',
    addressLine2: 'Vila Missionária',
    phone: '(+55) 11 96461-7878',
    eta: '18 min',
    arrivalTime: '14:43',
    distance: '9.4 km',
  },
  {
    id: 'c2',
    name: 'Carlos Mendes',
    status: 'Aguardando',
    avatarEmoji: '👨‍🔧',
    avatarBg: '#F3E8FF',
    orderTitle: 'Pedido',
    orderItems: [
      '3x Óleo Sintético 5W30',
      '2x Filtro de Combustível',
      '4x Pastilha de Freio Premium',
    ],
    addressLine1: 'Av. Brigadeiro Faria Lima, 3477',
    addressLine2: 'Itaim Bibi',
    phone: '(+55) 11 98765-4321',
    eta: '25 min',
    arrivalTime: '15:10',
    distance: '12.8 km',
  },
  {
    id: 'c3',
    name: 'Juliana Rocha',
    status: 'Confirmado',
    avatarEmoji: '👩‍💼',
    avatarBg: '#FEF3C7',
    orderTitle: 'Contrato',
    orderItems: [
      '1x Kit Peças de Reposição',
      '2x Módulo de Controle ECU',
    ],
    addressLine1: 'Alameda Santos, 1800',
    addressLine2: 'Cerqueira César',
    phone: '(+55) 11 97654-3210',
    eta: '32 min',
    arrivalTime: '15:35',
    distance: '15.2 km',
  },
];

export const HomeScreen = ({ onNavigate }) => {
  const [selectedTransport, setSelectedTransport] = useState('car');
  const [currentClientIndex, setCurrentClientIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(true);
  const [activeMenu, setActiveMenu] = useState('map');

  // Estado da sidebar: começa colapsada (apenas ícones)
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Estado do painel de direções: largura redimensionável
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const panelWidthRef = useRef(PANEL_DEFAULT_WIDTH);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(PANEL_DEFAULT_WIDTH);

  const currentClient = CLIENTS_LIST[currentClientIndex];

  const handleNextClient = () => {
    setCurrentClientIndex((prev) => (prev + 1) % CLIENTS_LIST.length);
  };

  const toggleSidebar = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSidebarExpanded((prev) => !prev);
  }, []);

  // PanResponder para arrastar a borda do painel (nativo)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartWidth.current = panelWidthRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const newWidth = dragStartWidth.current + gestureState.dx;
        const clamped = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, newWidth));
        panelWidthRef.current = clamped;
        setPanelWidth(clamped);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Handlers para arrastar no web (pointer events)
  const handleDragHandlePointerDown = useCallback((e) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidthRef.current;

    const onPointerMove = (ev) => {
      const delta = ev.clientX - dragStartX.current;
      const newWidth = dragStartWidth.current + delta;
      const clamped = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, newWidth));
      panelWidthRef.current = clamped;
      setPanelWidth(clamped);
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, []);

  const sidebarWidth = sidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
  const iconSize = sidebarExpanded ? SIDEBAR_ICON_EXPANDED : SIDEBAR_ICON_COLLAPSED;

  return (
    <View style={styles.container}>
      {/* 1. BARRA LATERAL ESQUERDA (COLAPSÁVEL) */}
      <View style={[styles.sidebar, { width: sidebarWidth, paddingHorizontal: sidebarExpanded ? 20 : 10 }]}>
        {/* Topo da Sidebar: Logo + Botão toggle */}
        <View style={styles.sidebarTop}>
          {sidebarExpanded ? (
            <View style={styles.logoRow}>
              <Ionicons name="speedometer" size={24} color={colors.textPrimary} />
              <Text style={styles.logoTitle}>Maps</Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaBadgeText}>BETA</Text>
              </View>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.collapseBtn, !sidebarExpanded && styles.collapseBtnCentered]}
            onPress={toggleSidebar}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sidebarExpanded ? 'albums-outline' : 'albums-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Menu Principal */}
        <View style={styles.menuGroup}>
          {[
            { key: 'home', label: 'Início', iconActive: 'grid', iconInactive: 'grid-outline' },
            { key: 'map', label: 'Mapa & Rota', iconActive: 'navigate', iconInactive: 'map-outline' },
            { key: 'music', label: 'Música', iconActive: 'musical-notes', iconInactive: 'musical-notes-outline' },
            { key: 'contacts', label: 'Clientes', iconActive: 'people', iconInactive: 'people-outline' },
            { key: 'routes', label: 'Rotas', iconActive: 'git-branch', iconInactive: 'git-branch-outline' },
            { key: 'settings', label: 'Ajustes', iconActive: 'settings', iconInactive: 'settings-outline' },
          ].map((item) => {
            const isActive = activeMenu === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  isActive && styles.menuItemActive,
                  !sidebarExpanded && styles.menuItemCollapsed,
                ]}
                onPress={() => setActiveMenu(item.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? item.iconActive : item.iconInactive}
                  size={iconSize}
                  color={isActive ? colors.actionBlue : colors.textSecondary}
                />
                {sidebarExpanded && (
                  <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                    {item.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Seção de Recentes */}
        <View style={styles.recentsSection}>
          {sidebarExpanded && (
            <View style={styles.recentsHeader}>
              <Text style={styles.recentsTitle}>Recents</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={styles.recentsList}>
            {CLIENTS_LIST.map((c, index) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.recentItem, !sidebarExpanded && styles.recentItemCollapsed]}
                onPress={() => setCurrentClientIndex(index)}
              >
                <View
                  style={[
                    styles.recentCircle,
                    !sidebarExpanded && styles.recentCircleCollapsed,
                    {
                      backgroundColor:
                        index === 0
                          ? colors.actionBlue
                          : index === 1
                          ? colors.accentPurple
                          : colors.accentOrange,
                    },
                  ]}
                >
                  <Text style={[styles.recentEmojiText, !sidebarExpanded && styles.recentEmojiCollapsed]}>
                    {c.avatarEmoji}
                  </Text>
                </View>
                {sidebarExpanded && (
                  <Text style={styles.recentItemText} numberOfLines={1}>
                    {c.name}
                  </Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.recentItem, !sidebarExpanded && styles.recentItemCollapsed]}>
              <View style={[
                styles.recentCircle,
                !sidebarExpanded && styles.recentCircleCollapsed,
                { backgroundColor: colors.accentGreen },
              ]}>
                <Ionicons name="airplane" size={!sidebarExpanded ? 16 : 13} color="#FFFFFF" />
              </View>
              {sidebarExpanded && (
                <Text style={styles.recentItemText} numberOfLines={1}>
                  Aeroporto CGH
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Rodapé da Sidebar */}
        <View style={styles.sidebarFooter}>
          <Text style={styles.footerHelpText} numberOfLines={1}>
            {sidebarExpanded ? 'GoClient Automotive OS' : 'GoClient'}
          </Text>
          {sidebarExpanded && (
            <TouchableOpacity>
              <Text style={styles.footerLinkText}>Gerenciar Negócios e Rotas ↗</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. PAINEL CENTRAL FLUTUANTE DE DIREÇÕES & PERFIL DO CLIENTE */}
      <View style={[styles.directionsPanel, { width: panelWidth }]}>
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

        {/* CARD DO PERFIL DO CLIENTE (EXATAMENTE IGUAL À IMAGEM 3) */}
        <ScrollView style={styles.clientScrollArea} showsVerticalScrollIndicator={false}>
          <View style={styles.clientProfileCard}>
            {/* Topo: Avatar + Nome + Ponto Verde Ativo */}
            <View style={styles.clientProfileHeader}>
              <View style={styles.clientAvatarContainer}>
                <Text style={styles.clientAvatarEmojiLarge}>{currentClient.avatarEmoji}</Text>
              </View>

              <View style={styles.clientNameAndStatusCol}>
                <Text style={styles.clientHeaderName}>{currentClient.name}</Text>
                <View style={styles.statusRowBadge}>
                  <View style={styles.greenStatusDot} />
                  <Text style={styles.statusLabelText}>{currentClient.status}</Text>
                </View>
              </View>
            </View>

            {/* Seção Pedido com Lista de Produtos */}
            <View style={styles.orderSection}>
              <Text style={styles.orderSectionTitle}>{currentClient.orderTitle}</Text>
              <View style={styles.orderItemsList}>
                {currentClient.orderItems.map((item, index) => (
                  <Text key={index} style={styles.orderItemRowText}>
                    {item}
                  </Text>
                ))}
              </View>
            </View>

            {/* Seção de Endereço */}
            <View style={styles.infoPillRow}>
              <View style={styles.infoIconSquare}>
                <Ionicons name="location" size={20} color="#111827" />
              </View>
              <View style={styles.infoTextsCol}>
                <Text style={styles.addressLine1Text}>{currentClient.addressLine1}</Text>
                <Text style={styles.addressLine2Text}>{currentClient.addressLine2}</Text>
              </View>
            </View>

            {/* Seção de Telefone */}
            <View style={styles.infoPillRow}>
              <View style={styles.infoIconSquare}>
                <Ionicons name="call" size={20} color="#111827" />
              </View>
              <Text style={styles.phoneText}>{currentClient.phone}</Text>
            </View>

            {/* Botão: "PRÓXIMO CLIENTE" */}
            <TouchableOpacity
              style={styles.nextClientButton}
              onPress={handleNextClient}
              activeOpacity={0.8}
            >
              <Text style={styles.nextClientButtonText}>PRÓXIMO CLIENTE</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Rodapé de Estimativa de Tempo (ETA) */}
        <View style={styles.etaFooter}>
          <View style={styles.etaTextCol}>
            <Text style={styles.etaTimeNumber}>{currentClient.eta}</Text>
            <Text style={styles.etaSubDetails}>
              {currentClient.arrivalTime} ETA • {currentClient.distance}
            </Text>
          </View>
          <TouchableOpacity style={styles.infoCircleBtn}>
            <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* DRAG HANDLE — borda direita arrastável para redimensionar o painel */}
        <View
          style={styles.dragHandle}
          {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
          onPointerDown={Platform.OS === 'web' ? handleDragHandlePointerDown : undefined}
        >
          <View style={styles.dragHandleBar} />
        </View>
      </View>

      {/* 3. ÁREA AMPLA DO MAPA (MAP CANVAS EM ALTA RESOLUÇÃO) */}
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

          {/* Área Verde / Bairro Residencial */}
          <View style={styles.greenParkArea}>
            <Text style={styles.parkLabel}>{currentClient.addressLine2}</Text>
          </View>

          {/* Traçado da Rota Principal em Azul Apple Maps */}
          <View style={styles.mainRouteLine} />

          {/* Rota Alternativa */}
          <View style={styles.altRouteLine} />

          {/* Pin de Origem (Partida) */}
          <View style={styles.originPinWrapper}>
            <View style={styles.originPinOuter}>
              <View style={styles.originPinInner} />
            </View>
            <Text style={styles.pinLabel}>Av. Paulista</Text>
          </View>

          {/* Pin de Destino (Local do Cliente) */}
          <View style={styles.destPinWrapper}>
            <View style={styles.destPinOuter}>
              <Text style={{ fontSize: 14 }}>{currentClient.avatarEmoji}</Text>
            </View>
            <Text style={styles.pinLabel}>{currentClient.name}</Text>
          </View>

          {/* Balão Flutuante de ETA Principal: Mais Rápido */}
          <View style={styles.fastestRouteBadge}>
            <Text style={styles.fastestBadgeTime}>{currentClient.eta}</Text>
            <Text style={styles.fastestBadgeSub}>Mais Rápido</Text>
          </View>

          {/* Balão Flutuante da Rota Alternativa */}
          <View style={styles.altRouteBadge}>
            <Text style={styles.altBadgeTime}>24 min</Text>
          </View>
        </View>

        {/* Widget Automotivo Flutuante no Topo do Mapa: Mídia & Clima */}
        <View style={styles.floatingMediaBar}>
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

  // ============================================================
  // 1. BARRA LATERAL ESQUERDA (COLAPSÁVEL)
  // ============================================================
  sidebar: {
    height: '100%',
    backgroundColor: colors.sidebarBackground,
    borderRightWidth: 1,
    borderRightColor: colors.border,
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
    flex: 1,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  collapseBtnCentered: {
    alignSelf: 'center',
  },
  menuGroup: {
    gap: 6,
    marginBottom: 20,
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
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 14,
  },
  menuItemText: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
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
    marginBottom: 10,
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
    paddingVertical: 7,
    gap: 10,
  },
  recentItemCollapsed: {
    justifyContent: 'center',
    paddingVertical: 8,
  },
  recentCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCircleCollapsed: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  recentEmojiText: {
    fontSize: 14,
  },
  recentEmojiCollapsed: {
    fontSize: 18,
  },
  recentItemText: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  sidebarFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerHelpText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
    textAlign: 'center',
  },
  footerLinkText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    color: colors.actionBlue,
    textAlign: 'center',
  },

  // ============================================================
  // 2. PAINEL CENTRAL DE DIREÇÕES & CARD DO CLIENTE
  // ============================================================
  directionsPanel: {
    height: '100%',
    backgroundColor: colors.cardSurface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    justifyContent: 'space-between',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 6,
      },
    }),
  },

  // DRAG HANDLE — barra vertical fina na borda direita do painel
  dragHandle: {
    position: 'absolute',
    top: 0,
    right: -4,
    bottom: 0,
    width: 8,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'col-resize' },
      default: {},
    }),
  },
  dragHandleBar: {
    width: 4,
    height: 48,
    borderRadius: 2,
    backgroundColor: colors.border,
    opacity: 0.7,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    marginBottom: 14,
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

  // Área de scroll do card do cliente (para acomodar painéis menores)
  clientScrollArea: {
    flex: 1,
    marginBottom: 8,
  },

  // CARD DO CLIENTE (EXATAMENTE IGUAL À IMAGEM 3)
  clientProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.06)',
      },
      default: {
        elevation: 4,
      },
    }),
    gap: 14,
  },
  clientProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clientAvatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clientAvatarEmojiLarge: {
    fontSize: 38,
  },
  clientNameAndStatusCol: {
    flex: 1,
  },
  clientHeaderName: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    color: '#111827',
    letterSpacing: -0.4,
  },
  statusRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  greenStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  statusLabelText: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    color: '#111827',
  },
  orderSection: {
    paddingVertical: 4,
  },
  orderSectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    color: '#111827',
    marginBottom: 8,
  },
  orderItemsList: {
    gap: 4,
  },
  orderItemRowText: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  infoPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTextsCol: {
    flex: 1,
  },
  addressLine1Text: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    color: '#111827',
  },
  addressLine2Text: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: '#4B5563',
    marginTop: 1,
  },
  phoneText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    color: '#111827',
  },
  nextClientButton: {
    backgroundColor: '#F3F4F6',
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nextClientButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: '#111827',
    letterSpacing: 0.5,
  },

  // ETA FOOTER
  etaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  etaTextCol: {
    flex: 1,
  },
  etaTimeNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: 30,
    color: colors.textPrimary,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  etaSubDetails: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoCircleBtn: {
    padding: 6,
  },

  // ============================================================
  // 3. MAPA
  // ============================================================
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
