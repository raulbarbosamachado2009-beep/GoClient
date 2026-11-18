import { automotive, colors as baseColors, motion, radius, spacing } from '@goclient/design-tokens';
import { Platform, type TextStyle } from 'react-native';

/**
 * Tema do GoClient Automotive. Parte dos tokens compartilhados e acrescenta o que é
 * específico da tela de 1600×900 usada no carro.
 */
export const colors = {
  ...baseColors,
  /** Cartões sobre o mapa e painéis laterais. */
  panel: '#141416',
  panelHigh: '#1F1F22',
  scrim: 'rgba(0,0,0,0.62)',
  map: {
    ground: '#17191D',
    block: '#1B1E23',
    street: '#272A30',
    avenue: '#33373E',
    highway: '#3D424A',
    park: '#1A2620',
    water: '#142133',
    label: '#6B7079',
    route: '#0A84FF',
    routeCasing: '#0B3B73',
  },
  /** Módulo de música — segue as referências aprovadas (acento verde). */
  music: {
    accent: '#1ED760',
    accentPressed: '#1AB954',
    onAccent: '#04130A',
    miniPlayer: '#174A2B',
    ambientTop: '#0F4A26',
  },
} as const;

export { motion, radius, spacing };

export const layout = {
  width: automotive.viewport.width,
  height: automotive.viewport.height,
  sidebarWidth: 124,
  gutter: 24,
  touch: automotive.minTouchTarget,
  touchGap: automotive.minTargetGap,
  miniPlayerHeight: 104,
} as const;

const font = Platform.select({
  web: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif',
  },
  default: {},
});

/** Escala tipográfica do Automotive: legível a ~70 cm de distância. */
export const type = {
  display: { fontSize: 56, lineHeight: 64, fontWeight: '700', letterSpacing: -0.6, ...font },
  title: { fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -0.4, ...font },
  headline: { fontSize: 28, lineHeight: 34, fontWeight: '600', ...font },
  body: { fontSize: 24, lineHeight: 32, fontWeight: '400', ...font },
  bodyStrong: { fontSize: 24, lineHeight: 32, fontWeight: '600', ...font },
  callout: { fontSize: 22, lineHeight: 28, fontWeight: '400', ...font },
  caption: { fontSize: 20, lineHeight: 26, fontWeight: '400', ...font },
  label: { fontSize: 18, lineHeight: 22, fontWeight: '600', letterSpacing: 0.2, ...font },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Cores de apoio para avatares e capas geradas (tons sóbrios, sem neon). */
export const swatches = [
  '#3A5BA0',
  '#2F7D6D',
  '#8A5A3C',
  '#6C4FA3',
  '#A2475E',
  '#4D6B2F',
  '#2E6E8E',
  '#8C6B1F',
] as const;

export function swatchFor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return swatches[h % swatches.length] as string;
}

/** Usar driver nativo nas animações fora da Web. */
export const nativeDriver = Platform.OS !== 'web';
