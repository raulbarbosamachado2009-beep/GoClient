import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, type ImageSourcePropType, Text as RNText, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { FONT } from '../theme';

/** Marca do GoClient: a nuvem azul sobre azul-claro (mesma arte do ícone do app, 26/11/2026). */
export function LogoMark({ size = 96 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      accessibilityLabel="GoClient"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.23,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
      }}
    />
  );
}

/** Logo do Kyte (imagem enviada pelo usuário), para o menu e os Ajustes. */
export function KyteLogo({ size = 64 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/kyte-logo.png')}
      accessibilityLabel="Kyte"
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
    />
  );
}

/**
 * Capa de playlist/álbum fictício. Estilo editorial: cor de fundo com degradê sutil,
 * um padrão geométrico (varia pela cor) e, em tamanhos grandes, o título em tipografia
 * forte — como capas de playlists editoriais. Sem imagens de terceiros.
 */
export function Cover({
  color,
  size,
  height,
  radius = 8,
  title,
  liked,
  image,
}: {
  image?: ImageSourcePropType;
  color: string;
  size: number;
  height?: number;
  radius?: number;
  title?: string;
  liked?: boolean;
}) {
  const h = height ?? size;
  if (liked) {
    return (
      <LinearGradient
        colors={['#4B2BD9', '#8FC9D6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: h,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="heart" size={Math.min(size, h) * 0.42} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  if (image) {
    return (
      <View
        style={{
          width: size,
          height: h,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: color,
        }}
      >
        <Image source={image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        {title && Math.min(size, h) >= 150 && (
          <>
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.55 }}
            />
            <View style={{ position: 'absolute', left: 22, right: 22, bottom: 18 }}>
              <RNText
                numberOfLines={2}
                style={{
                  fontFamily: FONT.displayBold,
                  color: '#FFFFFF',
                  fontSize: 30,
                  lineHeight: 34,
                }}
              >
                {title}
              </RNText>
            </View>
          </>
        )}
      </View>
    );
  }

  const pattern = seed(color) % 3;
  const big = Math.min(size, h) >= 150;

  return (
    <View
      style={{
        width: size,
        height: h,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: color,
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute' }}
      >
        {pattern === 0 && (
          <>
            <Circle cx="74" cy="70" r="46" fill={shade(color, 0.16)} />
            <Circle cx="74" cy="70" r="24" fill={shade(color, -0.22)} />
          </>
        )}
        {pattern === 1 &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <Rect
              key={i}
              x={-20 + i * 22}
              y="-10"
              width="9"
              height="140"
              fill={shade(color, 0.12)}
              transform="rotate(28 50 50)"
            />
          ))}
        {pattern === 2 && (
          <>
            <Path d="M0 100 L100 30 L100 100 Z" fill={shade(color, -0.25)} />
            <Circle cx="28" cy="34" r="14" fill={shade(color, 0.3)} />
          </>
        )}
      </Svg>
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.6 }}
      />
      {title && big && (
        <View style={{ position: 'absolute', left: 22, right: 22, bottom: 18 }}>
          <RNText
            numberOfLines={2}
            style={{
              fontFamily: FONT.displayBold,
              color: '#FFFFFF',
              fontSize: 34,
              lineHeight: 38,
              letterSpacing: -0.5,
            }}
          >
            {title}
          </RNText>
        </View>
      )}
    </View>
  );
}

function seed(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
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
