// src/components/AutomotiveCard.js
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';

export const AutomotiveCard = ({
  children,
  onPress,
  style,
  elevated = false,
  highlight = false,
}) => {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[
        styles.card,
        elevated && styles.cardElevated,
        highlight && styles.cardHighlight,
        style,
      ]}
    >
      {children}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: layout.spacing.lg,
    overflow: 'hidden',
  },
  cardElevated: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.surfaceBorderStrong,
  },
  cardHighlight: {
    borderColor: colors.accentBlue,
    borderWidth: 1.5,
  },
});
