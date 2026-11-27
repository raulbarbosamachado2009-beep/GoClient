import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useColors } from '../theme';

/**
 * Fundo "aurora" da tela de login (pedido do usuário em 26/11/2026): quatro brilhos suaves
 * em tons de azul (royal, céu, anil e ciano) sobre um degradê azul-claro, no formato do
 * componente de referência (o usuário pediu azul e variantes no lugar de roxo/rosa).
 *
 * Feito com react-native-svg, no lugar do componente em Tailwind que veio de referência (o
 * app não usa Tailwind nem shadcn). É estático: desenhado uma vez, sem animação nem desfoque,
 * para não pesar na multimídia. No modo escuro, os mesmos brilhos ficam mais fracos sobre
 * um fundo quase preto, para o texto claro continuar legível.
 */

/** Elipses do CSS original: `radial-gradient(ellipse RX RY at X Y, cor, transparent FIM)`. */
const GLOWS = [
  { id: 'aurora-a', x: 0.08, y: 0.08, rx: 0.85, ry: 0.65, color: '#3B82F6', alpha: 0.4, end: 0.6 },
  { id: 'aurora-b', x: 0.75, y: 0.35, rx: 0.75, ry: 0.6, color: '#7DD3FC', alpha: 0.5, end: 0.62 },
  { id: 'aurora-c', x: 0.15, y: 0.8, rx: 0.7, ry: 0.6, color: '#6366F1', alpha: 0.32, end: 0.62 },
  { id: 'aurora-d', x: 0.92, y: 0.92, rx: 0.7, ry: 0.6, color: '#38BDF8', alpha: 0.45, end: 0.62 },
] as const;

export const AuroraBackground = memo(function AuroraBackground() {
  const dark = useColors().mode === 'dark';
  const base = dark ? ['#0A1222', '#0B1A33'] : ['#EEF5FF', '#DCEBFF'];
  const fade = dark ? 0.45 : 1;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="aurora-base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={base[0]} />
            <Stop offset="1" stopColor={base[1]} />
          </LinearGradient>
          {GLOWS.map((g) => (
            <RadialGradient
              key={g.id}
              id={g.id}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="objectBoundingBox"
              gradientTransform={`translate(${g.x} ${g.y}) scale(${g.rx} ${g.ry})`}
            >
              <Stop offset="0" stopColor={g.color} stopOpacity={g.alpha * fade} />
              <Stop offset={g.end} stopColor={g.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect width="100%" height="100%" fill="url(#aurora-base)" />
        {/* No CSS a primeira camada fica por cima: desenha de trás para frente. */}
        {[...GLOWS].reverse().map((g) => (
          <Rect key={g.id} width="100%" height="100%" fill={`url(#${g.id})`} />
        ))}
      </Svg>
    </View>
  );
});
