import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { NOW_PLAYING, QUEUE } from '../mocks/data';
import { usePrototype } from '../prototype/state';
import { colors, layout, spacing } from '../theme';
import { Artwork, shade } from '../ui/brand';
import { Avatar, IconButton, Text, Touchable } from '../ui/primitives';

/**
 * Player de música em tela cheia (referências: imagens 4 e 6).
 * Rolando para baixo aparecem mais informações e um cabeçalho compacto fixo.
 * A seta para baixo minimiza o player para o rodapé (imagem 8).
 */
export default function Player() {
  const router = useRouter();
  const { nowPlaying } = usePrototype();
  const track = nowPlaying ?? NOW_PLAYING;
  const [playing, setPlaying] = useState(true);
  // O cabeçalho compacto só recebe toques quando está visível.
  const [compactVisible, setCompactVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const minimize = () => (router.canGoBack() ? router.back() : router.replace('/musica'));

  const compactOpacity = scrollY.interpolate({
    inputRange: [520, 640],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#050806' }}>
      <LinearGradient
        colors={[shade(track.cover, -0.25), shade(track.cover, -0.75), '#050806']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: (e: { nativeEvent: { contentOffset: { y: number } } }) =>
            setCompactVisible(e.nativeEvent.contentOffset.y > 580),
        })}
        showsVerticalScrollIndicator={false}
      >
        {/* Parte principal — ocupa a tela inteira */}
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <IconButton
              icon="chevron-down"
              variant="plain"
              iconSize={44}
              accessibilityLabel="Minimizar player"
              onPress={minimize}
            />
            <View style={{ alignItems: 'center' }}>
              <Text variant="label" tone="secondary">
                TOCANDO DA PLAYLIST
              </Text>
              <Text variant="bodyStrong">{track.album}</Text>
            </View>
            <IconButton
              icon="ellipsis-horizontal"
              variant="plain"
              iconSize={36}
              accessibilityLabel="Mais opções"
            />
          </View>

          <View style={styles.main}>
            <Artwork color={track.cover} size={600} radius={24} />
            <View style={{ flex: 1, gap: spacing[8] }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] }}>
                <View style={{ flex: 1, gap: spacing[2] }}>
                  <Text
                    variant="display"
                    style={{ fontSize: 68, lineHeight: 76 }}
                    numberOfLines={2}
                  >
                    {track.title}
                  </Text>
                  <Text
                    variant="body"
                    tone="secondary"
                    style={{ fontSize: 28, lineHeight: 36 }}
                    numberOfLines={1}
                  >
                    {track.artists}
                  </Text>
                </View>
                <IconButton
                  icon="checkmark-circle"
                  variant="plain"
                  size={88}
                  iconSize={64}
                  color={colors.music.accent}
                  accessibilityLabel="Salva"
                />
              </View>

              <View style={{ gap: spacing[2] }}>
                <View style={styles.track}>
                  <View style={styles.trackFill} />
                  <View style={styles.thumb} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="callout" tone="secondary">
                    1:16
                  </Text>
                  <Text variant="callout" tone="secondary">
                    -2:26
                  </Text>
                </View>
              </View>

              <View style={styles.controls}>
                <IconButton
                  icon="shuffle"
                  variant="plain"
                  size={88}
                  iconSize={46}
                  color={colors.music.accent}
                  accessibilityLabel="Aleatório"
                />
                <IconButton
                  icon="play-skip-back"
                  variant="plain"
                  size={96}
                  iconSize={60}
                  accessibilityLabel="Anterior"
                />
                <IconButton
                  icon={playing ? 'pause' : 'play'}
                  variant="inverse"
                  size={144}
                  iconSize={68}
                  accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
                  onPress={() => setPlaying((p) => !p)}
                />
                <IconButton
                  icon="play-skip-forward"
                  variant="plain"
                  size={96}
                  iconSize={60}
                  accessibilityLabel="Próxima"
                />
                <IconButton
                  icon="repeat"
                  variant="plain"
                  size={88}
                  iconSize={46}
                  accessibilityLabel="Repetir"
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[4] }}>
                <IconButton
                  icon="phone-portrait-outline"
                  variant="plain"
                  accessibilityLabel="Dispositivos"
                />
                <IconButton
                  icon="share-outline"
                  variant="plain"
                  accessibilityLabel="Compartilhar"
                />
                <IconButton icon="list" variant="plain" accessibilityLabel="Fila" />
              </View>
            </View>
          </View>
        </View>

        {/* Parte de baixo — mais informações (imagem 6) */}
        <View style={styles.more}>
          <View style={styles.row}>
            <View
              style={[
                styles.card,
                { flex: 1.9, flexDirection: 'row', overflow: 'hidden', padding: 0 },
              ]}
            >
              <Artwork color="#7A2E3A" size={520} height={260} radius={0} />
              <View
                style={{ flex: 1, padding: spacing[6], justifyContent: 'center', gap: spacing[2] }}
              >
                <Text variant="label" tone="secondary">
                  SOBRE O ARTISTA
                </Text>
                <Text variant="title">Lua Ventura</Text>
                <Text variant="callout" tone="secondary">
                  1,2 mi ouvintes mensais
                </Text>
                <Touchable style={styles.follow}>
                  <Text variant="bodyStrong">Seguir</Text>
                </Touchable>
              </View>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="headline">Próximas</Text>
                <Text variant="bodyStrong" color={colors.music.accent}>
                  Abrir fila
                </Text>
              </View>
              {QUEUE.map((q) => (
                <View
                  key={q.title}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}
                >
                  <Artwork color={q.cover} size={76} radius={10} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {q.title}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {q.artists}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="headline">Créditos</Text>
              <Text variant="bodyStrong" color={colors.music.accent}>
                Mostrar tudo
              </Text>
            </View>
            {[
              ['Lua Ventura', 'Artista principal • Autora • Letrista'],
              ['Os Marés', 'Artista principal'],
              ['DJ Calango', 'Produção'],
            ].map(([name, role]) => (
              <View
                key={name}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[5] }}
              >
                <Avatar name={name as string} size={56} />
                <Text variant="bodyStrong" style={{ width: 260 }}>
                  {name}
                </Text>
                <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
                  {role}
                </Text>
                <Touchable style={[styles.follow, { marginTop: 0 }]}>
                  <Text variant="callout">Seguir</Text>
                </Touchable>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text variant="headline">Conheça Lua Ventura</Text>
            <View style={{ flexDirection: 'row', gap: spacing[5] }}>
              {[
                ['Músicas de Lua Ventura', '#2E6E8E'],
                ['Parecidas com Lua Ventura', '#6C4FA3'],
                ['Parecidas com Horizonte Aberto', '#8A5A3C'],
              ].map(([label, c]) => (
                <View key={label} style={{ flex: 1 }}>
                  <Artwork color={c as string} size={460} height={220} radius={20} label={label} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Cabeçalho compacto que aparece ao rolar */}
      <Animated.View
        pointerEvents={compactVisible ? 'auto' : 'none'}
        style={[styles.compact, { opacity: compactOpacity }]}
      >
        <LinearGradient
          colors={[shade(track.cover, -0.55), shade(track.cover, -0.7)]}
          style={StyleSheet.absoluteFill}
        />
        <IconButton
          icon="chevron-down"
          variant="plain"
          iconSize={40}
          accessibilityLabel="Minimizar player"
          onPress={minimize}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="headline" numberOfLines={1}>
            {track.title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {track.artists}
          </Text>
          <View style={[styles.track, { height: 4, marginTop: 6 }]}>
            <View style={[styles.trackFill, { height: 4 }]} />
          </View>
        </View>
        <IconButton
          icon="checkmark-circle"
          variant="plain"
          iconSize={44}
          color={colors.music.accent}
          accessibilityLabel="Salva"
        />
        <IconButton
          icon={playing ? 'pause' : 'play'}
          variant="plain"
          iconSize={48}
          accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
          onPress={() => setPlaying((p) => !p)}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: layout.height, paddingHorizontal: 64, paddingTop: 24, paddingBottom: 48 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 80 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
  },
  trackFill: { width: '34%', height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  thumb: {
    position: 'absolute',
    left: '34%',
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  more: { paddingHorizontal: 64, paddingBottom: 64, gap: spacing[6] },
  row: { flexDirection: 'row', gap: spacing[6] },
  card: {
    backgroundColor: 'rgba(30,30,33,0.92)',
    borderRadius: 28,
    padding: spacing[6],
    gap: spacing[5],
  },
  follow: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    paddingHorizontal: spacing[6],
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
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
    gap: spacing[5],
    paddingHorizontal: 40,
    overflow: 'hidden',
  },
});
