import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';
import { Animated, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import { COVERS, NOW_PLAYING } from '../mocks/data';
import { usePrototype } from '../prototype/state';
import { Cover, shade } from '../ui/brand';
import { Appear } from '../ui/motion';
import { Avatar, Icon, IconButton, Text, Touchable } from '../ui/primitives';

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
  const { nowPlaying, upNext, playing, togglePlaying, next, previous } = usePrototype();
  const track = nowPlaying ?? NOW_PLAYING;
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
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 80 }}
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
            “{track.album}” na Biblioteca
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
          <View style={styles.track}>
            <View style={styles.trackFill} />
            <View style={styles.thumb} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" color={W2}>
              1:16
            </Text>
            <Text variant="caption" color={W2}>
              -2:26
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <IconButton
            icon="shuffle"
            size={84}
            iconSize={48}
            color={W}
            accessibilityLabel="Aleatório"
          />
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
          <IconButton
            icon="repeat"
            size={84}
            iconSize={48}
            color={W}
            accessibilityLabel="Repetir"
          />
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

        {/* Cartões */}
        <View style={{ gap: 32, marginTop: 24 }}>
          <View
            style={[styles.card, { backgroundColor: '#242424', padding: 0, overflow: 'hidden' }]}
          >
            <View style={{ height: 400 }}>
              <Cover color="#333" image={COVERS.piscina} size={640} height={400} radius={0} />
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
                style={[StyleSheet.absoluteFill, { height: 160 }]}
              />
              <Text variant="headline" color={W} style={styles.overLabel}>
                Sobre o artista
              </Text>
            </View>
            <View style={{ padding: 36, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="title2" color={W} style={{ fontSize: 40, lineHeight: 46 }}>
                    {track.artists.split(',')[0]}
                  </Text>
                  <Text variant="callout" color={W2}>
                    1,2 mi ouvintes mensais
                  </Text>
                </View>
                <OutlinePill label="Seguindo" />
              </View>
              <Text variant="callout" color={W2} numberOfLines={3} style={{ marginTop: 12 }}>
                Artista do funk de São Paulo. As informações do artista aparecem aqui quando
                disponíveis no Spotify.
              </Text>
            </View>
          </View>

          <PlayerCard title="Vídeos relacionados" color="#242424">
            <View style={{ flexDirection: 'row', gap: 24 }}>
              {(
                [
                  ['Donos da Capital', 'MC Kevin e outros', COVERS.donos, '04:12'],
                  ['Piscina de Diamante', 'MC Kevin', COVERS.piscina, '03:13'],
                ] as [string, string, ImageSourcePropType, string][]
              ).map(([t, a, img, d]) => (
                <View key={t} style={{ width: 400, gap: 12 }}>
                  <View>
                    <Cover color="#222" image={img} size={400} height={226} radius={12} />
                    <Text variant="footnote" color={W} style={styles.duration}>
                      {d}
                    </Text>
                  </View>
                  <Text variant="headline" color={W} numberOfLines={1}>
                    {t}
                  </Text>
                  <Text variant="callout" color={W2} numberOfLines={1}>
                    {a}
                  </Text>
                </View>
              ))}
            </View>
          </PlayerCard>

          <PlayerCard title="Artistas na faixa" color={card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                ['MC Kevin', 'Artista principal'],
                ['DJ Nene MPC', 'Artista'],
              ].map(([n, r]) => (
                <View key={n} style={{ alignItems: 'center', gap: 6 }}>
                  {n === 'MC Kevin' ? (
                    <Cover color="#8A7A55" image={COVERS.piscina} size={200} radius={100} />
                  ) : (
                    <Avatar name={n as string} size={200} />
                  )}
                  <Text variant="headline" color={W}>
                    {n}
                  </Text>
                  <Text variant="caption" color={W2}>
                    {r}
                  </Text>
                </View>
              ))}
            </View>
          </PlayerCard>

          <PlayerCard
            title="Próximas"
            color="#242424"
            action={
              <Text variant="headline" color={GREEN}>
                Abrir fila
              </Text>
            }
          >
            {(upNext ? [upNext] : []).map((q) => (
              <View key={q.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
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

          <PlayerCard
            title="Créditos"
            color="#242424"
            action={
              <Text variant="headline" color={GREEN}>
                Mostrar tudo
              </Text>
            }
          >
            {[
              ['MC Kevin', 'Artista principal', 'Seguindo'],
              ['DJ Nene MPC', 'Artista principal', 'Seguir'],
            ].map(([n, r, f]) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" color={W} style={{ fontSize: 30 }}>
                    {n}
                  </Text>
                  <Text variant="callout" color={W2}>
                    {r}
                  </Text>
                </View>
                <OutlinePill label={f as string} />
              </View>
            ))}
          </PlayerCard>

          <PlayerCard title={`Conheça ${track.artists.split(',')[0]}`} color="#242424">
            <View style={{ flexDirection: 'row', gap: 20 }}>
              {(
                [
                  ['Músicas do artista', COVERS.piscina],
                  ['Parecidas', COVERS.donos],
                  [`Parecidas com ${track.title}`, COVERS.ninguem],
                ] as [string, ImageSourcePropType][]
              ).map(([label, img]) => (
                <View key={label} style={{ flex: 1 }}>
                  <Cover
                    color="#222"
                    image={img}
                    size={184}
                    height={300}
                    radius={14}
                    title={label}
                  />
                </View>
              ))}
            </View>
          </PlayerCard>
        </View>
      </Animated.ScrollView>

      {/* Cabeçalho compacto ao rolar */}
      <Animated.View
        pointerEvents={compact ? 'auto' : 'none'}
        style={[styles.compact, { backgroundColor: tint, opacity: compactOpacity }]}
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

function OutlinePill({ label }: { label: string }) {
  return (
    <Touchable accessibilityRole="button" style={styles.pill}>
      <Text variant="headline" color={W}>
        {label}
      </Text>
    </Touchable>
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
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
  },
  trackFill: { width: '34%', height: 8, borderRadius: 4, backgroundColor: W },
  thumb: {
    position: 'absolute',
    left: '34%',
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    backgroundColor: W,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  utility: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
  card: { borderRadius: 28, padding: 36, gap: 20 },
  overLabel: { position: 'absolute', top: 30, left: 36 },
  duration: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  pill: {
    height: 68,
    paddingHorizontal: 32,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
