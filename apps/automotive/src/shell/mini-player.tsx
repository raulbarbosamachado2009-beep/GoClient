import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { usePrototype } from '../prototype/state';
import { layout, nativeDriver, spacing, useColors } from '../theme';
import { Cover } from '../ui/brand';
import { IconButton, Text, Touchable } from '../ui/primitives';

/**
 * Player minimizado (referência: imagem 8). Só aparece dentro da Música, logo acima das
 * abas. Entra subindo; toque na área da faixa abre o player completo.
 */
export function MiniPlayer() {
  const c = useColors();
  const { nowPlaying } = usePrototype();
  const router = useRouter();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (nowPlaying)
      Animated.spring(enter, {
        toValue: 1,
        damping: 20,
        stiffness: 220,
        useNativeDriver: nativeDriver,
      }).start();
  }, [nowPlaying, enter]);

  // A cor acompanha a capa; ao trocar de faixa ela muda numa transição suave.
  const tint = useTintTransition(nowPlaying?.tint ?? c.music.miniPlayer);

  if (!nowPlaying) return null;

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: tint },
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
          ],
        },
      ]}
    >
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={`Abrir player: ${nowPlaying.title}`}
        onPress={() => router.push('/player')}
        scaleTo={0.985}
        style={styles.open}
      >
        <Cover color={nowPlaying.cover} image={nowPlaying.image} size={72} radius={8} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" color="#FFFFFF" numberOfLines={1}>
            {nowPlaying.title}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>
            {nowPlaying.artists}
          </Text>
        </View>
      </Touchable>
      <IconButton icon="phone-portrait-outline" color="#FFFFFF" accessibilityLabel="Dispositivos" />
      <IconButton
        icon="checkmark-circle"
        iconSize={40}
        color={c.music.accent}
        accessibilityLabel="Salva na biblioteca"
      />
      <IconButton icon="pause" iconSize={40} color="#FFFFFF" accessibilityLabel="Pausar" />
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
    </Animated.View>
  );
}

/** Interpola entre a cor anterior e a nova em ~400 ms. */
function useTintTransition(color: string): Animated.AnimatedInterpolation<string> {
  const v = useRef(new Animated.Value(1)).current;
  const [pair, setPair] = useState({ from: color, to: color });
  useEffect(() => {
    setPair((p) => (p.to === color ? p : { from: p.to, to: color }));
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: false }).start();
  }, [v, color]);
  return v.interpolate({ inputRange: [0, 1], outputRange: [pair.from, pair.to] });
}

const styles = StyleSheet.create({
  bar: {
    height: layout.miniPlayerHeight,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingLeft: 12,
    paddingRight: spacing[3],
    overflow: 'hidden',
  },
  open: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
  track: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  fill: { width: '34%', height: 3, backgroundColor: '#FFFFFF' },
});
