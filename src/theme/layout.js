// src/theme/layout.js
// Regras de layout e dimensionamento do Design System Apple Maps UI/UX

export const layout = {
  // Estrutura em widescreen 1600x900
  sidebarWidth: 240,       // Largura da barra de navegação lateral (240-260px)
  panelWidth: 460,         // Largura do painel de detalhes/rotas (440-500px)
  headerHeight: 72,

  // Escala de espaçamento recomendada: 4 / 8 / 12 / 16 / 24 / 32 / 48 px
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Raios recomendados: 8px controles pequenos, 12-16px cartões, 20-24px painéis maiores
  radius: {
    small: 8,
    card: 16,
    panel: 22,
    pill: 999,
  },

  // Alvos táteis e tamanhos de ícones
  iconSize: {
    small: 18,
    default: 22,
    large: 26,
    pin: 36,
  },
  touchableHeight: 44,
};
