// src/components/AutomotiveButton.js
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';

export const AutomotiveButton = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'glass' | 'ghost' | 'danger'
  size = 'large', // 'large' | 'medium' | 'small'
  icon,
  iconRight,
  disabled = false,
  style,
  textStyle,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryContainer;
      case 'secondary':
        return styles.secondaryContainer;
      case 'glass':
        return styles.glassContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'ghost':
        return styles.ghostContainer;
      default:
        return styles.primaryContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return styles.primaryText;
      case 'secondary':
      case 'glass':
        return styles.secondaryText;
      case 'ghost':
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.sizeSmall;
      case 'medium':
        return styles.sizeMedium;
      case 'large':
      default:
        return styles.sizeLarge;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        getContainerStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={size === 'small' ? 18 : 22}
          color={variant === 'primary' || variant === 'danger' ? colors.textOnPrimary : colors.textPrimary}
          style={styles.iconLeft}
        />
      )}
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      {iconRight && (
        <Ionicons
          name={iconRight}
          size={size === 'small' ? 18 : 22}
          color={variant === 'primary' || variant === 'danger' ? colors.textOnPrimary : colors.textPrimary}
          style={styles.iconRight}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius.pill,
    paddingHorizontal: layout.spacing.lg,
  },
  sizeLarge: {
    height: layout.touchable.buttonHeightLarge,
    paddingHorizontal: 28,
  },
  sizeMedium: {
    height: layout.touchable.buttonHeightMedium,
    paddingHorizontal: 20,
  },
  sizeSmall: {
    height: 40,
    paddingHorizontal: 16,
  },
  primaryContainer: {
    backgroundColor: colors.primary,
  },
  secondaryContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorderStrong,
  },
  glassContainer: {
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dangerContainer: {
    backgroundColor: '#FF453A',
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  primaryText: {
    ...typography.buttonLarge,
    color: colors.textOnPrimary,
  },
  secondaryText: {
    ...typography.buttonLarge,
    color: colors.textPrimary,
  },
  ghostText: {
    ...typography.buttonLarge,
    color: colors.accentBlue,
  },
  disabled: {
    opacity: 0.45,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
});
