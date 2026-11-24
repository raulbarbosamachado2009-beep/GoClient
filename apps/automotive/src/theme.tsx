import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { Platform, type TextStyle, useColorScheme } from 'react-native';
import { LIVE_BLUR } from './ui/blur-target';

/**
 * Tema do GoClient Automotive — linguagem visual do Apple CarPlay.
 * Duas paletas (escuro e claro) com os valores de sistema da Apple, tipografia SF Pro e
 * medidas para a tela de 1600×900.
 */

export type Mode = 'dark' | 'light';
export type ThemePreference = Mode | 'auto';

export interface Palette {
  mode: Mode;
  background: string;
  /** Células e painéis agrupados (estilo "inset grouped" do iOS). */
  grouped: string;
  elevated: string;
  fill: string;
  fillStrong: string;
  separator: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  onAccent: string;
  success: string;
  danger: string;
  warning: string;
  scrim: string;
  /** Material translúcido (desfoque) sobre o mapa. */
  material: { tint: 'dark' | 'light'; fallback: string; border: string };
  sidebar: string;
  map: {
    ground: string;
    block: string;
    street: string;
    streetCasing: string;
    avenue: string;
    highway: string;
    park: string;
    water: string;
    label: string;
    route: string;
    routeCasing: string;
  };
  music: {
    background: string;
    card: string;
    cardBorder: string;
    ambient: string;
    accent: string;
    onAccent: string;
    miniPlayer: string;
    tabBar: string;
    search: string;
    onSearch: string;
  };
}

const dark: Palette = {
  mode: 'dark',
  background: '#000000',
  grouped: '#1C1C1E',
  elevated: '#2C2C2E',
  fill: 'rgba(118,118,128,0.24)',
  fillStrong: 'rgba(118,118,128,0.36)',
  separator: 'rgba(84,84,88,0.6)',
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.62)',
  textTertiary: 'rgba(235,235,245,0.32)',
  accent: '#0A84FF',
  onAccent: '#FFFFFF',
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FFD60A',
  scrim: 'rgba(0,0,0,0.55)',
  material: {
    tint: 'dark',
    fallback: LIVE_BLUR ? 'rgba(28,28,30,0.74)' : 'rgba(28,28,30,0.94)',
    border: 'rgba(255,255,255,0.1)',
  },
  sidebar: '#0C0C0D',
  map: {
    ground: '#1B1D21',
    block: '#202328',
    street: '#34373E',
    streetCasing: '#1B1D21',
    avenue: '#41454D',
    highway: '#6A5A33',
    park: '#1D3226',
    water: '#18304A',
    label: '#8D929B',
    route: '#0A84FF',
    routeCasing: '#0A4A8F',
  },
  music: {
    background: '#121212',
    card: '#262626',
    cardBorder: '#323232',
    ambient: '#0E4D29',
    accent: '#1ED760',
    onAccent: '#000000',
    miniPlayer: '#1A4D2E',
    tabBar: '#0B0B0B',
    search: '#E9E9E9',
    onSearch: '#121212',
  },
};

const light: Palette = {
  mode: 'light',
  background: '#F2F2F7',
  grouped: '#FFFFFF',
  elevated: '#FFFFFF',
  fill: 'rgba(118,118,128,0.12)',
  fillStrong: 'rgba(118,118,128,0.2)',
  separator: 'rgba(60,60,67,0.22)',
  text: '#000000',
  textSecondary: 'rgba(60,60,67,0.64)',
  textTertiary: 'rgba(60,60,67,0.32)',
  accent: '#007AFF',
  onAccent: '#FFFFFF',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FFCC00',
  scrim: 'rgba(0,0,0,0.28)',
  material: {
    tint: 'light',
    fallback: LIVE_BLUR ? 'rgba(244,244,247,0.84)' : 'rgba(244,244,247,0.96)',
    border: 'rgba(255,255,255,0.6)',
  },
  sidebar: '#E6E6EB',
  map: {
    ground: '#F1EEE8',
    block: '#ECE8E0',
    street: '#FFFFFF',
    streetCasing: '#DDD8CF',
    avenue: '#FFFFFF',
    highway: '#F8D488',
    park: '#CBE7C0',
    water: '#A3D2F3',
    label: '#7A766E',
    route: '#007AFF',
    routeCasing: '#0A5BC4',
  },
  music: {
    background: '#FFFFFF',
    card: '#F0F0F0',
    cardBorder: '#E4E4E4',
    ambient: '#BFEACF',
    accent: '#1ED760',
    onAccent: '#000000',
    miniPlayer: '#1A4D2E',
    tabBar: '#FAFAFA',
    search: '#EDEDED',
    onSearch: '#121212',
  },
};

export const palettes = { dark, light } as const;

/* ---------------- Tipografia SF Pro ---------------- */

/** Famílias registradas no carregamento (ver `fonts.ts`). */
export const FONT = {
  displayLight: 'SFProDisplay-Light',
  displayRegular: 'SFProDisplay-Regular',
  displayMedium: 'SFProDisplay-Medium',
  displaySemibold: 'SFProDisplay-Semibold',
  displayBold: 'SFProDisplay-Bold',
  textRegular: 'SFProText-Regular',
  textMedium: 'SFProText-Medium',
  textSemibold: 'SFProText-Semibold',
  // Música: Figtree (livre, OFL), a mais parecida com a fonte do Spotify, que não é liberada.
  spRegular: 'Figtree-Regular',
  spMedium: 'Figtree-Medium',
  spBold: 'Figtree-Bold',
  spBlack: 'Figtree-ExtraBold',
} as const;

/** Troca SF Pro pela fonte da Música, mantendo o peso. */
export const SPOTIFY_FONT: Record<string, string> = {
  [FONT.displayLight]: FONT.spRegular,
  [FONT.displayRegular]: FONT.spRegular,
  [FONT.displayMedium]: FONT.spMedium,
  [FONT.displaySemibold]: FONT.spBold,
  [FONT.displayBold]: FONT.spBlack,
  [FONT.textRegular]: FONT.spRegular,
  [FONT.textMedium]: FONT.spMedium,
  [FONT.textSemibold]: FONT.spBold,
};

/**
 * Como no iOS: SF Pro Display a partir de 20 pt, SF Pro Text abaixo disso. O peso vem da
 * família (fontWeight fica neutro para não sintetizar negrito no Android).
 */
export const type = {
  largeTitle: { fontFamily: FONT.displayBold, fontSize: 54, lineHeight: 62, letterSpacing: -0.4 },
  title: { fontFamily: FONT.displayBold, fontSize: 40, lineHeight: 48, letterSpacing: -0.2 },
  title2: { fontFamily: FONT.displayBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.1 },
  headline: { fontFamily: FONT.displaySemibold, fontSize: 26, lineHeight: 32 },
  body: { fontFamily: FONT.displayRegular, fontSize: 24, lineHeight: 30 },
  bodyStrong: { fontFamily: FONT.displaySemibold, fontSize: 24, lineHeight: 30 },
  callout: { fontFamily: FONT.displayRegular, fontSize: 21, lineHeight: 27 },
  subhead: { fontFamily: FONT.displayMedium, fontSize: 20, lineHeight: 25 },
  caption: { fontFamily: FONT.textRegular, fontSize: 18, lineHeight: 23 },
  footnote: { fontFamily: FONT.textSemibold, fontSize: 16, lineHeight: 20 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/* ---------------- Medidas ---------------- */

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const layout = {
  width: 1600,
  height: 900,
  sidebarWidth: 204,
  gutter: 24,
  /** Alvo mínimo de toque no carro. */
  touch: 76,
  miniPlayerHeight: 96,
  radius: { sm: 12, md: 18, lg: 24, xl: 32 },
} as const;

/**
 * Bordas concêntricas: o raio de dentro é o raio de fora menos o espaço entre as bordas
 * (ex.: cartão com raio 48 e 18 de espaçamento → peças de dentro com raio 30). Assim as
 * curvas de dentro e de fora ficam paralelas, como nos aparelhos da Apple. Nunca fica
 * abaixo de `min`, para a peça de dentro não virar um canto vivo.
 */
export function concentric(outer: number, padding: number, min = 8): number {
  return Math.max(outer - padding, min);
}

export const nativeDriver = Platform.OS !== 'web';

/* ---------------- Contexto ---------------- */

interface ThemeState {
  c: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeState>({
  c: dark,
  preference: 'dark',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('dark');
  const mode: Mode = preference === 'auto' ? (system === 'light' ? 'light' : 'dark') : preference;
  const value = useMemo(
    () => ({ c: palettes[mode], preference, setPreference }),
    [mode, preference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}

/** Atalho para a paleta atual. */
export function useColors(): Palette {
  return useContext(ThemeContext).c;
}
