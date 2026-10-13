// src/theme/typography.js
import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});

export const typography = {
  fontFamily,
  
  // Escala tipográfica automotiva (legível à distância do volante)
  hero: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: -0.8,
  },
  title1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  buttonLarge: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  buttonMedium: {
    fontSize: 15,
    fontWeight: '600',
  },
};
