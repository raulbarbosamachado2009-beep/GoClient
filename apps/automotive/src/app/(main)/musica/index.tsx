import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { COVERS, PLAYLISTS, SHOWS } from '../../../mocks/data';
import { AccountButton } from '../../../music/accounts';
import { MusicChip, MusicSection, PlaylistTile } from '../../../music/ui';
import { useOpenPlaylist, usePlay } from '../../../music/use-play';
import { spacing, useColors } from '../../../theme';
import { Cover } from '../../../ui/brand';
import { Appear } from '../../../ui/motion';
import { Icon, IconButton, Text, Touchable } from '../../../ui/primitives';

type Filter = 'Tudo' | 'Músicas' | 'Podcasts' | 'Audiolivros';

/**
 * Início da Música (referência: imagem 3). Os filtros mudam o conteúdo exibido
 * (apenas no protótipo).
 */
export default function MusicHome() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('Tudo');
  const showMusic = filter === 'Tudo' || filter === 'Músicas';
  const showShows = filter === 'Tudo' || filter === 'Podcasts';

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.top}>
        <AccountButton />
        <MusicChip label="Tudo" selected={filter === 'Tudo'} onPress={() => setFilter('Tudo')} />
        <MusicChip
          label="Músicas"
          icon="musical-note"
          selected={filter === 'Músicas'}
          onPress={() => setFilter('Músicas')}
        />
        <MusicChip
          label="Podcasts"
          icon="mic-outline"
          selected={filter === 'Podcasts'}
          onPress={() => setFilter('Podcasts')}
        />
        <MusicChip
          label="Audiolivros"
          icon="headset-outline"
          selected={filter === 'Audiolivros'}
          onPress={() => setFilter('Audiolivros')}
        />
        <View style={{ flex: 1 }} />
        <IconButton
          icon="search"
          iconSize={48}
          accessibilityLabel="Buscar"
          onPress={() => router.replace('/musica/buscar')}
        />
      </View>

      <View key={filter} style={{ gap: spacing[6] }}>
        {showMusic && <MusicGrid />}
        {showMusic && <NewRelease />}
        {showShows && <Shows big={filter === 'Podcasts'} />}
        {filter === 'Audiolivros' && <EmptyState />}
      </View>
    </ScrollView>
  );
}

function MusicGrid() {
  const open = useOpenPlaylist();
  const router = useRouter();
  // "Sua Biblioteca" ocupa o lugar de "Piscina de Diamante" (que continua na Biblioteca).
  const tiles = PLAYLISTS.slice(0, 6).map((p) => (p.id === 'l2' ? LIBRARY : p));
  return (
    <View style={styles.grid}>
      {tiles.map((p, i) => (
        <Appear key={p.id} delay={i * 40} distance={12} style={{ width: '49.3%' }}>
          {p === LIBRARY ? (
            <PlaylistTile
              cover={
                <View style={styles.libraryCover}>
                  <Icon name="library" size={52} color="#FFFFFF" />
                </View>
              }
              title="Sua Biblioteca"
              onPress={() => router.replace('/musica/biblioteca')}
            />
          ) : (
            <PlaylistTile
              cover={
                <Cover color={p.cover} image={p.image} size={104} radius={0} liked={p.liked} />
              }
              title={p.name}
              onPress={() => open(p.id)}
            />
          )}
        </Appear>
      ))}
    </View>
  );
}

/** Marcador do bloco "Sua Biblioteca" na grade do Início. */
const LIBRARY = { id: 'biblioteca' } as (typeof PLAYLISTS)[number];

function NewRelease() {
  const c = useColors();
  const play = usePlay();
  return (
    <Appear delay={240} distance={14}>
      <View
        style={[styles.release, { backgroundColor: c.music.card, borderColor: c.music.cardBorder }]}
      >
        <Cover color="#8A7A55" image={COVERS.piscina} size={124} radius={62} />
        <View style={{ width: 400 }}>
          <Text variant="callout" tone="secondary">
            Novo lançamento de
          </Text>
          <Text variant="largeTitle" numberOfLines={1} style={{ fontSize: 58, lineHeight: 66 }}>
            MC Kevin
          </Text>
        </View>
        <Cover color="#4A3A2A" image={COVERS.donos} size={136} radius={8} />
        <View style={{ flex: 1 }}>
          <Text variant="callout" tone="secondary">
            Single
          </Text>
          <Text variant="title2">Donos da Capital</Text>
          <Text variant="callout" tone="secondary" numberOfLines={1}>
            MC Kevin, MC Ryan SP, MC GP, MC Lele JP, MC IG
          </Text>
        </View>
        <IconButton
          icon="play"
          variant="inverse"
          size={92}
          iconSize={44}
          accessibilityLabel="Tocar"
          onPress={() => play('t2')}
        />
        <View style={[styles.vline, { backgroundColor: c.music.cardBorder }]} />
        <IconButton icon="ellipsis-horizontal" iconSize={40} accessibilityLabel="Mais opções" />
      </View>
    </Appear>
  );
}

function Shows({ big }: { big: boolean }) {
  const play = usePlay();
  return (
    <>
      <MusicSection title={big ? 'Seus podcasts' : 'Seus programas'} action="Ver mais" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[5] }}>
        {SHOWS.map((s, i) => (
          <Appear
            key={s.id}
            delay={300 + i * 50}
            distance={14}
            style={{ width: big ? '48.9%' : '23.6%' }}
          >
            <Touchable accessibilityRole="button" onPress={() => play()} scaleTo={0.97}>
              <Cover
                color={s.cover}
                size={big ? 704 : 338}
                height={big ? 260 : 190}
                radius={14}
                title={s.name}
              />
            </Touchable>
          </Appear>
        ))}
      </View>
    </>
  );
}

function EmptyState() {
  const c = useColors();
  return (
    <Appear distance={12} style={styles.empty}>
      <Icon name="headset-outline" size={72} color={c.textTertiary} />
      <Text variant="title2">Nenhum audiolivro ainda</Text>
      <Text variant="callout" tone="secondary">
        Os audiolivros que você salvar no Spotify aparecem aqui.
      </Text>
    </Appear>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 36, paddingTop: 28, paddingBottom: 32, gap: spacing[6] },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
  libraryCover: {
    width: 104,
    height: 104,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing[4],
  },
  release: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 28,
    borderWidth: 1,
  },
  vline: { width: 1.5, height: 72 },
  empty: { alignItems: 'center', gap: spacing[3], paddingVertical: 96 },
});
