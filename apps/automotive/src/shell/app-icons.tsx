import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Ícones de contorno da barra lateral (referência enviada: blocos cinza com traço fino).
 * Mapa, loja e engrenagem vêm do Ionicons (licença MIT); cabide e rota são desenhados aqui,
 * no mesmo peso de traço. Nenhum é cópia de ícone da Apple.
 */
export type AppGlyph = 'mapa' | 'clientes' | 'produtos' | 'rotas' | 'ajustes';

export function OutlineGlyph({
  glyph,
  size = 48,
  color,
}: {
  glyph: AppGlyph;
  size?: number;
  color: string;
}) {
  switch (glyph) {
    case 'mapa':
      return <Ionicons name="map-outline" size={size} color={color} />;
    case 'clientes':
      return <Ionicons name="storefront-outline" size={size} color={color} />;
    case 'ajustes':
      return <Ionicons name="settings-outline" size={size} color={color} />;
    case 'produtos':
      return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
          {/* Cabide: gancho em S e base triangular. */}
          <Path
            d="M24 16.5 V14.5 C24 12.6 26.6 11.9 26.6 9.6 C26.6 7.9 25.4 6.6 23.8 6.6 C22.2 6.6 21 7.8 21 9.3"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d="M24 16.5 L6.8 29.2 C5.4 30.2 6.1 32.4 7.8 32.4 H40.2 C41.9 32.4 42.6 30.2 41.2 29.2 Z"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );
    case 'rotas':
      return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
          {/* Rota: partida embaixo à esquerda, caminho em S e marcador de destino. */}
          <Circle cx={10} cy={36} r={4.6} stroke={color} strokeWidth={2.6} fill="none" />
          <Path
            d="M14.6 36 H25 C29.5 36 29.5 27 25 27 H20 C15.5 27 15.5 18 20 18 H27"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d="M36 25 C36 25 29.5 18.6 29.5 13.8 C29.5 10.2 32.4 7.4 36 7.4 C39.6 7.4 42.5 10.2 42.5 13.8 C42.5 18.6 36 25 36 25 Z"
            stroke={color}
            strokeWidth={2.6}
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx={36} cy={13.8} r={2.2} fill={color} />
        </Svg>
      );
  }
}
