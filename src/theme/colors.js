// src/theme/colors.js
// Tokens visuais extraídos do Design System Apple Maps UI/UX do GoClient

export const colors = {
  // Paleta Oficial do Design System (Documento de UI/UX)
  textPrimary: '#111111',       // Títulos, ícones e conteúdo prioritário
  textSecondary: '#73777C',     // Descrições, metadados e labels inativos
  textMuted: '#8E9297',         // Informações secundárias e placeholders
  
  actionBlue: '#0A84FF',        // Azul de ação Apple: Links, ações primárias e foco
  primary: '#0A84FF',           // Compatibilidade de componentes
  
  sidebarBackground: '#EBF4F8', // Fundo do painel lateral de navegação (Apple Maps tone)
  cardSurface: '#FFFFFF',       // Superfície de cartões e painéis flutuantes
  surface: '#FFFFFF',           // Painéis elevados
  surfaceSubtle: '#F5F6F7',     // Fundo neutro e áreas auxiliares de apoio
  surfaceElevated: '#FFFFFF',
  
  border: '#D9E0E3',            // Divisórias, separadores e contornos discretos
  borderSubtle: '#E8ECEF',      // Linhas ultra-finas
  
  accentYellow: '#FFB800',      // Marcador/atenção: Categorias e pontos de interesse (Macy's etc)
  accentGreen: '#34C759',       // Status positivo: Destaques de status e rotas rápidas
  accentOrange: '#FF9500',      // Avisos de tráfego
  accentPurple: '#AF52DE',      // Hotéis e categorias especiais
  accentRed: '#FF3B30',         // Alertas e botão de encerrar rota
  
  // Mapa
  mapBackground: '#F4F3F0',     // Cor da terra do mapa Apple Maps claro
  mapRiver: '#A5D6F7',          // Cor dos rios e canais Apple Maps
  mapRoadMajor: '#FFFFFF',      // Vias expressas
  mapRoadBorder: '#D2D0C8',     // Bordas das vias
  mapRoadMinor: '#FAF8F5',      // Ruas locais
  routePrimary: '#0A84FF',      // Traçado da rota principal ativa
  routeAlternative: '#8CC4FF',  // Traçado da rota alternativa
  
  // Sombras Apple
  shadowColor: '#000000',
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
};
