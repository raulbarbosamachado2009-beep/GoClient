import { useId } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Ícones dos apps da barra lateral, desenhados para o GoClient no acabamento dos ícones
 * do iOS: base grafite com brilho sutil, desenho branco de traço arredondado e um único
 * detalhe no azul do sistema. Não são cópias dos ícones da Apple (que são arte protegida;
 * os SF Symbols só podem ser usados em aparelhos Apple).
 */
export type AppGlyph = 'mapa' | 'clientes' | 'produtos' | 'rotas';

const BLUE = '#0A84FF';
const W = '#FFFFFF';

export function GoAppIcon({ glyph, size = 72 }: { glyph: AppGlyph; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`bg${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#56565B" />
          <Stop offset="1" stopColor="#2A2A2D" />
        </LinearGradient>
        <LinearGradient id={`hl${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.18} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {/* Base em "squircle" (raio de 22,5%), como os ícones do iOS. */}
      <Rect width={100} height={100} rx={23.5} fill={`url(#bg${id})`} />
      <Rect width={100} height={100} rx={23.5} fill={`url(#hl${id})`} />
      <Rect
        x={0.5}
        y={0.5}
        width={99}
        height={99}
        rx={23}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.1}
      />
      {GLYPHS[glyph]}
    </Svg>
  );
}

const stroke = {
  stroke: W,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

const GLYPHS: Record<AppGlyph, React.ReactNode> = {
  // Mapa: mapa dobrado em três partes, com a posição atual em azul.
  mapa: (
    <G>
      <Path
        d="M18 30 L38 22 L62 30 L82 22 V72 L62 80 L38 72 L18 80 Z"
        {...stroke}
        strokeWidth={6}
      />
      <Path d="M38 22 V72 M62 30 V80" {...stroke} strokeWidth={4} strokeOpacity={0.55} />
      <Circle cx={50} cy={48} r={11} fill={W} />
      <Circle cx={50} cy={48} r={7} fill={BLUE} />
    </G>
  ),
  // Clientes: fachada de loja com toldo listrado.
  clientes: (
    <G>
      <Path d="M24 46 V78 H76 V46" {...stroke} strokeWidth={6} />
      <Path d="M44 78 V60 H56 V78" {...stroke} strokeWidth={5} />
      <Path
        d="M20 30 L26 20 H74 L80 30 V36 C80 41.5 75.5 44 72.5 44 C69 44 65 41.5 65 36 C65 41.5 61 44 57.5 44 C54 44 50 41.5 50 36 C50 41.5 46 44 42.5 44 C39 44 35 41.5 35 36 C35 41.5 31 44 27.5 44 C24.5 44 20 41.5 20 36 Z"
        fill={W}
      />
      <Path d="M35 23 V36 M65 23 V36" stroke={BLUE} strokeWidth={4} strokeLinecap="round" />
    </G>
  ),
  // Produtos: cabide com uma etiqueta de preço pendurada.
  produtos: (
    <G>
      <Path
        d="M50 38 V33 C50 29 55 27.5 55 23 C55 19.5 52.5 17 49.5 17 C46.5 17 44 19.5 44 22.5"
        {...stroke}
        strokeWidth={5}
      />
      <Path
        d="M50 38 L16 61 C13 63 14.5 67 18 67 H82 C85.5 67 87 63 84 61 Z"
        {...stroke}
        strokeWidth={6}
      />
      <Path d="M70 67 V72" {...stroke} strokeWidth={3} />
      <Path d="M62 72 H78 V86 C78 88 76.5 89 75 89 H65 C63.5 89 62 88 62 86 Z" fill={BLUE} />
      <Circle cx={70} cy={77} r={2.4} fill={W} />
    </G>
  ),
  // Rotas: paradas ligadas por um caminho pontilhado até o destino em azul.
  rotas: (
    <G>
      <Path
        d="M26 74 C26 56 74 62 74 44 C74 32 50 34 50 24"
        {...stroke}
        strokeWidth={5}
        strokeDasharray="1 10"
      />
      <Circle cx={26} cy={76} r={9} fill="none" stroke={W} strokeWidth={5} />
      <Circle cx={74} cy={46} r={6} fill={W} />
      <Path
        d="M50 34 C50 34 38 23 38 15.5 C38 9 43.5 5 50 5 C56.5 5 62 9 62 15.5 C62 23 50 34 50 34 Z"
        fill={BLUE}
        transform="translate(0 4)"
      />
      <Circle cx={50} cy={19.5} r={4.2} fill={W} />
    </G>
  ),
};
