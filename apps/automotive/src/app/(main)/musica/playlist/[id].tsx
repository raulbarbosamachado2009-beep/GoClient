import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { GENRES, type Genre, playlistById, trackById } from '../../../../mocks/data';
import { MusicChip } from '../../../../music/ui';
import { usePlay } from '../../../../music/use-play';
import { usePrototype } from '../../../../prototype/state';
import { layout, spacing, useColors } from '../../../../theme';
import { Cover } from '../../../../ui/brand';
import { Appear } from '../../../../ui/motion';
import { Icon, IconButton, Material, Text, Touchable } from '../../../../ui/primitives';

/**
 * Página da playlist (referência: imagem 3). Os gêneros filtram a lista (apenas no
 * protótipo); tocar numa música abre o player com a lista visível como fila.
 */
export default function PlaylistScreen() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlist = playlistById(id ?? 'l1');
  const { nowPlaying } = usePrototype();
  const play = usePlay();
  const [genre, setGenre] = useState<Genre | null>(null);

  const tracks = useMemo(() => {
    const all = playlist.tracks.map(trackById);
    return genre ? all.filter((t) => t.genres.includes(genre)) : all;
  }, [playlist, genre]);
  const ids = tracks.map((t) => t.id);
  const total = playlist.tracks.length;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[playlist.cover, `${playlist.cover}00`]}
        locations={[0, 1]}
        style={[StyleSheet.absoluteFill, { height: 340, left: -layout.sidebarWidth }]}
      />

      <View style={styles.header}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          scaleTo={0.9}
        >
          <Material style={styles.back} radius={20}>
            <Icon name="chevron-back" size={52} color="#FFFFFF" />
          </Material>
        </Touchable>
        <View style={{ flex: 1 }}>
          <Text
            variant="largeTitle"
            color="#FFFFFF"
            numberOfLines={1}
            style={{ fontSize: 64, lineHeight: 72 }}
          >
            {playlist.name}
          </Text>
          <Text
            variant="body"
            color="rgba(255,255,255,0.7)"
            style={{ fontSize: 32, lineHeight: 40 }}
          >
            {total} {total === 1 ? 'música' : 'músicas'}
          </Text>
        </View>
        <IconButton
          icon="shuffle"
          size={96}
          iconSize={60}
          color="rgba(255,255,255,0.75)"
          accessibilityLabel="Aleatório"
          onPress={() => {
            const pick = ids[Math.floor(Math.random() * ids.length)];
            if (pick) play(pick, ids);
          }}
        />
        <IconButton
          icon="play"
          size={128}
          iconSize={64}
          color="#000000"
          style={{ backgroundColor: c.music.accent }}
          accessibilityLabel="Tocar playlist"
          onPress={() => ids[0] && play(ids[0], ids)}
        />
      </View>

      <View style={styles.chips}>
        {GENRES.map((g) => (
          <MusicChip
            key={g}
            label={g}
            selected={genre === g}
            onPress={() => setGenre((cur) => (cur === g ? null : g))}
          />
        ))}
        <MusicChip label="Adicionar músicas" icon="add" />
      </View>

      <FlatList
        key={genre ?? 'todas'}
        data={tracks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{
          paddingHorizontal: 36,
          paddingBottom: spacing[6],
          gap: spacing[2],
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="musical-notes-outline" size={64} color={c.textTertiary} />
            <Text variant="headline" tone="secondary">
              Nenhuma música de {genre} nesta playlist
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const current = nowPlaying?.id === item.id;
          return (
            <Appear delay={index * 40} distance={10}>
              <View style={styles.row}>
                {/* Área tocável da faixa; o botão "mais opções" fica fora dela. */}
                <Touchable
                  accessibilityRole="button"
                  onPress={() => play(item.id, ids)}
                  scaleTo={0.985}
                  style={styles.rowMain}
                >
                  <Cover color={item.cover} image={item.image} size={108} radius={6} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      variant="body"
                      color={current ? c.music.accent : c.text}
                      numberOfLines={1}
                      style={styles.title}
                    >
                      {item.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      {item.downloaded && (
                        <Icon name="arrow-down-circle" size={32} color={c.music.accent} />
                      )}
                      {item.explicit && (
                        <View style={[styles.explicit, { backgroundColor: c.textSecondary }]}>
                          <Text variant="footnote" color={c.music.background}>
                            E
                          </Text>
                        </View>
                      )}
                      <Text
                        variant="body"
                        tone="secondary"
                        numberOfLines={1}
                        style={{ flex: 1, fontSize: 28, lineHeight: 34 }}
                      >
                        {item.artists}
                      </Text>
                    </View>
                  </View>
                </Touchable>
                <IconButton
                  icon="ellipsis-horizontal"
                  iconSize={40}
                  accessibilityLabel="Mais opções"
                />
              </View>
            </Appear>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: 36,
    paddingTop: 28,
  },
  back: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[5],
    paddingHorizontal: 36,
    paddingVertical: spacing[6],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
    paddingVertical: spacing[1],
    flex: 1,
  },
  title: { fontSize: 36, lineHeight: 42 },
  explicit: {
    width: 30,
    height: 30,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', gap: spacing[4], paddingVertical: 80 },
});
