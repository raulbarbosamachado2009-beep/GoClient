import { memo } from 'react';
import Svg, { Circle, G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { Palette } from '../theme';
import { FONT } from '../theme';

/**
 * Cidade ILUSTRATIVA desenhada em SVG — serve só para o design e para testar a navegação
 * (arrastar e zoom). O mapa real será integrado em fase própria.
 */

export const WORLD = { width: 3600, height: 2400 } as const;
/** Posição do veículo no mundo (o mapa abre centralizado aqui). */
export const USER = { x: 1640, y: 1460 } as const;

// Grade de ruas: alinhada com os percursos de exemplo.
const VERTICALS = range(140, WORLD.width, [1360, 1520, 1680, 1840, 2000, 2160, 2320]);
const HORIZONTALS = range(120, WORLD.height, [890, 1030, 1170, 1310, 1460, 1600]);

function range(step: number, max: number, anchors: number[]): number[] {
  const out = new Set<number>(anchors);
  const first = anchors[0] as number;
  const last = anchors[anchors.length - 1] as number;
  for (let v = first - step; v > 0; v -= step + ((v / 7) % 30)) out.add(Math.round(v));
  for (let v = last + step; v < max; v += step + ((v / 9) % 30)) out.add(Math.round(v));
  return [...out].sort((a, b) => a - b);
}

export const DAY_ROUTE = [
  [1640, 1460],
  [1640, 1310],
  [1840, 1310],
  [1840, 1170],
  [2000, 1170],
  [2160, 1170],
  [2160, 1030],
  [2320, 1030],
  [2320, 890],
] as const;
export const DAY_STOPS = [
  [1840, 1310],
  [2000, 1170],
  [2160, 1030],
  [2320, 1030],
  [2320, 890],
] as const;
export const CLIENT_ROUTE = [
  [1640, 1460],
  [1640, 1310],
  [2000, 1310],
  [2000, 1170],
  [2160, 1170],
  [2160, 1030],
] as const;
const CLIENT_PINS = [
  [2160, 1030],
  [1840, 1310],
  [2320, 890],
  [1360, 1030],
  [2320, 1460],
  [1200, 1600],
  [2600, 1170],
] as const;

const LABELS: { x: number; y: number; text: string; rotate?: number; big?: boolean }[] = [
  { x: 1700, y: 1160, text: 'Av. das Palmeiras' },
  { x: 1380, y: 1022, text: 'R. Barão de Jaguara' },
  { x: 1860, y: 1452, text: 'R. Coronel Quirino' },
  { x: 1632, y: 1270, text: 'R. 13 de Maio', rotate: -90 },
  { x: 2152, y: 1290, text: 'Av. Brasil', rotate: -90 },
  { x: 700, y: 2050, text: 'Lagoa do Taquaral', big: true },
  { x: 2550, y: 520, text: 'Rod. Dom Pedro I', big: true },
  { x: 2620, y: 1880, text: 'Parque Ecológico', big: true },
  { x: 900, y: 700, text: 'Cambuí', big: true },
  { x: 2900, y: 1300, text: 'Jardim Chapadão', big: true },
];

export type MapMode = 'explore' | 'client' | 'day';

function pts(list: readonly (readonly [number, number])[]) {
  return list.map((p) => p.join(',')).join(' ');
}

export const MapWorld = memo(function MapWorld({ c, mode }: { c: Palette; mode: MapMode }) {
  const m = c.map;
  const route = mode === 'day' ? DAY_ROUTE : mode === 'client' ? CLIENT_ROUTE : null;
  return (
    <Svg width={WORLD.width} height={WORLD.height} viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}>
      <Rect x="0" y="0" width={WORLD.width} height={WORLD.height} fill={m.ground} />

      {/* Áreas verdes e água */}
      <Path
        d="M0 1700 C300 1620 520 1820 820 1780 C1040 1750 1100 1980 1300 2400 L0 2400 Z"
        fill={m.water}
      />
      <Path
        d="M2380 1700 C2700 1640 3100 1700 3300 1900 C3400 2050 3300 2300 3000 2350 C2700 2380 2420 2200 2380 1980 Z"
        fill={m.park}
      />
      <Rect x="1855" y="1325" width="130" height="120" rx="16" fill={m.park} />
      <Rect x="760" y="760" width="300" height="220" rx="24" fill={m.park} />

      {/* Ruas: contorno + preenchimento */}
      <G stroke={m.streetCasing} strokeWidth="18" strokeLinecap="round">
        {VERTICALS.map((x) => (
          <Path key={`vc${x}`} d={`M${x} 0 L${x} ${WORLD.height}`} />
        ))}
        {HORIZONTALS.map((y) => (
          <Path key={`hc${y}`} d={`M0 ${y} L${WORLD.width} ${y}`} />
        ))}
      </G>
      <G stroke={m.street} strokeWidth="13" strokeLinecap="round">
        {VERTICALS.map((x) => (
          <Path key={`v${x}`} d={`M${x} 0 L${x} ${WORLD.height}`} />
        ))}
        {HORIZONTALS.map((y) => (
          <Path key={`h${y}`} d={`M0 ${y} L${WORLD.width} ${y}`} />
        ))}
      </G>
      <G stroke={m.streetCasing} strokeWidth="30" strokeLinecap="round" fill="none">
        <Path d="M0 1170 L3600 1170" />
        <Path d="M2160 0 L2160 2400" />
        <Path d="M300 2300 L3400 300" />
      </G>
      <G stroke={m.avenue} strokeWidth="24" strokeLinecap="round" fill="none">
        <Path d="M0 1170 L3600 1170" />
        <Path d="M2160 0 L2160 2400" />
        <Path d="M300 2300 L3400 300" />
      </G>
      <Path
        d="M1500 0 C1900 360 2600 520 3600 470"
        stroke={m.highway}
        strokeWidth="36"
        fill="none"
      />

      {/* Nomes */}
      {LABELS.map((l) => (
        <SvgText
          key={l.text}
          x={l.x}
          y={l.y}
          fill={m.label}
          fontSize={l.big ? 30 : 19}
          fontFamily={FONT.textMedium}
          transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
        >
          {l.text}
        </SvgText>
      ))}

      {/* Rota */}
      {route && (
        <>
          <Polyline
            points={pts(route)}
            stroke={m.routeCasing}
            strokeWidth="28"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Polyline
            points={pts(route)}
            stroke={m.route}
            strokeWidth="18"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Paradas e clientes */}
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
      {mode !== 'day' && <Pin x={2160} y={1030} color={c.danger} />}
      {mode === 'explore' &&
        CLIENT_PINS.slice(1).map(([x, y]) => (
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

      {/* Veículo */}
      <Circle cx={USER.x} cy={USER.y} r="54" fill={`${m.route}2E`} />
      <Circle cx={USER.x} cy={USER.y} r="24" fill="#FFFFFF" />
      <Path
        d={`M${USER.x} ${USER.y - 14} L${USER.x + 12} ${USER.y + 12} L${USER.x} ${USER.y + 6} L${USER.x - 12} ${USER.y + 12} Z`}
        fill={m.route}
      />
    </Svg>
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
