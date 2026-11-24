import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { IconButton, Text } from '../ui/primitives';
import { type NowPlaying, useProgress } from './now-playing';

const W = '#FFFFFF';
const GREEN = '#1ED760';

/**
 * Barra de progresso real (posição do Spotify) com toque para pular para outro ponto.
 * `height` é a espessura da barra; `thumb` o diâmetro da bolinha (0 = sem bolinha).
 */
export function ProgressBar({
  np,
  height,
  thumb,
  labelColor,
  labelVariant = 'callout',
  showLabels = true,
}: {
  np: NowPlaying;
  height: number;
  thumb: number;
  labelColor: string;
  labelVariant?: 'callout' | 'caption';
  showLabels?: boolean;
}) {
  const progress = useProgress(np);
  const [width, setWidth] = useState(0);
  const pct = `${Math.round(progress.fraction * 1000) / 10}%` as const;
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={`Posição da música: ${progress.elapsed}`}
        disabled={!np.live}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => {
          if (width > 0) np.seek((e.nativeEvent.locationX / width) * np.durationMs);
        }}
        // Área de toque bem maior que a barra (fácil de acertar com o carro em movimento).
        hitSlop={{ top: 24, bottom: 24 }}
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: 'rgba(255,255,255,0.28)',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: pct, height, borderRadius: height / 2, backgroundColor: W }} />
        {thumb > 0 && (
          <View
            style={{
              position: 'absolute',
              left: pct,
              marginLeft: -thumb / 2,
              width: thumb,
              height: thumb,
              borderRadius: thumb / 2,
              backgroundColor: W,
            }}
          />
        )}
      </Pressable>
      {showLabels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant={labelVariant} color={labelColor}>
            {progress.elapsed}
          </Text>
          <Text variant={labelVariant} color={labelColor}>
            {progress.remaining}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Aleatório: verde quando ligado (como no Spotify). */
export function ShuffleButton({
  np,
  size,
  iconSize,
}: {
  np: NowPlaying;
  size: number;
  iconSize: number;
}) {
  return (
    <IconButton
      icon="shuffle"
      size={size}
      iconSize={iconSize}
      color={np.shuffle ? GREEN : W}
      accessibilityLabel={np.shuffle ? 'Desligar aleatório' : 'Ligar aleatório'}
      accessibilityState={{ selected: np.shuffle }}
      onPress={np.toggleShuffle}
    />
  );
}

/** Repetir: desligado → lista → faixa (com o "1"), como no Spotify. */
export function RepeatButton({
  np,
  size,
  iconSize,
}: {
  np: NowPlaying;
  size: number;
  iconSize: number;
}) {
  const on = np.repeat !== 'off';
  const label =
    np.repeat === 'off'
      ? 'Repetir a lista'
      : np.repeat === 'context'
        ? 'Repetir a música'
        : 'Não repetir';
  return (
    <View>
      <IconButton
        icon="repeat"
        size={size}
        iconSize={iconSize}
        color={on ? GREEN : W}
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={np.cycleRepeat}
      />
      {np.repeat === 'track' && (
        <Text
          variant="footnote"
          color={GREEN}
          pointerEvents="none"
          style={{ position: 'absolute', top: size * 0.12, right: size * 0.12, fontSize: 18 }}
        >
          1
        </Text>
      )}
    </View>
  );
}
