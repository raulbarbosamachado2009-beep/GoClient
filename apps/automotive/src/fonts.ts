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
  // Música (Figtree, licença OFL).
  [FONT.spRegular]: require('@expo-google-fonts/figtree/400Regular/Figtree_400Regular.ttf'),
  [FONT.spMedium]: require('@expo-google-fonts/figtree/500Medium/Figtree_500Medium.ttf'),
  [FONT.spBold]: require('@expo-google-fonts/figtree/700Bold/Figtree_700Bold.ttf'),
  [FONT.spBlack]: require('@expo-google-fonts/figtree/800ExtraBold/Figtree_800ExtraBold.ttf'),
};
