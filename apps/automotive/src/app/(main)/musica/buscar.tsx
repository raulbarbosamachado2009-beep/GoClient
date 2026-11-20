import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { usePhone } from '../../../layout/form-factor';
import { BROWSE, SHOWS } from '../../../mocks/data';
import { useTrackSearch } from '../../../music/library';
import { PhoneSearch } from '../../../music/phone';
import { MusicBack, MusicSection } from '../../../music/ui';
import { usePlay } from '../../../music/use-play';
import { useSpotifyLive } from '../../../spotify/provider';
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
function CarSearch() {
  const c = useColors();
  const play = usePlay();
  const live = useSpotifyLive();
  const [query, setQuery] = useState('');
  const search = useTrackSearch(query);
  const ids = search.results.map((t) => t.id);
  const searching = query.trim() !== '';
  const phone = usePhone();
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <MusicBack to="/musica" />
        <Text variant="largeTitle" style={{ flex: 1, fontSize: 56, lineHeight: 64 }}>
          Buscar
        </Text>
        <IconButton icon="camera-outline" iconSize={46} accessibilityLabel="Buscar por câmera" />
      </View>

      <SearchField
        compact
        placeholder="O que você quer ouvir?"
        background={c.music.search}
        foreground={c.music.onSearch}
        style={{ height: 84, borderRadius: 14 }}
        value={query}
        onChangeText={setQuery}
      />

      {searching && (
        <View style={{ gap: spacing[2] }}>
          {search.loading && <ActivityIndicator size="large" color={c.music.accent} />}
          {!search.loading && search.results.length === 0 && (
            <Text variant="headline" tone="secondary">
              Nada encontrado para “{query.trim()}”.
            </Text>
          )}
          {search.results.map((t) => (
            <Touchable
              key={t.id}
              accessibilityRole="button"
              onPress={() => play(t.id, ids, undefined, t)}
              scaleTo={0.985}
              style={styles.result}
            >
              <Cover color={t.cover} image={t.image} size={96} radius={6} />
              <View style={{ flex: 1 }}>
                <Text variant="body" numberOfLines={1} style={{ fontSize: 32, lineHeight: 38 }}>
                  {t.title}
                </Text>
                <Text variant="body" tone="secondary" numberOfLines={1}>
                  {t.artists}
                </Text>
              </View>
            </Touchable>
          ))}
        </View>
      )}

      {/* Categorias e sugestões são só da demonstração (o Spotify removeu esses dados da API). */}
      {!live && !searching && (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: phone ? spacing[4] : spacing[6],
            }}
          >
            {BROWSE.map((b, i) => (
              <Appear
                key={b.id}
                delay={i * 50}
                distance={12}
                style={phone ? { width: '48.4%' } : { flex: 1 }}
              >
                <Touchable
                  accessibilityRole="button"
                  style={[styles.tile, { backgroundColor: b.color }]}
                >
                  <Text variant="title2" color="#FFFFFF" style={{ fontSize: 34, lineHeight: 40 }}>
                    {b.name}
                  </Text>
                  <View style={[styles.tileArt, { backgroundColor: shade(b.color, 0.3) }]}>
                    {b.image && (
                      <Image source={b.image} style={{ width: '100%', height: '100%' }} />
                    )}
                  </View>
                </Touchable>
              </Appear>
            ))}
          </View>

          <MusicSection title="Playlists que você pode assistir" />
          <Strip phone={phone} gap={spacing[6]}>
            {WATCH.map((w, i) => (
              <Appear
                key={w.id}
                delay={200 + i * 60}
                distance={14}
                style={phone ? undefined : { flex: 1 }}
              >
                <Touchable accessibilityRole="button" onPress={() => play()} scaleTo={0.97}>
                  <Cover color={w.cover} size={460} height={250} radius={18} title={w.name} />
                </Touchable>
              </Appear>
            ))}
          </Strip>

          <MusicSection title="Descubra episódios pra você" />
          <Strip phone={phone} gap={spacing[5]}>
            {SHOWS.map((s) => (
              <Touchable
                key={s.id}
                accessibilityRole="button"
                onPress={() => play()}
                scaleTo={0.97}
                style={phone ? undefined : { flex: 1 }}
              >
                <Cover color={s.cover} size={338} height={190} radius={14} title={s.name} />
              </Touchable>
            ))}
          </Strip>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 32, gap: spacing[6] },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[8] },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing[8], paddingVertical: 4 },
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

/** Fileira de capas: no celular rola para o lado em vez de dividir a largura. */
function Strip({ phone, gap, children }: { phone: boolean; gap: number; children: ReactNode }) {
  if (!phone) return <View style={{ flexDirection: 'row', gap }}>{children}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -32 }}
      contentContainerStyle={{ gap, paddingHorizontal: 32 }}
    >
      {children}
    </ScrollView>
  );
}

/** Celular em pé: versão no estilo do app do Spotify; multimídia: a de cima. */
export default function Screen() {
  return usePhone() ? <PhoneSearch /> : <CarSearch />;
}
