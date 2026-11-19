import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';
import { Animated, Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import { COVERS, NOW_PLAYING } from '../mocks/data';
import { usePrototype } from '../prototype/state';
import { layout, spacing } from '../theme';
import { Cover } from '../ui/brand';
import { Appear } from '../ui/motion';
import { Avatar, Icon, IconButton, Text, Touchable } from '../ui/primitives';

const W = '#FFFFFF';
const W2 = 'rgba(255,255,255,0.72)';
const GREEN = '#1ED760';

/**
 * Player em tela cheia (referências: imagens 4 e 6). Rolando para baixo aparecem mais
 * informações e um cabeçalho compacto fixo. A seta para baixo minimiza o player para o
 * rodapé da Música (imagem 8).
 */
export default function Player() {
  const router = useRouter();
  const { nowPlaying, upNext, playing, togglePlaying, next, previous } = usePrototype();
  const track = nowPlaying ?? NOW_PLAYING;
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
          source={track.image}
          blurRadius={60}
          resizeMode="cover"
          style={[styles.backdrop, { transform: [{ scale: 1.25 }] }]}
        />
      </Appear>
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.6)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.ScrollView
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: (e: { nativeEvent: { contentOffset: { y: number } } }) =>
            setCompactVisible(e.nativeEvent.contentOffset.y > 620),
        })}
      >
        <Animated.View style={[styles.hero, { opacity: heroFade }]}>
          <View style={styles.topBar}>
            <IconButton
              icon="chevron-down"
              iconSize={52}
              color={W}
              accessibilityLabel="Minimizar player"
              onPress={minimize}
            />
            <Text variant="headline" color={W}>
              “{track.album}” na Biblioteca
            </Text>
            <IconButton
              icon="ellipsis-horizontal"
              iconSize={44}
              color={W}
              accessibilityLabel="Mais opções"
            />
          </View>

          <View style={styles.main}>
            <Appear key={`art-${track.id}`} axis="x" distance={30} duration={420}>
              <View style={styles.artShadow}>
                <Cover color={track.cover} image={track.image} size={600} radius={20} />
              </View>
            </Appear>

            <Appear
              key={`info-${track.id}`}
              delay={80}
              distance={16}
              style={{ flex: 1, gap: spacing[10] }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
                <View style={{ flex: 1, gap: spacing[2] }}>
                  <Text
                    variant="largeTitle"
                    color={W}
                    style={{ fontSize: 76, lineHeight: 84, letterSpacing: -1 }}
                    numberOfLines={2}
                  >
                    {track.title}
                  </Text>
                  <Text variant="title2" color={W2} numberOfLines={1}>
                    {track.artists}
                  </Text>
                </View>
                <Icon name="checkmark-circle" size={84} color={GREEN} />
              </View>

              <View style={{ gap: spacing[3] }}>
                <View style={styles.track}>
                  <View style={styles.trackFill} />
                  <View style={styles.thumb} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="callout" color={W2}>
                    1:16
                  </Text>
                  <Text variant="callout" color={W2}>
                    -2:26
                  </Text>
                </View>
              </View>

              <View style={styles.controls}>
                <IconButton
                  icon="shuffle"
                  size={96}
                  iconSize={54}
                  color={W}
                  accessibilityLabel="Aleatório"
                />
                <IconButton
                  icon="play-skip-back"
                  size={110}
                  iconSize={68}
                  color={W}
                  accessibilityLabel="Anterior"
                  onPress={previous}
                />
                <IconButton
                  icon={playing ? 'pause' : 'play'}
                  variant="inverse"
                  size={168}
                  iconSize={80}
                  color="#000"
                  style={{ backgroundColor: W }}
                  accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
                  onPress={togglePlaying}
                />
                <IconButton
                  icon="play-skip-forward"
                  size={110}
                  iconSize={68}
                  color={W}
                  accessibilityLabel="Próxima"
                  onPress={next}
                />
                <IconButton
                  icon="repeat"
                  size={96}
                  iconSize={54}
                  color={W}
                  accessibilityLabel="Repetir"
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[6] }}>
                <IconButton
                  icon="phone-portrait-outline"
                  iconSize={40}
                  color={W}
                  accessibilityLabel="Dispositivos"
                />
                <IconButton
                  icon="share-outline"
                  iconSize={40}
                  color={W}
                  accessibilityLabel="Compartilhar"
                />
                <IconButton icon="list" iconSize={44} color={W} accessibilityLabel="Fila" />
              </View>
            </Appear>
          </View>
        </Animated.View>

        {/* Parte de baixo (imagem 6) */}
        <View style={styles.more}>
          <View style={styles.row}>
            <Card style={styles.artistCard}>
              {/* A foto preenche a metade esquerda inteira; o degradê mantém o título legível. */}
              <View style={styles.artistPhoto}>
                <Image source={COVERS.piscina} resizeMode="cover" style={styles.fill} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
                  style={[styles.fill, { height: 150 }]}
                />
                <Text variant="headline" color={W} style={styles.cardLabel}>
                  Sobre o artista
                </Text>
              </View>
              <View style={styles.artistInfo}>
                <Text variant="title2" color={W}>
                  MC Kevin
                </Text>
                <Text variant="callout" color={W2}>
                  1,2 mi ouvintes mensais
                </Text>
                <View style={{ alignSelf: 'flex-start', marginTop: spacing[2] }}>
                  <Pill label="Seguir" />
                </View>
              </View>
            </Card>
            <Card style={{ flex: 1 }} title="Artistas na faixa">
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {[
                  ['MC Kevin', 'Artista principal'],
                  ['DJ Nene MPC', 'Artista'],
                ].map(([n, r]) => (
                  <View key={n} style={{ alignItems: 'center', gap: 4 }}>
                    {n === 'MC Kevin' ? (
                      <Cover color="#8A7A55" image={COVERS.piscina} size={128} radius={64} />
                    ) : (
                      <Avatar name={n as string} size={128} />
                    )}
                    <Text variant="bodyStrong" color={W}>
                      {n}
                    </Text>
                    <Text variant="caption" color={W2}>
                      {r}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>

          <View style={styles.row}>
            <Card
              style={{ flex: 2 }}
              title="Vídeos relacionados"
              action={<Icon name="arrow-forward" size={32} color={W} />}
            >
              <View style={{ flexDirection: 'row', gap: spacing[6] }}>
                {[
                  ['Donos da Capital', 'MC Kevin e outros', COVERS.donos, '04:12'],
                  ['Piscina de Diamante', 'MC Kevin', COVERS.piscina, '03:13'],
                ].map(([t, a, col, d]) => (
                  <View
                    key={t}
                    style={{ flex: 1, flexDirection: 'row', gap: spacing[4], alignItems: 'center' }}
                  >
                    <View>
                      <Cover
                        color="#222"
                        image={col as ImageSourcePropType}
                        size={250}
                        height={140}
                        radius={10}
                      />
                      <Text variant="footnote" color={W} style={styles.duration}>
                        {d}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" color={W} numberOfLines={2}>
                        {t}
                      </Text>
                      <Text variant="caption" color={W2} numberOfLines={1}>
                        {a}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
            <Card
              style={{ flex: 1 }}
              title="Próximas"
              action={
                <Text variant="bodyStrong" color={GREEN}>
                  Abrir fila
                </Text>
              }
            >
              {(upNext ? [upNext] : []).map((q) => (
                <View
                  key={q.title}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}
                >
                  <Cover color={q.cover} image={q.image} size={96} radius={8} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" color={W}>
                      {q.title}
                    </Text>
                    <Text variant="caption" color={W2}>
                      {q.artists}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>

          <Card
            title="Créditos"
            action={
              <Text variant="bodyStrong" color={GREEN}>
                Mostrar tudo
              </Text>
            }
          >
            {[
              ['MC Kevin', 'Artista principal'],
              ['DJ Nene MPC', 'Artista'],
            ].map(([n, r]) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="bodyStrong" color={W} style={{ width: 300 }}>
                  {n}
                </Text>
                <Text variant="callout" color={W2} style={{ flex: 1 }}>
                  {r}
                </Text>
                <Pill label="Seguir" small />
              </View>
            ))}
          </Card>

          <Card title="Conheça MC Kevin">
            <View style={{ flexDirection: 'row', gap: spacing[5] }}>
              {[
                ['Músicas de MC Kevin', COVERS.piscina],
                ['Parecidas com MC Kevin', COVERS.donos],
                ['Parecidas com Isolado no Quarto', COVERS.ninguem],
              ].map(([label, col]) => (
                <View key={label} style={{ flex: 1 }}>
                  <Cover
                    color="#222"
                    image={col as ImageSourcePropType}
                    size={460}
                    height={200}
                    radius={14}
                    title={label as string}
                  />
                </View>
              ))}
            </View>
          </Card>
        </View>
      </Animated.ScrollView>

      {/* Cabeçalho compacto (imagem 6) */}
      <Animated.View
        pointerEvents={compactVisible ? 'auto' : 'none'}
        style={[styles.compact, { opacity: compactOpacity }]}
      >
        <Image
          source={track.image}
          blurRadius={60}
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
          <View
            style={[styles.track, { height: 4, marginTop: spacing[3], marginRight: spacing[10] }]}
          >
            <View style={[styles.trackFill, { height: 4 }]} />
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
  return (
    <View style={[styles.card, style]}>
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

function Pill({ label, small }: { label: string; small?: boolean }) {
  return (
    <Touchable style={[styles.pill, small && { height: 48, paddingHorizontal: spacing[5] }]}>
      <Text variant={small ? 'caption' : 'bodyStrong'} color={W}>
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  artistCard: { flex: 2, height: 300, padding: 0, flexDirection: 'row', overflow: 'hidden' },
  artistPhoto: { flex: 1, overflow: 'hidden' },
  artistInfo: { flex: 1, padding: spacing[8], justifyContent: 'center', gap: spacing[2] },
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  backdrop: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hero: { height: layout.height, paddingHorizontal: 56, paddingTop: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 72 },
  artShadow: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 24 },
  },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
  },
  trackFill: { width: '34%', height: 7, borderRadius: 4, backgroundColor: W },
  thumb: {
    position: 'absolute',
    left: '34%',
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: W,
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  more: { paddingHorizontal: 56, paddingBottom: 64, gap: spacing[6] },
  row: { flexDirection: 'row', gap: spacing[6] },
  card: {
    backgroundColor: 'rgba(28,28,30,0.78)',
    borderRadius: 28,
    padding: spacing[6],
    gap: spacing[5],
  },
  cardLabel: { position: 'absolute', top: spacing[5], left: spacing[6] },
  duration: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  pill: {
    alignSelf: 'flex-start',
    height: 60,
    paddingHorizontal: spacing[8],
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
  },
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
