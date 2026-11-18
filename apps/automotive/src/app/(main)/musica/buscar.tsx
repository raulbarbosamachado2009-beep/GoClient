import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { BROWSE, SHOWS } from '../../../mocks/data';
import { MusicSection } from '../../../music/ui';
import { usePlay } from '../../../music/use-play';
import { spacing, useColors } from '../../../theme';
import { Cover, shade } from '../../../ui/brand';
import { Appear } from '../../../ui/motion';
import { IconButton, SearchField, Text, Touchable } from '../../../ui/primitives';

const WATCH = [
  { id: 'w1', name: 'Clipes da Semana', cover: '#2C6E7A' },
  { id: 'w2', name: 'Acústico ao Vivo', cover: '#3B3F7A' },
  { id: 'w3', name: 'Top Brasil 2026', cover: '#5A2E7A' },
];

/** Buscar (referência: imagem 7). */
export default function Search() {
  const c = useColors();
  const play = usePlay();
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <View style={[styles.initial, { backgroundColor: '#2F6FD6' }]}>
          <Text variant="title" color="#FFFFFF">
            R
          </Text>
        </View>
        <Text variant="largeTitle" style={{ flex: 1, fontSize: 56, lineHeight: 64 }}>
          Buscar
        </Text>
        <IconButton icon="camera-outline" iconSize={46} accessibilityLabel="Buscar por câmera" />
      </View>

      <SearchField
        placeholder="O que você quer ouvir?"
        background={c.music.search}
        foreground={c.music.onSearch}
        style={{ height: 84, borderRadius: 14 }}
      />

      <View style={{ flexDirection: 'row', gap: spacing[6] }}>
        {BROWSE.map((b, i) => (
          <Appear key={b.id} delay={i * 50} distance={12} style={{ flex: 1 }}>
            <Touchable
              accessibilityRole="button"
              style={[styles.tile, { backgroundColor: b.color }]}
            >
              <Text variant="title2" color="#FFFFFF" style={{ fontSize: 34, lineHeight: 40 }}>
                {b.name}
              </Text>
              <View style={[styles.tileArt, { backgroundColor: shade(b.color, 0.3) }]}>
                {b.image && <Image source={b.image} style={{ width: '100%', height: '100%' }} />}
              </View>
            </Touchable>
          </Appear>
        ))}
      </View>

      <MusicSection title="Playlists que você pode assistir" />
      <View style={{ flexDirection: 'row', gap: spacing[6] }}>
        {WATCH.map((w, i) => (
          <Appear key={w.id} delay={200 + i * 60} distance={14} style={{ flex: 1 }}>
            <Touchable accessibilityRole="button" onPress={play} scaleTo={0.97}>
              <Cover color={w.cover} size={460} height={250} radius={18} title={w.name} />
            </Touchable>
          </Appear>
        ))}
      </View>

      <MusicSection title="Descubra episódios pra você" />
      <View style={{ flexDirection: 'row', gap: spacing[5] }}>
        {SHOWS.map((s) => (
          <Touchable
            key={s.id}
            accessibilityRole="button"
            onPress={play}
            scaleTo={0.97}
            style={{ flex: 1 }}
          >
            <Cover color={s.cover} size={338} height={190} radius={14} title={s.name} />
          </Touchable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 36, paddingTop: 28, paddingBottom: 32, gap: spacing[6] },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[8] },
  initial: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: { height: 132, borderRadius: 14, padding: spacing[6], overflow: 'hidden' },
  tileArt: {
    position: 'absolute',
    right: -16,
    bottom: -26,
    width: 116,
    height: 116,
    borderRadius: 10,
    overflow: 'hidden',
    transform: [{ rotate: '25deg' }],
  },
});
