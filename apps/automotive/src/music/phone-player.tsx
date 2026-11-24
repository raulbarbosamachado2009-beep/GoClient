import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSystemInsets } from '../layout/form-factor';
import { usePrototype } from '../prototype/state';
import { Cover, shade } from '../ui/brand';
import { Appear } from '../ui/motion';
import { Icon, IconButton, Text } from '../ui/primitives';
import { useNowPlaying, useTrackArtists } from './now-playing';
import { ProgressBar, RepeatButton, ShuffleButton } from './player-parts';

const W = '#FFFFFF';
const W2 = 'rgba(255,255,255,0.7)';
const GREEN = '#1ED760';
const PAD = 40;

/**
 * Player completo no celular em pé (referência: Spotify no iPhone): fundo na cor da capa,
 * capa grande, título, progresso e controles; rolando, cartões (artista, vídeos, próximas,
 * créditos, "Conheça") e um cabeçalho compacto na cor da capa.
 */
export function PhonePlayer() {
  const router = useRouter();
  const { togglePlaying, next, previous } = usePrototype();
  // Faixa, fila, artistas e progresso vêm todos do mesmo estado (sempre a música tocando).
  const np = useNowPlaying();
  const { track, playing, queue } = np;
  const artists = useTrackArtists(np);
  const lead = artists[0];
  const system = useSystemInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [compact, setCompact] = useState(false);
  const tint = track.tint;
  const top = shade(tint, 0.18);
  const card = shade(tint, -0.25);
  const minimize = () => (router.canGoBack() ? router.back() : router.replace('/musica'));
  const compactOpacity = scrollY.interpolate({
    inputRange: [900, 1000],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <LinearGradient
        colors={[top, tint, shade(tint, -0.45), '#121212']}
        locations={[0, 0.35, 0.62, 0.9]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.ScrollView
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: (e: { nativeEvent: { contentOffset: { y: number } } }) =>
            setCompact(e.nativeEvent.contentOffset.y > 950),
        })}
        contentContainerStyle={{
          paddingHorizontal: PAD,
          paddingTop: system.top,
          paddingBottom: 80 + system.bottom,
        }}
      >
        <View style={styles.topBar}>
          <IconButton
            icon="chevron-down"
            iconSize={52}
            color={W}
            accessibilityLabel="Minimizar player"
            onPress={minimize}
          />
          <Text variant="headline" color={W} numberOfLines={1} style={styles.context}>
            {np.source}
          </Text>
          <IconButton
            icon="ellipsis-horizontal"
            iconSize={44}
            color={W}
            accessibilityLabel="Mais opções"
          />
        </View>

        <Appear key={`art-${track.id}`} distance={16} duration={420} style={styles.art}>
          <Cover color={track.cover} image={track.image} size={640} radius={12} />
        </Appear>

        <View style={styles.titleRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="largeTitle" color={W} numberOfLines={1} style={styles.title}>
              {track.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {track.explicit && (
                <View style={styles.explicit}>
                  <Text variant="footnote" color="#000" style={{ fontSize: 18, lineHeight: 22 }}>
                    E
                  </Text>
                </View>
              )}
              <Text variant="body" color={W2} numberOfLines={1} style={{ flex: 1, fontSize: 30 }}>
                {track.artists}
              </Text>
            </View>
          </View>
          <Icon name="checkmark-circle" size={72} color={GREEN} />
        </View>

        <View style={styles.progress}>
          <ProgressBar np={np} height={8} thumb={24} labelColor={W2} labelVariant="caption" />
        </View>

        <View style={styles.controls}>
          <ShuffleButton np={np} size={84} iconSize={48} />
          <IconButton
            icon="play-skip-back"
            size={96}
            iconSize={64}
            color={W}
            accessibilityLabel="Anterior"
            onPress={previous}
          />
          <IconButton
            icon={playing ? 'pause' : 'play'}
            size={136}
            iconSize={64}
            color="#000"
            style={{ backgroundColor: W }}
            accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
            onPress={togglePlaying}
          />
          <IconButton
            icon="play-skip-forward"
            size={96}
            iconSize={64}
            color={W}
            accessibilityLabel="Próxima"
            onPress={next}
          />
          <RepeatButton np={np} size={84} iconSize={48} />
        </View>

        <View style={styles.utility}>
          <IconButton
            icon="phone-portrait-outline"
            iconSize={40}
            color={W}
            accessibilityLabel="Dispositivos"
          />
          <View style={{ flex: 1 }} />
          <IconButton
            icon="share-outline"
            iconSize={40}
            color={W}
            accessibilityLabel="Compartilhar"
          />
          <IconButton icon="list" iconSize={42} color={W} accessibilityLabel="Fila" />
        </View>

        {/* Cartões: só dados reais da faixa tocando (vídeos, ouvintes mensais e "Conheça"
            não existem na API do Spotify para este app). */}
        <View style={{ gap: 32, marginTop: 24 }}>
          {lead && (
            <View
              style={[styles.card, { backgroundColor: '#242424', padding: 0, overflow: 'hidden' }]}
            >
              <View style={{ height: 400 }}>
                <Cover color={track.cover} image={lead.image} size={640} height={400} radius={0} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
                  style={[StyleSheet.absoluteFill, { height: 160 }]}
                />
                <Text variant="headline" color={W} style={styles.overLabel}>
                  Sobre o artista
                </Text>
              </View>
              <View style={{ padding: 36, gap: 8 }}>
                <Text variant="title2" color={W} style={{ fontSize: 40, lineHeight: 46 }}>
                  {lead.name}
                </Text>
                {lead.genres.length > 0 && (
                  <Text variant="callout" color={W2} numberOfLines={2}>
                    {lead.genres.slice(0, 3).join(' • ')}
                  </Text>
                )}
              </View>
            </View>
          )}

          <PlayerCard title="Artistas na faixa" color={card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {artists.slice(0, 3).map((a) => (
                <View key={a.name} style={{ alignItems: 'center', gap: 6, maxWidth: 220 }}>
                  <Cover color={track.cover} image={a.image} size={200} radius={100} />
                  <Text variant="headline" color={W} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text variant="caption" color={W2}>
                    {a.role}
                  </Text>
                </View>
              ))}
            </View>
          </PlayerCard>

          <PlayerCard title="Próximas" color="#242424">
            {queue.length === 0 && (
              <Text variant="callout" color={W2}>
                A fila aparece aqui assim que o Spotify informar.
              </Text>
            )}
            {queue.slice(0, 4).map((q, i) => (
              <View
                // biome-ignore lint/suspicious/noArrayIndexKey: a fila pode repetir a mesma faixa
                key={`${q.id}-${i}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}
              >
                <Cover color={q.cover} image={q.image} size={112} radius={6} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" color={W} numberOfLines={1} style={{ fontSize: 30 }}>
                    {q.title}
                  </Text>
                  <Text variant="callout" color={W2} numberOfLines={1}>
                    {q.artists}
                  </Text>
                </View>
              </View>
            ))}
          </PlayerCard>

          <PlayerCard title="Créditos" color="#242424">
            {[...artists.map((a) => [a.name, a.role]), [track.album, 'Álbum']].map(([n, r]) => (
              <View
                key={`${n}-${r}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
              >
                <Text variant="body" color={W} numberOfLines={1} style={{ flex: 1, fontSize: 30 }}>
                  {n}
                </Text>
                <Text variant="callout" color={W2}>
                  {r}
                </Text>
              </View>
            ))}
          </PlayerCard>
        </View>
      </Animated.ScrollView>

      {/* Cabeçalho compacto ao rolar */}
      <Animated.View
        pointerEvents={compact ? 'auto' : 'none'}
        style={[
          styles.compact,
          {
            backgroundColor: tint,
            opacity: compactOpacity,
            paddingTop: system.top,
            height: 132 + system.top,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text variant="headline" color={W} numberOfLines={1}>
            {track.title}
          </Text>
          <Text variant="callout" color={W2} numberOfLines={1}>
            {track.artists}
          </Text>
        </View>
        <Icon name="checkmark-circle" size={52} color={GREEN} />
        <IconButton
          icon={playing ? 'pause' : 'play'}
          iconSize={48}
          color={W}
          accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
          onPress={togglePlaying}
        />
      </Animated.View>
    </View>
  );
}

function PlayerCard({
  title,
  action,
  color,
  children,
}: {
  title: string;
  action?: ReactNode;
  color: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: color }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text variant="title2" color={W} style={{ flex: 1, fontSize: 34 }}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 24, gap: 8 },
  context: { flex: 1, textAlign: 'center', fontSize: 26 },
  art: {
    marginTop: 44,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 72 },
  title: { fontSize: 50, lineHeight: 58, letterSpacing: -0.5 },
  explicit: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { marginTop: 40, gap: 12 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  utility: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
  card: { borderRadius: 28, padding: 36, gap: 20 },
  overLabel: { position: 'absolute', top: 30, left: 36 },
  compact: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: PAD,
  },
});
