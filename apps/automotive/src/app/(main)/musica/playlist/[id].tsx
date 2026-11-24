import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { PHONE_SCROLL_END, useBleed, usePhone } from '../../../../layout/form-factor';
import { GENRES, type Genre } from '../../../../mocks/data';
import { usePlaylistData } from '../../../../music/library';
import { MusicBack, MusicChip } from '../../../../music/ui';
import { usePlay } from '../../../../music/use-play';
import { usePrototype } from '../../../../prototype/state';
import { spacing, useColors } from '../../../../theme';
import { Cover } from '../../../../ui/brand';
import { Appear } from '../../../../ui/motion';
import { Icon, IconButton, Text, Touchable } from '../../../../ui/primitives';
import { Spinner } from '../../../../ui/spinner';

/**
 * Página da playlist (referência: imagem 3). Os gêneros filtram a lista (apenas no
 * protótipo); tocar numa música abre o player com a lista visível como fila.
 */
export default function PlaylistScreen() {
  const bleed = useBleed();
  const phone = usePhone();
  const c = useColors();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const data = usePlaylistData(id ?? 'l1');
  const { playlist, live, note } = data;
  const { nowPlaying, playContext } = usePrototype();
  const play = usePlay();
  const router = useRouter();
  const [genre, setGenre] = useState<Genre | null>(null);

  const tracks = useMemo(
    () => (genre ? data.tracks.filter((t) => t.genres.includes(genre)) : data.tracks),
    [data.tracks, genre],
  );
  const ids = tracks.map((t) => t.id);
  const total = data.total;
  // No Spotify, toca a partir da playlist/álbum (a fila segue a ordem do Spotify).
  const context = live ? playlist.uri : undefined;
  const playAll = () => {
    if (ids[0]) play(ids[0], ids, context, tracks[0]);
    else if (context) {
      playContext(context);
      router.push('/player');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[playlist.cover, `${playlist.cover}00`]}
        locations={[0, 1]}
        style={[StyleSheet.absoluteFill, { height: 340, left: -bleed }]}
      />

      <View style={styles.header}>
        <MusicBack
          to={from === 'biblioteca' ? '/musica/biblioteca' : '/musica'}
          size={phone ? 88 : 112}
        />
        <View style={{ flex: 1 }}>
          <Text
            variant="largeTitle"
            color="#FFFFFF"
            numberOfLines={1}
            style={phone ? { fontSize: 44, lineHeight: 52 } : { fontSize: 64, lineHeight: 72 }}
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
          size={phone ? 80 : 96}
          iconSize={phone ? 48 : 60}
          color="rgba(255,255,255,0.75)"
          accessibilityLabel="Aleatório"
          onPress={() => {
            const i = Math.floor(Math.random() * ids.length);
            const pick = ids[i];
            if (pick) play(pick, ids, context, tracks[i]);
          }}
        />
        <IconButton
          icon="play"
          size={phone ? 104 : 128}
          iconSize={phone ? 52 : 64}
          color="#000000"
          style={{ backgroundColor: c.music.accent }}
          accessibilityLabel="Tocar playlist"
          onPress={playAll}
        />
      </View>

      <View style={[styles.chips, phone && { gap: spacing[3] }]}>
        {/* O Spotify não informa gêneros por faixa: os filtros ficam só na demonstração. */}
        {!live &&
          GENRES.map((g) => (
            <MusicChip
              key={g}
              label={g}
              selected={genre === g}
              onPress={() => setGenre((cur) => (cur === g ? null : g))}
            />
          ))}
        {!live && <MusicChip label="Adicionar músicas" icon="add" />}
      </View>

      <FlatList
        key={genre ?? 'todas'}
        data={tracks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{
          paddingHorizontal: 36,
          paddingBottom: phone ? PHONE_SCROLL_END : spacing[6],
          gap: spacing[2],
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          data.loading ? (
            <View style={styles.empty}>
              <Spinner color={c.music.accent} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Icon name="musical-notes-outline" size={64} color={c.textTertiary} />
              <Text
                variant="headline"
                tone="secondary"
                style={{ textAlign: 'center', maxWidth: 900 }}
              >
                {note ??
                  (genre ? `Nenhuma música de ${genre} nesta playlist` : 'Nenhuma música aqui')}
              </Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const current = nowPlaying?.id === item.id;
          return (
            <Appear delay={index * 40} distance={10}>
              <View style={styles.row}>
                {/* Área tocável da faixa; o botão "mais opções" fica fora dela. */}
                <Touchable
                  accessibilityRole="button"
                  onPress={() => play(item.id, ids, context, item)}
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
    gap: spacing[6],
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
