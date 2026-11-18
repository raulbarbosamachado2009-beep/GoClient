import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PLAYLISTS, SHOWS } from '../../../mocks/data';
import { usePlay } from '../../../music/use-play';
import { colors, spacing } from '../../../theme';
import { Artwork } from '../../../ui/brand';
import { Avatar, Chip, Icon, IconButton, Text, Touchable } from '../../../ui/primitives';

const FILTERS = [
  { label: 'Tudo' },
  { label: 'Músicas', icon: 'musical-note' as const },
  { label: 'Podcasts', icon: 'mic-outline' as const },
  { label: 'Audiolivros', icon: 'headset-outline' as const },
];

/** Início da música (referência: imagem 3). */
export default function MusicHome() {
  const [filter, setFilter] = useState('Tudo');
  const play = usePlay();
  const quick = PLAYLISTS.slice(0, 6);

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.top}>
        <Avatar name="Raul Barbosa" size={76} />
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

      <View style={styles.grid}>
        {quick.map((p) => (
          <Touchable key={p.id} accessibilityRole="button" onPress={play} style={styles.quick}>
            <Artwork color={p.cover} size={96} radius={0} liked={p.liked} />
            <Text variant="headline" numberOfLines={1} style={{ flex: 1 }}>
              {p.name}
            </Text>
            <Icon name="chevron-forward" size={30} color={colors.textSecondary} />
          </Touchable>
        ))}
      </View>

      <View style={styles.release}>
        <Avatar name="Lua Ventura" size={120} color="#7A2E3A" />
        <View style={{ width: 380 }}>
          <Text variant="callout" tone="secondary">
            Novo lançamento de
          </Text>
          <Text variant="display" numberOfLines={1} style={{ fontSize: 52 }}>
            Lua Ventura
          </Text>
        </View>
        <Artwork color="#B5652B" size={136} radius={8} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="callout" tone="secondary">
            Single
          </Text>
          <Text variant="headline">Poeira e Sol</Text>
          <Text variant="callout" tone="secondary" numberOfLines={1}>
            Lua Ventura, Os Marés
          </Text>
        </View>
        <IconButton
          icon="play"
          variant="inverse"
          size={88}
          iconSize={42}
          accessibilityLabel="Tocar"
          onPress={play}
        />
        <View style={styles.vline} />
        <IconButton icon="ellipsis-horizontal" variant="plain" accessibilityLabel="Mais opções" />
      </View>

      <View style={styles.sectionHead}>
        <Text variant="title" style={{ fontSize: 34 }}>
          Seus programas
        </Text>
        <Touchable style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="callout" tone="secondary">
            Ver mais
          </Text>
          <Icon name="chevron-forward" size={24} color={colors.textSecondary} />
        </Touchable>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing[5] }}>
        {SHOWS.map((s) => (
          <Touchable
            key={s.id}
            accessibilityRole="button"
            onPress={play}
            style={{ flex: 1, gap: spacing[3] }}
          >
            <Artwork color={s.cover} size={318} height={200} radius={20} label={s.name} />
          </Touchable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingTop: 32, paddingBottom: 40, gap: spacing[6] },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  quick: {
    width: '49.2%',
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#2A2A2D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    paddingRight: spacing[5],
  },
  release: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    padding: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 24,
    backgroundColor: '#1E1E21',
    borderWidth: 1,
    borderColor: '#333336',
  },
  vline: { width: 1, height: 64, backgroundColor: '#3A3A3C' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
});
