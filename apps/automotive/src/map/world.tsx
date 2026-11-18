import { memo } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, G, Path, Polyline, Text as SvgText } from 'react-native-svg';
import type { Palette } from '../theme';
import { FONT } from '../theme';

/**
 * Mapa de EXEMPLO para o design: imagem estática fornecida como referência (versão clara)
 * e uma versão escura derivada dela. Rotas, paradas e o veículo são desenhados por cima
 * em SVG. O mapa real (tiles, GPS, rotas calculadas) substitui este componente em fase
 * própria, mantendo a mesma navegação.
 */

/** Fator de ampliação aplicado à imagem original (1170×722 após o recorte). */
const S = 2.4;
export const WORLD = { width: 2808, height: 1732 } as const;

const MAP_LIGHT = require('../../assets/map/map-light.jpg');
const MAP_DARK = require('../../assets/map/map-dark.jpg');

/** Converte coordenadas da imagem original para o mundo ampliado. */
const p = (x: number, y: number) => [Math.round(x * S), Math.round(y * S)] as const;

/** Veículo: próximo à estação, no sul da imagem. */
export const USER = { x: Math.round(627 * S), y: Math.round(585 * S) } as const;

// Percursos seguindo as vias expressas visíveis na imagem.
export const CLIENT_ROUTE = [
  p(627, 585),
  p(625, 500),
  p(630, 440),
  p(645, 390),
  p(660, 340),
  p(675, 300),
  p(686, 255),
  p(695, 200),
  p(700, 152),
];
export const DAY_ROUTE = [
  p(627, 585),
  p(625, 500),
  p(630, 440),
  p(645, 390),
  p(665, 335),
  p(683, 345),
  p(686, 385),
  p(700, 402),
  p(760, 420),
  p(805, 424),
  p(855, 418),
  p(880, 445),
  p(900, 472),
];
export const DAY_STOPS = [p(630, 440), p(665, 335), p(700, 402), p(805, 424), p(900, 472)];
/** Pontos para enquadrar a câmera em cada modo. */
export const DAY_FOCUS = { x: Math.round(765 * S), y: Math.round(430 * S) };
export const CLIENT_FOCUS = { x: Math.round(665 * S), y: Math.round(370 * S) };
const CLIENT_PINS = [p(560, 300), p(760, 250), p(540, 480), p(880, 560), p(430, 200), p(990, 330)];

export type MapMode = 'explore' | 'client' | 'day';

function pts(list: readonly (readonly [number, number])[]) {
  return list.map((q) => q.join(',')).join(' ');
}

export const MapWorld = memo(function MapWorld({ c, mode }: { c: Palette; mode: MapMode }) {
  const m = c.map;
  const route = mode === 'day' ? DAY_ROUTE : mode === 'client' ? CLIENT_ROUTE : null;
  const dest = CLIENT_ROUTE[CLIENT_ROUTE.length - 1] as readonly [number, number];
  return (
    <View style={{ width: WORLD.width, height: WORLD.height }}>
      <Image
        source={c.mode === 'dark' ? MAP_DARK : MAP_LIGHT}
        style={{ position: 'absolute', width: WORLD.width, height: WORLD.height }}
        resizeMode="cover"
      />
      <Svg width={WORLD.width} height={WORLD.height} style={{ position: 'absolute' }}>
        {route && (
          <>
            <Polyline
              points={pts(route)}
              stroke={m.routeCasing}
              strokeWidth="26"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <Polyline
              points={pts(route)}
              stroke={m.route}
              strokeWidth="16"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {mode === 'day' &&
          DAY_STOPS.map(([x, y], i) => (
            <G key={`s${x}-${y}`}>
              <Circle cx={x} cy={y} r="26" fill="#FFFFFF" />
              <Circle cx={x} cy={y} r="21" fill={m.route} />
              <SvgText
                x={x}
                y={y + 8}
                fill="#FFFFFF"
                fontSize="22"
                fontFamily={FONT.textSemibold}
                textAnchor="middle"
              >
                {String(i + 1)}
              </SvgText>
            </G>
          ))}
        {mode !== 'day' && <Pin x={dest[0]} y={dest[1]} color={c.danger} />}
        {mode === 'explore' &&
          CLIENT_PINS.map(([x, y]) => (
            <Circle
              key={`p${x}-${y}`}
              cx={x}
              cy={y}
              r="14"
              fill={c.accent}
              stroke="#FFFFFF"
              strokeWidth="5"
            />
          ))}

        <Circle cx={USER.x} cy={USER.y} r="56" fill={`${m.route}33`} />
        <Circle cx={USER.x} cy={USER.y} r="24" fill="#FFFFFF" />
        <Path
          d={`M${USER.x} ${USER.y - 14} L${USER.x + 12} ${USER.y + 12} L${USER.x} ${USER.y + 6} L${USER.x - 12} ${USER.y + 12} Z`}
          fill={m.route}
        />
      </Svg>
    </View>
  );
});

function Pin({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <G>
      <Path
        d={`M${x} ${y} C${x - 6} ${y - 18} ${x - 28} ${y - 28} ${x - 28} ${y - 50} A28 28 0 1 1 ${x + 28} ${y - 50} C${x + 28} ${y - 28} ${x + 6} ${y - 18} ${x} ${y} Z`}
        fill={color}
        stroke="#FFFFFF"
        strokeWidth="4"
      />
      <Circle cx={x} cy={y - 50} r="10" fill="#FFFFFF" />
    </G>
  );
}
