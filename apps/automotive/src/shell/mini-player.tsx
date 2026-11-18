import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { usePrototype } from '../prototype/state';
import { colors, layout, spacing } from '../theme';
import { Artwork } from '../ui/brand';
import { IconButton, Text, Touchable } from '../ui/primitives';

/** Player minimizado no rodapé (referência: imagem 8). Toque abre o player completo. */
export function MiniPlayer() {
  const { nowPlaying } = usePrototype();
  const router = useRouter();
  if (!nowPlaying) return null;

  return (
    <View style={styles.bar}>
      {/* Área principal: abre o player completo. Os botões ficam fora dela. */}
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={`Abrir player: ${nowPlaying.title}`}
        onPress={() => router.push('/player')}
        pressedOpacity={0.85}
        style={styles.open}
      >
        <Artwork color={nowPlaying.cover} size={76} radius={10} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {nowPlaying.title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {nowPlaying.artists}
          </Text>
        </View>
      </Touchable>
      <IconButton icon="phone-portrait-outline" variant="plain" accessibilityLabel="Dispositivos" />
      <IconButton
        icon="checkmark-circle"
        variant="plain"
        color={colors.music.accent}
        iconSize={38}
        accessibilityLabel="Salva na biblioteca"
      />
      <IconButton icon="pause" variant="plain" iconSize={40} accessibilityLabel="Pausar" />
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: layout.miniPlayerHeight,
    borderRadius: 22,
    backgroundColor: colors.music.miniPlayer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingLeft: 14,
    paddingRight: spacing[3],
    overflow: 'hidden',
  },
  open: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  progressTrack: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
  },
  progressFill: { width: '34%', height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 },
});
