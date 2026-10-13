// src/theme/typography.js
// Tipografia e escala oficial do Design System Apple Maps usando as fontes SF Pro Display

export const fontFamilies = {
  bold: 'SFProDisplay-Bold',
  semibold: 'SFProDisplay-Semibold',
  medium: 'SFProDisplay-Medium',
  regular: 'SFProDisplay-Regular',
};

export const typography = {
  fontFamilies,

  // Escala recomendada pelo Design System Apple Maps UI/UX
  placeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  navText: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  navTextSemibold: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  metadata: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  metadataSemibold: {
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  etaNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 19,
  },
};
