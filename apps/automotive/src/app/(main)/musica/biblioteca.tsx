import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PLAYLISTS } from '../../../mocks/data';
import { MusicChip, PlaylistTile } from '../../../music/ui';
import { usePlay } from '../../../music/use-play';
import { spacing, useColors } from '../../../theme';
import { Cover } from '../../../ui/brand';
import { Appear } from '../../../ui/motion';
import { Avatar, Icon, IconButton, type IconName, Text, Touchable } from '../../../ui/primitives';

const FILTERS: { label: string; icon: IconName }[] = [
  { label: 'Playlists', icon: 'play' },
  { label: 'Podcasts', icon: 'mic-outline' },
  { label: 'Álbuns', icon: 'disc-outline' },
  { label: 'Artistas', icon: 'person-outline' },
  { label: 'Eventos', icon: 'calendar-outline' },
];

/** Sua Biblioteca — playlists (referência: imagem 5). */
export default function Library() {
  const c = useColors();
  const [filter, setFilter] = useState('Playlists');
  const play = usePlay();

  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <Avatar name="Raul Barbosa" size={84} />
        <Text variant="largeTitle" style={{ flex: 1, fontSize: 56, lineHeight: 64 }}>
          Sua Biblioteca
        </Text>
        <IconButton icon="search" iconSize={44} accessibilityLabel="Buscar na biblioteca" />
        <IconButton icon="add" iconSize={52} accessibilityLabel="Criar playlist" />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[4], paddingLeft: 64 }}>
        {FILTERS.map((f) => (
          <MusicChip
            key={f.label}
            label={f.label}
            icon={f.icon}
            selected={filter === f.label}
            onPress={() => setFilter(f.label)}
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[3], paddingBottom: spacing[6] }}
      >
        {PLAYLISTS.map((p, i) => (
          <Appear key={p.id} delay={i * 40} distance={12}>
            <PlaylistTile
              height={104}
              cover={<Cover color={p.cover} size={150} height={104} radius={0} liked={p.liked} />}
              title={p.name}
              onPress={play}
              subtitle={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <Icon name="pin" size={24} color={c.music.accent} />
                  <Text variant="callout" tone="secondary" numberOfLines={1}>
                    {p.kind} • {p.owner}
                  </Text>
                </View>
              }
            />
          </Appear>
        ))}
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
});
