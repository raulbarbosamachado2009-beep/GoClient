// src/components/AutomotiveSidebar.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';

const NAV_ITEMS = [
  { id: 'home', label: 'Início', icon: 'grid-outline', activeIcon: 'grid' },
  { id: 'map', label: 'Mapa', icon: 'map-outline', activeIcon: 'map' },
  { id: 'music', label: 'Música', icon: 'musical-notes-outline', activeIcon: 'musical-notes' },
  { id: 'contacts', label: 'Clientes', icon: 'people-outline', activeIcon: 'people' },
  { id: 'routes', label: 'Rotas', icon: 'navigate-outline', activeIcon: 'navigate' },
  { id: 'settings', label: 'Ajustes', icon: 'settings-outline', activeIcon: 'settings' },
];

export const AutomotiveSidebar = ({ currentScreen, onSelectScreen }) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Logotipo e Emblema Automotivo */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectScreen('home')}
        style={styles.brandContainer}
      >
        <View style={styles.brandIconWrapper}>
          <Ionicons name="speedometer" size={26} color={colors.primary} />
        </View>
        <Text style={styles.brandText}>GO</Text>
      </TouchableOpacity>

      {/* Navegação Principal */}
      <View style={styles.navContainer}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onSelectScreen(item.id)}
              style={[styles.navItem, isActive && styles.navItemActive]}
            >
              <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={26}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rodapé da Sidebar: Hora e Conectividade */}
      <View style={styles.footerContainer}>
        <Text style={styles.clockText}>{currentTime || '14:25'}</Text>
        <View style={styles.statusRow}>
          <Ionicons name="bluetooth" size={14} color={colors.accentBlue} style={styles.statusIcon} />
          <Ionicons name="wifi" size={14} color={colors.accentGreen} style={styles.statusIcon} />
          <Ionicons name="battery-charging" size={14} color={colors.textSecondary} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: layout.sidebarWidth,
    height: '100%',
    backgroundColor: colors.backgroundElevated,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: layout.spacing.lg,
    zIndex: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: layout.spacing.sm,
  },
  brandIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  brandText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginTop: 4,
  },
  navContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  navItem: {
    width: 82,
    height: 68,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navItemActive: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    transform: [{ scale: 1.05 }],
  },
  navLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  footerContainer: {
    alignItems: 'center',
    paddingTop: layout.spacing.sm,
  },
  clockText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  statusIcon: {
    opacity: 0.9,
  },
});
