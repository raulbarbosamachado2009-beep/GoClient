import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { NO_FLEX, usePhone } from '../layout/form-factor';
import { useNowPlaying, useTrackArtists } from '../music/now-playing';
import { PhonePlayer } from '../music/phone-player';
import { ProgressBar, RepeatButton, ShuffleButton } from '../music/player-parts';
import { usePrototype } from '../prototype/state';
import { layout, spacing } from '../theme';
import { Cover } from '../ui/brand';
import { Appear } from '../ui/motion';
import { Icon, IconButton, SpotifyFontScope, Text, Touchable } from '../ui/primitives';

const W = '#FFFFFF';
const W2 = 'rgba(255,255,255,0.72)';
const W3 = 'rgba(255,255,255,0.5)';
const GREEN = '#1ED760';
/** Raio da capa grande (como os cantos dos painéis do carro). */
const ART_R = 28;

/**
 * Player em tela cheia (referências: imagens 4 e 6). Rolando para baixo aparecem mais
 * informações e um cabeçalho compacto fixo. A seta para baixo minimiza o player para o
 * rodapé da Música (imagem 8).
 */
function CarPlayer() {
  const router = useRouter();
  const { togglePlaying, next, previous } = usePrototype();
  // Faixa, fila, artistas e progresso vêm todos do mesmo estado (sempre a música tocando).
  const np = useNowPlaying();
  const { track, playing, queue } = np;
  const artists = useTrackArtists(np);
  const lead = artists[0];
  // Celular em pé: capa em cima, informações e controles embaixo (como no app do Spotify).
  const phone = usePhone();
  const [compactVisible, setCompactVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const minimize = () => (router.canGoBack() ? router.back() : router.replace('/musica'));
  const compactOpacity = scrollY.interpolate({
    inputRange: [560, 680],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const heroFade = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', overflow: 'hidden' }}>
      {/* Fundo = a própria capa, ampliada e com desfoque forte (como no player da Apple). */}
      <Appear key={`bg-${track.id}`} distance={0} duration={600} style={StyleSheet.absoluteFill}>
        <Image
          source={track.backdrop}
          blurRadius={track.backdropBlur}
          resizeMode="cover"
          style={[styles.backdrop, { transform: [{ scale: 1.25 }] }]}
        />
      </Appear>
      {/* Véu cinza por cima do desfoque: o fundo fica neutro, qualquer que seja a capa. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(58,58,62,0.62)' }]} />

      <Animated.ScrollView
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: (e: { nativeEvent: { contentOffset: { y: number } } }) =>
            setCompactVisible(e.nativeEvent.contentOffset.y > 620),
        })}
      >
        {/* Tela "Tocando agora" no estilo de painel de carro: informações e controles
            centrados à esquerda, capa grande à direita, fundo cinza desfocado. */}
        <Animated.View style={[styles.hero, { opacity: heroFade }]}>
          <View style={styles.topBar}>
            <IconButton
              icon="chevron-back"
              size={96}
              iconSize={56}
              color={W}
              accessibilityLabel="Voltar"
              onPress={minimize}
            />
            <Text variant="callout" color={W2} numberOfLines={1} style={styles.source}>
              {np.source}
            </Text>
          </View>

          <View style={styles.main}>
            <Appear key={`info-${track.id}`} delay={80} distance={16} style={styles.info}>
              <View style={styles.titleRow}>
                <Text variant="largeTitle" color={W} numberOfLines={1} style={styles.title}>
                  {track.title}
                </Text>
                {track.explicit && (
                  <View style={styles.explicit}>
                    <Text variant="caption" color="#000" style={styles.explicitText}>
                      E
                    </Text>
                  </View>
                )}
              </View>
              <Text variant="body" color={W2} numberOfLines={1} style={styles.artist}>
                {track.artists}
              </Text>
              <Text variant="body" color={W3} numberOfLines={1} style={styles.album}>
                {track.album}
              </Text>

              <View style={styles.controls}>
                <IconButton
                  icon="play-back"
                  size={140}
                  iconSize={76}
                  color={W}
                  accessibilityLabel="Anterior"
                  onPress={previous}
                />
                <Touchable
                  accessibilityRole="button"
                  accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
                  onPress={togglePlaying}
                  scaleTo={0.94}
                  style={styles.playPill}
                >
                  <Icon name={playing ? 'pause' : 'play'} size={76} color={W} />
                </Touchable>
                <IconButton
                  icon="play-forward"
                  size={140}
                  iconSize={76}
                  color={W}
                  accessibilityLabel="Próxima"
                  onPress={next}
                />
              </View>

              <View style={styles.progress}>
                <ProgressBar np={np} height={10} thumb={0} labelColor={W2} />
              </View>

              <View style={styles.extras}>
                <ShuffleButton np={np} size={88} iconSize={44} />
                <RepeatButton np={np} size={88} iconSize={44} />
                <IconButton
                  icon="checkmark-circle"
                  size={88}
                  iconSize={46}
                  color={GREEN}
                  accessibilityLabel="Nas suas Curtidas"
                />
                <IconButton
                  icon="ellipsis-horizontal"
                  size={88}
                  iconSize={44}
                  color={W}
                  accessibilityLabel="Mais opções"
                />
              </View>
            </Appear>

            <Appear key={`art-${track.id}`} axis="x" distance={30} duration={420}>
              <View style={styles.artShadow}>
                <Cover color={track.cover} image={track.image} size={680} radius={ART_R} />
              </View>
            </Appear>
          </View>
        </Animated.View>

        {/* Parte de baixo (imagem 6): só dados reais da faixa tocando. Vídeos, ouvintes
            mensais e "Conheça" não existem na API do Spotify para este app, então saíram. */}
        <View style={[styles.more, phone && { paddingHorizontal: 32 }]}>
          <View style={[styles.row, phone && { flexDirection: 'column' }]}>
            {lead && (
              <Card style={styles.artistCard}>
                {/* A foto preenche a metade esquerda inteira; o degradê mantém o título legível. */}
                <View style={styles.artistPhoto}>
                  <Image source={lead.image} resizeMode="cover" style={styles.fill} />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
                    style={[styles.fill, { height: 150 }]}
                  />
                  <Text variant="headline" color={W} style={styles.cardLabel}>
                    Sobre o artista
                  </Text>
                </View>
                <View style={styles.artistInfo}>
                  <Text variant="title2" color={W} numberOfLines={2}>
                    {lead.name}
                  </Text>
                  {lead.genres.length > 0 && (
                    <Text variant="callout" color={W2} numberOfLines={2}>
                      {lead.genres.slice(0, 3).join(' • ')}
                    </Text>
                  )}
                </View>
              </Card>
            )}
            <Card style={{ flex: 1 }} title="Artistas na faixa">
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {artists.slice(0, 3).map((a) => (
                  <View key={a.name} style={{ alignItems: 'center', gap: 4, maxWidth: 220 }}>
                    <Cover color={track.cover} image={a.image} size={128} radius={64} />
                    <Text variant="bodyStrong" color={W} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text variant="caption" color={W2}>
                      {a.role}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>

          <View style={[styles.row, phone && { flexDirection: 'column' }]}>
            <Card style={{ flex: 1 }} title="Próximas">
              {queue.length === 0 && (
                <Text variant="callout" color={W2}>
                  A fila aparece aqui assim que o Spotify informar.
                </Text>
              )}
              {queue.slice(0, 4).map((q, i) => (
                <View
                  // biome-ignore lint/suspicious/noArrayIndexKey: a fila pode repetir a mesma faixa
                  key={`${q.id}-${i}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}
                >
                  <Cover color={q.cover} image={q.image} size={96} radius={8} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" color={W} numberOfLines={1}>
                      {q.title}
                    </Text>
                    <Text variant="caption" color={W2} numberOfLines={1}>
                      {q.artists}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
            <Card style={{ flex: 1 }} title="Créditos">
              {artists.map((a) => (
                <View key={a.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text variant="bodyStrong" color={W} numberOfLines={1} style={{ flex: 1 }}>
                    {a.name}
                  </Text>
                  <Text variant="callout" color={W2}>
                    {a.role}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="bodyStrong" color={W} numberOfLines={1} style={{ flex: 1 }}>
                  {track.album}
                </Text>
                <Text variant="callout" color={W2}>
                  Álbum
                </Text>
              </View>
            </Card>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Cabeçalho compacto (imagem 6) */}
      <Animated.View
        pointerEvents={compactVisible ? 'auto' : 'none'}
        style={[styles.compact, { opacity: compactOpacity }]}
      >
        <Image
          source={track.backdrop}
          blurRadius={track.backdropBlur}
          resizeMode="cover"
          style={[styles.backdrop, { transform: [{ scale: 1.25 }] }]}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        <IconButton
          icon="chevron-down"
          iconSize={48}
          color={W}
          accessibilityLabel="Minimizar player"
          onPress={minimize}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" color={W} numberOfLines={1}>
            {track.title}
          </Text>
          <Text variant="caption" color={W2} numberOfLines={1}>
            {track.artists}
          </Text>
          <View style={{ marginTop: spacing[3], marginRight: spacing[10] }}>
            <ProgressBar np={np} height={4} thumb={0} labelColor={W2} showLabels={false} />
          </View>
        </View>
        <Icon name="checkmark-circle" size={52} color={GREEN} />
        <IconButton
          icon={playing ? 'pause' : 'play'}
          iconSize={56}
          color={W}
          accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
          onPress={togglePlaying}
        />
      </Animated.View>
    </View>
  );
}

function Card({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: object;
}) {
  const phone = usePhone();
  return (
    <View style={[styles.card, style, phone && NO_FLEX]}>
      {title && (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text variant="title2" color={W}>
            {title}
          </Text>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  artistCard: { flex: 2, height: 300, padding: 0, flexDirection: 'row', overflow: 'hidden' },
  artistPhoto: { flex: 1, overflow: 'hidden' },
  artistInfo: { flex: 1, padding: spacing[8], justifyContent: 'center', gap: spacing[2] },
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  backdrop: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hero: { height: layout.height, paddingHorizontal: 56, paddingTop: 24, paddingBottom: 56 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  source: { flexShrink: 1 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 64 },
  info: { flex: 1, alignItems: 'center', gap: spacing[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], maxWidth: '100%' },
  title: { fontSize: 52, lineHeight: 60, letterSpacing: -0.6, flexShrink: 1 },
  artist: { fontSize: 34, lineHeight: 42, textAlign: 'center' },
  album: { fontSize: 30, lineHeight: 38, textAlign: 'center' },
  explicit: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicitText: { fontSize: 20, lineHeight: 24, fontWeight: '700' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    marginTop: spacing[10],
  },
  playPill: {
    width: 220,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { alignSelf: 'stretch', marginTop: spacing[10], paddingHorizontal: spacing[4] },
  extras: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[10],
    marginTop: spacing[4],
  },
  artShadow: {
    borderRadius: ART_R,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 24 },
  },
  more: { paddingHorizontal: 56, paddingBottom: 64, gap: spacing[6] },
  row: { flexDirection: 'row', gap: spacing[6] },
  card: {
    backgroundColor: 'rgba(28,28,30,0.78)',
    borderRadius: 28,
    padding: spacing[6],
    gap: spacing[5],
  },
  cardLabel: { position: 'absolute', top: spacing[5], left: spacing[6] },
  compact: {
    backgroundColor: '#101014',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    paddingHorizontal: 40,
    overflow: 'hidden',
  },
});

/** Celular em pé: versão no estilo do app do Spotify; multimídia: a de cima. */
export default function Screen() {
  return <SpotifyFontScope>{usePhone() ? <PhonePlayer /> : <CarPlayer />}</SpotifyFontScope>;
}
