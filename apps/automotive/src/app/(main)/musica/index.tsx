import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { COVERS, PLAYLISTS, SHOWS } from '../../../mocks/data';
import { MusicChip, MusicSection, PlaylistTile } from '../../../music/ui';
import { usePlay } from '../../../music/use-play';
import { spacing, useColors } from '../../../theme';
import { Cover } from '../../../ui/brand';
import { Appear } from '../../../ui/motion';
import { Avatar, IconButton, Text, Touchable } from '../../../ui/primitives';

/** Início da Música (referência: imagem 3). */
export default function MusicHome() {
  const c = useColors();
  const [filter, setFilter] = useState('Tudo');
  const play = usePlay();

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.top}>
        <Avatar name="Raul Barbosa" size={84} />
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
      </View>

      <View style={styles.grid}>
        {PLAYLISTS.slice(0, 6).map((p, i) => (
          <Appear key={p.id} delay={i * 40} distance={12} style={{ width: '49.3%' }}>
            <PlaylistTile
              cover={
                <Cover color={p.cover} image={p.image} size={104} radius={0} liked={p.liked} />
              }
              title={p.name}
              onPress={play}
            />
          </Appear>
        ))}
      </View>

      <Appear delay={260} distance={14}>
        <View
          style={[
            styles.release,
            { backgroundColor: c.music.card, borderColor: c.music.cardBorder },
          ]}
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
            onPress={play}
          />
          <View style={[styles.vline, { backgroundColor: c.music.cardBorder }]} />
          <IconButton icon="ellipsis-horizontal" iconSize={40} accessibilityLabel="Mais opções" />
        </View>
      </Appear>

      <MusicSection title="Seus programas" action="Ver mais" />
      <View style={{ flexDirection: 'row', gap: spacing[5] }}>
        {SHOWS.map((s, i) => (
          <Appear key={s.id} delay={320 + i * 50} distance={14} style={{ flex: 1 }}>
            <Touchable accessibilityRole="button" onPress={play} scaleTo={0.97}>
              <Cover color={s.cover} size={338} height={190} radius={14} title={s.name} />
            </Touchable>
          </Appear>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 36, paddingTop: 28, paddingBottom: 32, gap: spacing[6] },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
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
});
