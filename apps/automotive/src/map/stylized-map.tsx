import { View } from 'react-native';
import Svg, { Circle, G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Mapa ILUSTRATIVO desenhado em SVG, apenas para o design. O mapa real (com tiles,
 * GPS e cálculo de rota) será integrado em fase própria.
 */

const VB_W = 1200;
const VB_H = 900;

const VERTICALS = [80, 220, 360, 520, 680, 840, 1000, 1140];
const HORIZONTALS = [90, 230, 380, 520, 660, 800];

const LABELS: { x: number; y: number; text: string; rotate?: number }[] = [
  { x: 560, y: 372, text: 'Av. das Palmeiras' },
  { x: 380, y: 222, text: 'R. Barão de Jaguara' },
  { x: 700, y: 652, text: 'R. Coronel Quirino' },
  { x: 352, y: 470, text: 'R. 13 de Maio', rotate: -90 },
  { x: 832, y: 330, text: 'Av. Brasil', rotate: -90 },
  { x: 150, y: 770, text: 'Lagoa do Taquaral' },
  { x: 930, y: 150, text: 'Rod. Dom Pedro I' },
];

/** Percurso do dia (pontos sobre as ruas) e posição das paradas. */
export const DAY_ROUTE = [
  [360, 660],
  [360, 520],
  [520, 520],
  [520, 380],
  [680, 380],
  [840, 380],
  [840, 230],
  [1000, 230],
  [1000, 90],
] as const;
export const DAY_STOPS = [
  [520, 520],
  [680, 380],
  [840, 230],
  [1000, 230],
  [1000, 90],
] as const;

export const CLIENT_ROUTE = [
  [360, 660],
  [360, 520],
  [680, 520],
  [680, 380],
  [840, 380],
  [840, 230],
] as const;

const USER = [360, 660] as const;

export type MapMode = 'explore' | 'client' | 'day';

export function StylizedMap({ mode = 'explore' }: { mode?: MapMode }) {
  const route = mode === 'day' ? DAY_ROUTE : mode === 'client' ? CLIENT_ROUTE : null;
  const points = route?.map((p) => p.join(',')).join(' ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.map.ground }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Rect x="0" y="0" width={VB_W} height={VB_H} fill={colors.map.ground} />

        {/* Quadras */}
        {HORIZONTALS.slice(0, -1).map((y, i) =>
          VERTICALS.slice(0, -1).map((x, j) => (
            <Rect
              key={`b${x}-${y}`}
              x={x + 14}
              y={y + 14}
              width={(VERTICALS[j + 1] as number) - x - 28}
              height={(HORIZONTALS[i + 1] as number) - y - 28}
              rx="10"
              fill={colors.map.block}
            />
          )),
        )}

        {/* Parque e lagoa */}
        <Rect x="534" y="534" width="132" height="112" rx="14" fill={colors.map.park} />
        <Path
          d="M0 700 C120 660 220 760 340 740 C420 728 430 820 520 900 L0 900 Z"
          fill={colors.map.water}
        />

        {/* Ruas */}
        <G stroke={colors.map.street} strokeWidth="12" strokeLinecap="round">
          {VERTICALS.map((x) => (
            <Path key={`v${x}`} d={`M${x} 0 L${x} ${VB_H}`} />
          ))}
          {HORIZONTALS.map((y) => (
            <Path key={`h${y}`} d={`M0 ${y} L${VB_W} ${y}`} />
          ))}
        </G>
        <G stroke={colors.map.avenue} strokeWidth="20" strokeLinecap="round" fill="none">
          <Path d="M0 380 L1200 380" />
          <Path d="M840 0 L840 900" />
          <Path d="M-20 860 L1220 120" />
        </G>
        <Path
          d="M600 -20 C760 120 1000 140 1220 120"
          stroke={colors.map.highway}
          strokeWidth="28"
          fill="none"
        />

        {/* Nomes de ruas */}
        {LABELS.map((l) => (
          <SvgText
            key={l.text}
            x={l.x}
            y={l.y}
            fill={colors.map.label}
            fontSize="18"
            fontWeight="500"
            transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
          >
            {l.text}
          </SvgText>
        ))}

        {/* Rota */}
        {points && (
          <>
            <Polyline
              points={points}
              stroke={colors.map.routeCasing}
              strokeWidth="26"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <Polyline
              points={points}
              stroke={colors.map.route}
              strokeWidth="14"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Paradas */}
        {mode === 'day' &&
          DAY_STOPS.map(([x, y], i) => (
            <G key={`s${x}-${y}`}>
              <Circle cx={x} cy={y} r="24" fill="#FFFFFF" />
              <Circle cx={x} cy={y} r="19" fill={colors.accent} />
              <SvgText
                x={x}
                y={y + 7}
                fill="#FFFFFF"
                fontSize="20"
                fontWeight="700"
                textAnchor="middle"
              >
                {String(i + 1)}
              </SvgText>
            </G>
          ))}
        {mode === 'client' && <DestinationPin x={840} y={230} />}
        {mode === 'explore' && (
          <>
            <DestinationPin x={840} y={230} />
            {[
              [520, 520],
              [1000, 90],
              [220, 230],
              [1000, 660],
            ].map(([x, y]) => (
              <Circle
                key={`p${x}-${y}`}
                cx={x}
                cy={y}
                r="13"
                fill={colors.accent}
                stroke="#FFFFFF"
                strokeWidth="4"
              />
            ))}
          </>
        )}

        {/* Posição do veículo */}
        <Circle cx={USER[0]} cy={USER[1]} r="46" fill="rgba(10,132,255,0.16)" />
        <Circle cx={USER[0]} cy={USER[1]} r="22" fill="#FFFFFF" />
        <Path
          d={`M${USER[0]} ${USER[1] - 13} L${USER[0] + 11} ${USER[1] + 11} L${USER[0]} ${USER[1] + 5} L${USER[0] - 11} ${USER[1] + 11} Z`}
          fill={colors.accent}
        />
      </Svg>
    </View>
  );
}

function DestinationPin({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Path
        d={`M${x} ${y} C${x - 6} ${y - 18} ${x - 26} ${y - 26} ${x - 26} ${y - 46} A26 26 0 1 1 ${x + 26} ${y - 46} C${x + 26} ${y - 26} ${x + 6} ${y - 18} ${x} ${y} Z`}
        fill={colors.danger}
        stroke="#FFFFFF"
        strokeWidth="4"
      />
      <Circle cx={x} cy={y - 46} r="9" fill="#FFFFFF" />
    </G>
  );
}
