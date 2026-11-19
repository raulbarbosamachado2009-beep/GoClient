import { FONT } from './theme';

/**
 * Fontes SF Pro (Apple), recortadas para os caracteres do português.
 * Origem e restrições de licença: ver docs/design.md.
 */
export const fontAssets = {
  [FONT.displayLight]: require('../assets/fonts/SF-Pro-Display-Light.otf'),
  [FONT.displayRegular]: require('../assets/fonts/SF-Pro-Display-Regular.otf'),
  [FONT.displayMedium]: require('../assets/fonts/SF-Pro-Display-Medium.otf'),
  [FONT.displaySemibold]: require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
  [FONT.displayBold]: require('../assets/fonts/SF-Pro-Display-Bold.otf'),
  [FONT.textRegular]: require('../assets/fonts/SF-Pro-Text-Regular.otf'),
  [FONT.textMedium]: require('../assets/fonts/SF-Pro-Text-Medium.otf'),
  [FONT.textSemibold]: require('../assets/fonts/SF-Pro-Text-Semibold.otf'),
};
