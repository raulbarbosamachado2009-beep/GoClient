/**
 * Tokens de design do GoClient.
 *
 * Uma única fonte de valores visuais para todas as plataformas. Os valores são números
 * (px/dp) e cores hex, consumíveis diretamente pelo React Native e convertidos em
 * variáveis CSS para a Web (`toCssVariables`).
 *
 * Direção: escuro por padrão, superfícies em camadas sutis, um único acento, sem
 * gradientes ou neon. Profundidade vem de contraste de superfície e bordas finas.
 */

export const colors = {
  /** Fundo da aplicação. */
  background: '#000000',
  /** Superfícies em camadas (cartões, painéis, folhas). */
  surface: '#111113',
  surfaceRaised: '#1C1C1F',
  surfaceOverlay: '#2A2A2E',
  border: '#2C2C30',
  borderStrong: '#3A3A3F',
  text: '#F5F5F7',
  textSecondary: '#A1A1A6',
  textTertiary: '#6E6E73',
  /** Acento único, usado com parcimônia em ações primárias e estados ativos. */
  accent: '#0A84FF',
  accentPressed: '#0071E3',
  onAccent: '#FFFFFF',
  success: '#30D158',
  warning: '#FFD60A',
  danger: '#FF453A',
} as const;

/** Escala de espaçamento em múltiplos de 4. */
export const spacing = {
  0: 0,
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

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontFamily = {
  /** Fonte do sistema: SF no Apple, Roboto no Android, system-ui na Web. */
  sans: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: (typeof fontWeight)[keyof typeof fontWeight];
  letterSpacing?: number;
}

/** Escala tipográfica base (Mobile/Web). */
export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '600', letterSpacing: 0.37 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const satisfies Record<string, TypeStyle>;

/** Durações e curvas de animação — sutis, nunca decorativas. */
export const motion = {
  duration: { instant: 0, fast: 120, normal: 200, slow: 320 },
  easing: {
    standard: [0.2, 0, 0, 1] as const,
    decelerate: [0, 0, 0, 1] as const,
    accelerate: [0.3, 0, 1, 1] as const,
  },
} as const;

/**
 * Ajustes para o Automotive (referência 1600×900, uso com o veículo em movimento):
 * alvos de toque maiores, texto maior e espaçamento mais generoso para evitar
 * toques acidentais.
 */
export const automotive = {
  viewport: { width: 1600, height: 900 },
  /** Alvo mínimo de toque, em dp. */
  minTouchTarget: 76,
  /** Espaço mínimo entre alvos de toque adjacentes, em dp. */
  minTargetGap: 16,
  typography: {
    title: { fontSize: 36, lineHeight: 44, fontWeight: '600' },
    headline: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
    body: { fontSize: 24, lineHeight: 32, fontWeight: '400' },
    caption: { fontSize: 20, lineHeight: 26, fontWeight: '400' },
  } as const satisfies Record<string, TypeStyle>,
} as const;

export const mobile = {
  minTouchTarget: 44,
} as const;

export const tokens = {
  colors,
  spacing,
  radius,
  fontFamily,
  fontWeight,
  typography,
  motion,
} as const;

/** Converte os tokens em variáveis CSS (`--gc-color-accent: #0A84FF;`). */
export function toCssVariables(): string {
  const lines: string[] = [];
  for (const [name, value] of Object.entries(colors)) {
    lines.push(`--gc-color-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(spacing)) {
    lines.push(`--gc-space-${name}: ${value}px;`);
  }
  for (const [name, value] of Object.entries(radius)) {
    lines.push(`--gc-radius-${name}: ${value}px;`);
  }
  for (const [name, value] of Object.entries(motion.duration)) {
    lines.push(`--gc-duration-${name}: ${value}ms;`);
  }
  lines.push(`--gc-font-sans: ${fontFamily.web};`);
  return lines.join('\n');
}

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
