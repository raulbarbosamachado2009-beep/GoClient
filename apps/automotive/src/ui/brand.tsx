import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';
import { Text } from './primitives';

/** Marca do GoClient: quadrado arredondado com um percurso que termina num ponto. */
export function LogoMark({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Rect x="0" y="0" width="96" height="96" rx="26" fill={colors.accent} />
      <Path
        d="M26 66 C26 46 46 50 48 36 C50 24 62 24 70 30"
        stroke="#FFFFFF"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="26" cy="66" r="7" fill="#FFFFFF" />
      <Circle cx="70" cy="30" r="10" fill="#FFFFFF" />
      <Circle cx="70" cy="30" r="4" fill={colors.accent} />
    </Svg>
  );
}

export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <Text variant="title" style={{ fontSize: size, lineHeight: size * 1.15, letterSpacing: -0.5 }}>
      GoClient
    </Text>
  );
}

/**
 * Capa gerada para playlists/músicas fictícias: cor sólida com um leve degradê e formas
 * geométricas. Evita imagens de terceiros no design.
 */
export function Artwork({
  color,
  size,
  height,
  radius = 12,
  label,
  liked,
}: {
  color: string;
  /** Largura; a altura é igual, salvo se `height` for informado. */
  size: number;
  height?: number;
  radius?: number;
  label?: string;
  liked?: boolean;
}) {
  return (
    <View style={{ width: size, height: height ?? size, borderRadius: radius, overflow: 'hidden' }}>
      <LinearGradient
        colors={[color, shade(color, -0.45)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute' }}
        >
          {liked ? (
            <Path d="M50 72 L30 52 A11 11 0 0 1 50 36 A11 11 0 0 1 70 52 Z" fill="#FFFFFF" />
          ) : (
            <>
              <Circle cx="78" cy="22" r="30" fill="rgba(255,255,255,0.10)" />
              <Circle cx="18" cy="88" r="22" fill="rgba(0,0,0,0.18)" />
              <Path d="M0 70 Q50 40 100 64 L100 100 L0 100 Z" fill="rgba(255,255,255,0.06)" />
            </>
          )}
        </Svg>
        {label && size >= 120 && (
          <View style={{ position: 'absolute', left: 24, bottom: 20, right: 24 }}>
            <Text
              variant="headline"
              color="#FFFFFF"
              style={{ fontSize: 32, lineHeight: 38 }}
              numberOfLines={2}
            >
              {label}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

/** Escurece (amount < 0) ou clareia (amount > 0) uma cor hex. */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 0xff;
    const out = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount;
    return Math.round(Math.max(0, Math.min(255, out)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
