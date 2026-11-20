import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { PHONE_SCROLL_END } from '../layout/form-factor';
import { BROWSE, type MockPlaylist, type MockShow } from '../mocks/data';
import { spacing } from '../theme';
import { Cover, shade } from '../ui/brand';
import { Appear } from '../ui/motion';
import { Icon, Text, Touchable } from '../ui/primitives';
import { AccountButton } from './accounts';
import { type Feature, useHomeData, useLibraryData, useTrackSearch } from './library';
import { useOpenPlaylist, usePlay, usePlayContext } from './use-play';

/**
 * Música no celular em pé (referência: app do Spotify no iPhone). Medidas na tela de
 * referência de 720 de largura (≈0,54× no aparelho).
 */

export const SP_BG = '#121212';
const CARD = '#2A2A2A';
const GREEN = '#1ED760';
const W = '#FFFFFF';
const W2 = 'rgba(255,255,255,0.64)';
const PAD = 32;

// ─── Entrada (login) ────────────────────────────────────────────────────────────────────

export function PhoneSpotifyLogin({ real, onConnect }: { real: boolean; onConnect: () => void }) {
  const options: { label: string; icon: ReactNode }[] = [
    { label: 'Continuar com o Google', icon: <FontAwesome5 name="google" size={36} color={W} /> },
    {
      label: 'Continuar com o Facebook',
      icon: <FontAwesome5 name="facebook" size={38} color="#1877F2" />,
    },
    { label: 'Continuar com a Apple', icon: <FontAwesome5 name="apple" size={40} color={W} /> },
  ];
  return (
    <View
      style={[styles.fill, { backgroundColor: SP_BG, justifyContent: 'flex-end', padding: 56 }]}
    >
      <Appear distance={20} style={{ alignItems: 'center', gap: spacing[8], marginBottom: 72 }}>
        <View style={styles.logoCircle}>
          <FontAwesome5 name="spotify" size={150} color={SP_BG} />
        </View>
        <Text variant="largeTitle" color={W} style={styles.headline}>
          Milhões de músicas.{'\n'}Grátis no Spotify.
        </Text>
      </Appear>
      <Appear delay={120} distance={16} style={{ gap: spacing[5] }}>
        <Touchable
          accessibilityRole="button"
          onPress={onConnect}
          scaleTo={0.97}
          style={[styles.loginBtn, { backgroundColor: GREEN, borderColor: GREEN }]}
        >
          <Text variant="title2" color="#000000" style={styles.loginLabel}>
            {real ? 'Entrar com o Spotify' : 'Inscreva-se grátis'}
          </Text>
        </Touchable>
        {!real &&
          options.map((o) => (
            <Touchable
              key={o.label}
              accessibilityRole="button"
              onPress={onConnect}
              scaleTo={0.97}
              style={styles.loginBtn}
            >
              <View style={styles.loginIcon}>{o.icon}</View>
              <Text variant="title2" color={W} style={styles.loginLabel}>
                {o.label}
              </Text>
            </Touchable>
          ))}
        <Touchable accessibilityRole="button" onPress={onConnect} style={styles.loginText}>
          <Text variant="title2" color={W} style={styles.loginLabel}>
            {real ? 'Use e-mail e senha na página do Spotify' : 'Entrar'}
          </Text>
        </Touchable>
      </Appear>
    </View>
  );
}

// ─── Início ─────────────────────────────────────────────────────────────────────────────

type Filter = 'Tudo' | 'Música' | 'Podcasts' | 'Audiolivros';

export function PhoneMusicHome() {
  const router = useRouter();
  const home = useHomeData();
  const open = useOpenPlaylist();
  const [filter, setFilter] = useState<Filter>('Tudo');
  const showMusic = filter === 'Tudo' || filter === 'Música';
  const showShows = filter === 'Tudo' || filter === 'Podcasts';
  // O primeiro bloco ("Músicas Curtidas") vira a entrada da Biblioteca; as curtidas
  // continuam dentro dela.
  const tiles = [LIBRARY_TILE, ...home.playlists.filter((p) => !p.liked).slice(0, 7)];

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.chipsRow}>
        <AccountButton size={68} />
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          onPress={() => router.replace('/musica/buscar')}
          style={styles.roundBtn}
        >
          <Icon name="search" size={38} color={W} />
        </Touchable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 14 }}
        >
          {(['Tudo', 'Música', 'Podcasts', 'Audiolivros'] as Filter[]).map((f) => (
            <Pill key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>

      {showMusic && (
        <View style={styles.grid}>
          {tiles.map((p, i) => (
            <Appear key={p.id} delay={i * 30} distance={10} style={{ width: '48.6%' }}>
              <Touchable
                accessibilityRole="button"
                onPress={() =>
                  p === LIBRARY_TILE ? router.replace('/musica/biblioteca') : open(p.id)
                }
                scaleTo={0.97}
                style={styles.tile}
              >
                {p === LIBRARY_TILE ? (
                  <View style={styles.libraryCover}>
                    <Icon name="library" size={46} color={W} />
                  </View>
                ) : (
                  <Cover color={p.cover} image={p.image} size={96} radius={0} liked={p.liked} />
                )}
                <Text variant="headline" color={W} numberOfLines={2} style={styles.tileText}>
                  {p.name}
                </Text>
              </Touchable>
            </Appear>
          ))}
        </View>
      )}

      {showMusic && home.feature && <FeatureCard feature={home.feature} />}

      {showMusic && (
        <>
          <Section title="Feito para você" />
          <CoverRow items={home.playlists.slice(1, 7)} onPress={(p) => open(p.id)} />
        </>
      )}

      {showShows && home.shows.length > 0 && (
        <>
          <Section title="Seus programas" />
          <ShowRow shows={home.shows} />
        </>
      )}
      {filter === 'Audiolivros' && (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 96 }}>
          <Icon name="headset-outline" size={72} color={W2} />
          <Text variant="title2" color={W}>
            Nenhum audiolivro ainda
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/** Bloco "Sua Biblioteca" na grade do Início. */
const LIBRARY_TILE = {
  id: 'biblioteca',
  name: 'Sua Biblioteca',
  detail: '',
  kind: 'Playlist',
  cover: '#3A3A3C',
  tracks: [],
} as MockPlaylist;

/** Cartão largo no estilo "Shows perto de você": capa à esquerda e textos à direita. */
function FeatureCard({ feature }: { feature: Feature }) {
  const play = usePlay();
  return (
    <>
      <Section
        title={feature.eyebrow === 'Novo lançamento de' ? 'Novo lançamento' : 'Tocada recentemente'}
      />
      <Appear distance={12} style={[styles.feature, { backgroundColor: CARD }]}>
        <Cover color="#333" image={feature.image} size={300} height={300} radius={0} />
        <View style={{ flex: 1, padding: 28, gap: 6, justifyContent: 'center' }}>
          <Text variant="callout" color={W2} numberOfLines={1}>
            {feature.headline}
          </Text>
          <Text
            variant="headline"
            color={W}
            numberOfLines={2}
            style={{ fontSize: 30, lineHeight: 36 }}
          >
            {feature.title}
          </Text>
          <Text variant="callout" color={W2} numberOfLines={2}>
            {feature.subtitle}
          </Text>
          <Touchable
            accessibilityRole="button"
            onPress={() => play(feature.trackId, undefined, undefined, feature.track)}
            style={styles.outlineBtn}
          >
            <Icon name="play" size={30} color={W} />
            <Text variant="headline" color={W}>
              Tocar
            </Text>
          </Touchable>
        </View>
      </Appear>
    </>
  );
}

function CoverRow({
  items,
  onPress,
}: {
  items: MockPlaylist[];
  onPress: (p: MockPlaylist) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -PAD }}
      contentContainerStyle={{ gap: 28, paddingHorizontal: PAD }}
    >
      {items.map((p) => (
        <Touchable key={p.id} accessibilityRole="button" onPress={() => onPress(p)} scaleTo={0.97}>
          <Cover color={p.cover} image={p.image} size={296} radius={6} liked={p.liked} />
          <Text
            variant="callout"
            color={W2}
            numberOfLines={2}
            style={{ width: 296, marginTop: 12 }}
          >
            {p.detail}
          </Text>
        </Touchable>
      ))}
    </ScrollView>
  );
}

function ShowRow({ shows }: { shows: MockShow[] }) {
  const playContext = usePlayContext();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -PAD }}
      contentContainerStyle={{ gap: 28, paddingHorizontal: PAD }}
    >
      {shows.map((s) => (
        <Touchable
          key={s.id}
          accessibilityRole="button"
          onPress={() => playContext(s.uri)}
          scaleTo={0.97}
        >
          <Cover color={s.cover} image={s.image} size={296} radius={14} title={s.name} />
        </Touchable>
      ))}
    </ScrollView>
  );
}

// ─── Buscar ─────────────────────────────────────────────────────────────────────────────

const PHONE_BROWSE = [
  ...BROWSE,
  { id: 'b5', name: 'Feito para você', color: '#1E3264', image: undefined },
  { id: 'b6', name: 'Fitness', color: '#777777', image: undefined },
];
const WATCH = [
  { id: 'w1', name: 'Vídeos para você', cover: '#C98A1F' },
  { id: 'w2', name: 'Hits da Internet', cover: '#3E6B3A' },
  { id: 'w3', name: 'Top Hits 2002', cover: '#5A6E86' },
];

export function PhoneSearch() {
  const router = useRouter();
  const play = usePlay();
  const [query, setQuery] = useState('');
  const search = useTrackSearch(query);
  const ids = search.results.map((t) => t.id);
  const searching = query.trim() !== '';

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Back onPress={() => router.replace('/musica')} />
        <AccountButton size={68} />
        <Text variant="largeTitle" color={W} style={[styles.pageTitle, { flex: 1 }]}>
          Buscar
        </Text>
        <Icon name="camera-outline" size={52} color={W} />
      </View>
      <View style={styles.searchBox}>
        <Icon name="search" size={42} color="#121212" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="O que você quer ouvir?"
          placeholderTextColor="#535353"
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      {searching ? (
        <View style={{ gap: 8 }}>
          {search.loading && <ActivityIndicator size="large" color={GREEN} />}
          {!search.loading && search.results.length === 0 && (
            <Text variant="headline" color={W2}>
              Nada encontrado para “{query.trim()}”.
            </Text>
          )}
          {search.results.map((t) => (
            <Touchable
              key={t.id}
              accessibilityRole="button"
              onPress={() => play(t.id, ids, undefined, t)}
              scaleTo={0.98}
              style={styles.row}
            >
              <Cover color={t.cover} image={t.image} size={104} radius={4} />
              <View style={{ flex: 1 }}>
                <Text variant="body" color={W} numberOfLines={1} style={styles.rowTitle}>
                  {t.title}
                </Text>
                <Text variant="callout" color={W2} numberOfLines={1}>
                  Música • {t.artists}
                </Text>
              </View>
            </Touchable>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {PHONE_BROWSE.map((b, i) => (
              <Appear key={b.id} delay={i * 40} distance={10} style={{ width: '48.6%' }}>
                <View style={[styles.browse, { backgroundColor: b.color }]}>
                  <Text variant="title2" color={W} style={{ fontSize: 32, lineHeight: 38 }}>
                    {b.name}
                  </Text>
                  <View style={[styles.browseArt, { backgroundColor: shade(b.color, 0.3) }]}>
                    {b.image && (
                      <Image source={b.image} style={{ width: '100%', height: '100%' }} />
                    )}
                  </View>
                </View>
              </Appear>
            ))}
          </View>
          <Section title="Playlists que você pode assistir" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -PAD }}
            contentContainerStyle={{ gap: 28, paddingHorizontal: PAD }}
          >
            {WATCH.map((w) => (
              <Touchable
                key={w.id}
                accessibilityRole="button"
                onPress={() => play()}
                scaleTo={0.97}
              >
                <Cover color={w.cover} size={260} height={390} radius={18} title={w.name} />
              </Touchable>
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

// ─── Sua Biblioteca ─────────────────────────────────────────────────────────────────────

type LibFilter = 'Playlists' | 'Podcasts' | 'Álbuns' | 'Artistas';

export function PhoneLibrary() {
  const router = useRouter();
  const open = useOpenPlaylist();
  const playContext = usePlayContext();
  const { playlists, shows, artists } = useLibraryData();
  const [filter, setFilter] = useState<LibFilter | null>(null);
  const show = (f: LibFilter) => filter === null || filter === f;

  const rows: { key: string; node: ReactNode }[] = [];
  for (const p of playlists) {
    if (!show(p.kind === 'Playlist' ? 'Playlists' : 'Álbuns')) continue;
    rows.push({
      key: p.id,
      node: (
        <LibRow
          cover={<Cover color={p.cover} image={p.image} size={116} radius={4} liked={p.liked} />}
          title={p.name}
          detail={p.detail}
          pinned={p.liked}
          onPress={() => open(p.id)}
        />
      ),
    });
  }
  if (show('Podcasts'))
    for (const s of shows)
      rows.push({
        key: s.id,
        node: (
          <LibRow
            cover={<Cover color={s.cover} image={s.image} size={116} radius={4} />}
            title={s.name}
            detail="Podcast"
            onPress={() => playContext(s.uri)}
          />
        ),
      });
  if (show('Artistas'))
    for (const a of artists)
      rows.push({
        key: a.id,
        node: (
          <LibRow
            cover={<Cover color="#333" image={a.image} size={116} radius={58} />}
            title={a.name}
            detail="Artista"
            onPress={() => a.uri && playContext(a.uri)}
          />
        ),
      });

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.titleRow, { paddingHorizontal: PAD, paddingTop: 28 }]}>
        <Back onPress={() => router.replace('/musica')} />
        <AccountButton size={68} />
        <Text
          variant="largeTitle"
          color={W}
          style={[styles.pageTitle, { flex: 1 }]}
          numberOfLines={1}
        >
          Sua Biblioteca
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          onPress={() => router.replace('/musica/buscar')}
        >
          <Icon name="search-outline" size={50} color={W} />
        </Touchable>
        <Icon name="add" size={58} color={W} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0, marginTop: 24 }}
        contentContainerStyle={{ gap: 14, paddingHorizontal: PAD }}
      >
        {(['Playlists', 'Podcasts', 'Álbuns', 'Artistas'] as LibFilter[]).map((f) => (
          <Pill
            key={f}
            label={f}
            outline
            selected={filter === f}
            onPress={() => setFilter((cur) => (cur === f ? null : f))}
          />
        ))}
      </ScrollView>
      <View style={[styles.sortRow, { paddingHorizontal: PAD }]}>
        <Icon name="swap-vertical" size={40} color={W} />
        <Text variant="body" color={W} style={{ flex: 1, fontSize: 26 }}>
          Recentes
        </Text>
        <Icon name="grid-outline" size={40} color={W} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: PHONE_SCROLL_END, gap: 28 }}
      >
        {rows.map((r, i) => (
          <Appear key={r.key} delay={i * 25} distance={8}>
            {r.node}
          </Appear>
        ))}
      </ScrollView>
    </View>
  );
}

function LibRow({
  cover,
  title,
  detail,
  pinned,
  onPress,
}: {
  cover: ReactNode;
  title: string;
  detail: string;
  pinned?: boolean;
  onPress: () => void;
}) {
  return (
    <Touchable accessibilityRole="button" onPress={onPress} scaleTo={0.98} style={styles.row}>
      {cover}
      <View style={{ flex: 1, gap: 6 }}>
        <Text variant="body" color={W} numberOfLines={1} style={styles.rowTitle}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {pinned && <Icon name="pin" size={26} color={GREEN} />}
          <Text variant="callout" color={W2} numberOfLines={1} style={{ flex: 1 }}>
            {detail}
          </Text>
        </View>
      </View>
    </Touchable>
  );
}

// ─── Peças ──────────────────────────────────────────────────────────────────────────────

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel="Voltar ao Início do Spotify"
      onPress={onPress}
      style={styles.roundBtn}
    >
      <Icon name="chevron-back" size={44} color={W} />
    </Touchable>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Text variant="largeTitle" color={W} style={styles.section}>
      {title}
    </Text>
  );
}

function Pill({
  label,
  selected,
  outline,
  onPress,
}: {
  label: string;
  selected?: boolean;
  outline?: boolean;
  onPress?: () => void;
}) {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.pill,
        selected
          ? { backgroundColor: GREEN, borderColor: GREEN }
          : outline
            ? { backgroundColor: '#1F1F1F', borderColor: '#3E3E3E' }
            : { backgroundColor: CARD, borderColor: CARD },
      ]}
    >
      <Text
        variant="body"
        color={selected ? '#000000' : W}
        style={{ fontSize: 26, lineHeight: 32 }}
      >
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { paddingHorizontal: PAD, paddingTop: 28, paddingBottom: PHONE_SCROLL_END, gap: 24 },
  logoCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: W,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headline: { fontSize: 64, lineHeight: 72, textAlign: 'center', letterSpacing: -1.5 },
  loginBtn: {
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: '#535353',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginIcon: { position: 'absolute', left: 48 },
  loginLabel: { fontSize: 32, lineHeight: 38 },
  loginText: { height: 88, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  roundBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryCover: {
    width: 96,
    height: 96,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  tile: {
    height: 96,
    borderRadius: 8,
    backgroundColor: CARD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    overflow: 'hidden',
  },
  tileText: { flex: 1, fontSize: 26, lineHeight: 31, paddingRight: 12 },
  section: { fontSize: 44, lineHeight: 52, letterSpacing: -0.5, marginTop: 24 },
  feature: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden' },
  outlineBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 28,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#8A8A8A',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  pageTitle: { fontSize: 52, lineHeight: 60, letterSpacing: -0.8 },
  searchBox: {
    height: 92,
    borderRadius: 10,
    backgroundColor: W,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 26,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 30,
    color: '#121212',
    fontFamily: 'SFProText-Regular',
  },
  browse: { height: 124, borderRadius: 10, padding: 24, overflow: 'hidden' },
  browseArt: {
    position: 'absolute',
    right: -18,
    bottom: -22,
    width: 110,
    height: 110,
    borderRadius: 8,
    overflow: 'hidden',
    transform: [{ rotate: '25deg' }],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  rowTitle: { fontSize: 32, lineHeight: 38 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 96 },
  pill: {
    height: 64,
    paddingHorizontal: 30,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
