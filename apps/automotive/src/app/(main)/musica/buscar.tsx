import { ScrollView, StyleSheet, View } from 'react-native';
import { BROWSE, SHOWS } from '../../../mocks/data';
import { usePlay } from '../../../music/use-play';
import { spacing } from '../../../theme';
import { Artwork, shade } from '../../../ui/brand';
import { Avatar, IconButton, SearchField, Text, Touchable } from '../../../ui/primitives';

const WATCH = [
  { id: 'w1', name: 'Clipes da Semana', cover: '#2C6E7A' },
  { id: 'w2', name: 'Acústico ao Vivo', cover: '#3B3F7A' },
  { id: 'w3', name: 'Top Brasil 2026', cover: '#5A2E7A' },
];

/** Buscar (referência: imagem 7). */
export default function Search() {
  const play = usePlay();
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <Avatar name="Raul" size={76} color="#2F6FD6" />
        <Text variant="display" style={{ flex: 1, fontSize: 48 }}>
          Buscar
        </Text>
        <IconButton
          icon="camera-outline"
          variant="plain"
          iconSize={40}
          accessibilityLabel="Buscar por câmera"
        />
      </View>

      <SearchField light placeholder="O que você quer ouvir?" />

      <View style={{ flexDirection: 'row', gap: spacing[5] }}>
        {BROWSE.map((b) => (
          <Touchable
            key={b.id}
            accessibilityRole="button"
            style={[styles.tile, { backgroundColor: b.color }]}
          >
            <Text variant="headline" color="#FFFFFF" style={{ fontSize: 30 }}>
              {b.name}
            </Text>
            <View style={[styles.tileArt, { backgroundColor: shade(b.color, 0.25) }]} />
          </Touchable>
        ))}
      </View>

      <Text variant="title" style={{ fontSize: 34, marginTop: spacing[2] }}>
        Playlists que você pode assistir
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[5] }}>
        {WATCH.map((w) => (
          <Touchable key={w.id} accessibilityRole="button" onPress={play} style={styles.watch}>
            <Artwork color={w.cover} size={440} height={240} radius={20} label={w.name} />
          </Touchable>
        ))}
      </View>

      <Text variant="title" style={{ fontSize: 34, marginTop: spacing[2] }}>
        Descubra episódios pra você
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[5] }}>
        {SHOWS.map((s) => (
          <Touchable key={s.id} accessibilityRole="button" onPress={play} style={{ flex: 1 }}>
            <Artwork color={s.cover} size={318} height={200} radius={20} label={s.name} />
          </Touchable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingTop: 32, paddingBottom: 40, gap: spacing[6] },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
  tile: {
    flex: 1,
    height: 128,
    borderRadius: 18,
    padding: spacing[5],
    overflow: 'hidden',
  },
  tileArt: {
    position: 'absolute',
    right: -18,
    bottom: -24,
    width: 110,
    height: 110,
    borderRadius: 14,
    transform: [{ rotate: '24deg' }],
  },
  watch: { flex: 1, borderRadius: 20, overflow: 'hidden' },
});
