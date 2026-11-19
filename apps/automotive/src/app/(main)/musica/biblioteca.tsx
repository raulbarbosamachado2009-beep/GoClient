import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ARTISTS, PLAYLISTS, SHOWS } from '../../../mocks/data';
import { AccountButton } from '../../../music/accounts';
import { MusicChip, PlaylistTile } from '../../../music/ui';
import { useOpenPlaylist, usePlay } from '../../../music/use-play';
import { spacing, useColors } from '../../../theme';
import { Cover } from '../../../ui/brand';
import { Appear } from '../../../ui/motion';
import { Avatar, Icon, IconButton, type IconName, Text, Touchable } from '../../../ui/primitives';

type Filter = 'Playlists' | 'Podcasts' | 'Álbuns' | 'Artistas' | 'Eventos';

const FILTERS: { label: Filter; icon: IconName }[] = [
  { label: 'Playlists', icon: 'play' },
  { label: 'Podcasts', icon: 'mic-outline' },
  { label: 'Álbuns', icon: 'disc-outline' },
  { label: 'Artistas', icon: 'person-outline' },
  { label: 'Eventos', icon: 'calendar-outline' },
];

/**
 * Sua Biblioteca (referência: imagem 5). Os filtros mostram só o tipo escolhido; tocar
 * de novo no filtro ativo volta a mostrar tudo (apenas no protótipo).
 */
export default function Library() {
  const c = useColors();
  const [filter, setFilter] = useState<Filter | null>(null);
  const open = useOpenPlaylist();
  const play = usePlay();

  const pin = (text: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
      <Icon name="pin" size={24} color={c.music.accent} />
      <Text variant="callout" tone="secondary" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );

  const rows: { key: string; node: ReactNode }[] = [];
  const show = (f: Filter) => filter === null || filter === f;

  for (const p of PLAYLISTS) {
    if (!show(p.kind === 'Playlist' ? 'Playlists' : 'Álbuns')) continue;
    rows.push({
      key: p.id,
      node: (
        <PlaylistTile
          cover={<Cover color={p.cover} image={p.image} size={104} radius={0} liked={p.liked} />}
          title={p.name}
          onPress={() => open(p.id)}
          subtitle={pin(p.detail)}
        />
      ),
    });
  }
  if (show('Podcasts')) {
    for (const s of SHOWS) {
      rows.push({
        key: s.id,
        node: (
          <PlaylistTile
            cover={<Cover color={s.cover} size={104} radius={0} />}
            title={s.name}
            onPress={() => play()}
            subtitle={pin('Podcast')}
          />
        ),
      });
    }
  }
  if (show('Artistas')) {
    for (const a of ARTISTS) {
      rows.push({
        key: a.id,
        node: (
          <Touchable accessibilityRole="button" scaleTo={0.985} style={styles.artist}>
            {a.image ? (
              <Cover color="#333" image={a.image} size={104} radius={52} />
            ) : (
              <Avatar name={a.name} size={104} />
            )}
            <View style={{ flex: 1 }}>
              <Text variant="title2" style={{ fontSize: 30, lineHeight: 36 }}>
                {a.name}
              </Text>
              <Text variant="callout" tone="secondary">
                Artista
              </Text>
            </View>
          </Touchable>
        ),
      });
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <AccountButton />
        <Text variant="largeTitle" style={{ flex: 1, fontSize: 56, lineHeight: 64 }}>
          Sua Biblioteca
        </Text>
        <IconButton icon="search" iconSize={44} accessibilityLabel="Buscar na biblioteca" />
        <IconButton icon="add" iconSize={52} accessibilityLabel="Criar playlist" />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[4] }}>
        {FILTERS.map((f) => (
          <MusicChip
            key={f.label}
            label={f.label}
            icon={f.icon}
            selected={filter === f.label}
            onPress={() => setFilter((cur) => (cur === f.label ? null : f.label))}
          />
        ))}
      </View>

      <View style={styles.sortRow}>
        <Touchable style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[6] }}>
          <Icon name="swap-vertical" size={38} />
          <Text variant="headline">Recentes</Text>
        </Touchable>
        <IconButton icon="grid" iconSize={40} accessibilityLabel="Ver em grade" />
      </View>

      <ScrollView
        key={filter ?? 'tudo'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[3], paddingBottom: spacing[6] }}
      >
        {rows.length === 0 ? (
          <Appear distance={12} style={styles.empty}>
            <Icon name="calendar-outline" size={72} color={c.textTertiary} />
            <Text variant="title2">Nenhum evento por perto</Text>
            <Text variant="callout" tone="secondary">
              Shows dos artistas que você ouve aparecem aqui.
            </Text>
          </Appear>
        ) : (
          rows.map((r, i) => (
            <Appear key={r.key} delay={i * 35} distance={12}>
              {r.node}
            </Appear>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 36, paddingTop: 28, gap: spacing[5] },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[8] },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing[2],
  },
  artist: { flexDirection: 'row', alignItems: 'center', gap: spacing[8], height: 112 },
  empty: { alignItems: 'center', gap: spacing[3], paddingVertical: 96 },
});
