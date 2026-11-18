import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { PLAYLISTS } from '../../../mocks/data';
import { usePlay } from '../../../music/use-play';
import { colors, spacing } from '../../../theme';
import { Artwork } from '../../../ui/brand';
import {
  Avatar,
  Chip,
  Icon,
  IconButton,
  type IconName,
  Text,
  Touchable,
} from '../../../ui/primitives';

const FILTERS: { label: string; icon: IconName }[] = [
  { label: 'Playlists', icon: 'play' },
  { label: 'Podcasts', icon: 'mic-outline' },
  { label: 'Álbuns', icon: 'disc-outline' },
  { label: 'Artistas', icon: 'person-outline' },
];

/** Sua Biblioteca — playlists (referência: imagem 5). */
export default function Library() {
  const [filter, setFilter] = useState('Playlists');
  const play = usePlay();

  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <Avatar name="Raul Barbosa" size={76} />
        <Text variant="display" style={{ flex: 1, fontSize: 48 }}>
          Sua Biblioteca
        </Text>
        <IconButton
          icon="search"
          variant="plain"
          iconSize={38}
          accessibilityLabel="Buscar na biblioteca"
        />
        <IconButton icon="add" variant="plain" iconSize={44} accessibilityLabel="Criar playlist" />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        {FILTERS.map((f) => (
          <Chip
            key={f.label}
            label={f.label}
            icon={f.icon}
            selected={filter === f.label}
            accent={colors.music.accent}
            onAccent={colors.music.onAccent}
            onPress={() => setFilter(f.label)}
          />
        ))}
      </View>

      <View style={styles.sortRow}>
        <Touchable style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <Icon name="swap-vertical" size={30} color={colors.text} />
          <Text variant="bodyStrong">Recentes</Text>
        </Touchable>
        <IconButton icon="grid-outline" variant="plain" accessibilityLabel="Ver em grade" />
      </View>

      <FlatList
        data={PLAYLISTS}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: spacing[2], paddingBottom: spacing[6] }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Touchable accessibilityRole="button" onPress={play} style={styles.row}>
            <Artwork color={item.cover} size={96} radius={0} liked={item.liked} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline" numberOfLines={1}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <Icon name="pin" size={20} color={colors.music.accent} />
                <Text variant="callout" tone="secondary" numberOfLines={1}>
                  {item.kind} • {item.owner}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={30} color={colors.textSecondary} />
          </Touchable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 40, paddingTop: 32, gap: spacing[5] },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    paddingRight: spacing[5],
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E1E21',
  },
});
