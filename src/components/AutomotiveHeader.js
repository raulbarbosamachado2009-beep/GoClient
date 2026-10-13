// src/components/AutomotiveHeader.js
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { initialVehicleStatus } from '../mock/mockData';

export const AutomotiveHeader = ({
  title,
  subtitle,
  rightAction,
  onHelpPress,
}) => {
  return (
    <View style={styles.header}>
      {/* Título da tela */}
      <View style={styles.titleWrapper}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Widgets Rápidos do Veículo e Ações */}
      <View style={styles.actionsWrapper}>
        {rightAction}

        {/* Status rápido do veículo */}
        <View style={styles.vehicleBadge}>
          <Ionicons name="thermometer-outline" size={16} color={colors.accentCyan} />
          <Text style={styles.vehicleBadgeText}>{initialVehicleStatus.cabinTemp}</Text>
        </View>

        <View style={styles.vehicleBadge}>
          <Ionicons name="battery-charging-outline" size={16} color={colors.accentGreen} />
          <Text style={styles.vehicleBadgeText}>{initialVehicleStatus.rangeKm} km</Text>
        </View>

        {onHelpPress && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onHelpPress}
            style={styles.helpButton}
          >
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.helpText}>Apresentação</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.background,
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  title: {
    ...typography.title2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.spacing.md,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 6,
  },
  vehicleBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    gap: 6,
  },
  helpText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
