import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { callPhone, openWhatsApp } from '../../integrations/contact';
import { MAPS_ENABLED } from '../../integrations/env';
import { usePhone, useSystemInsets } from '../../layout/form-factor';
import { CarSearch } from '../../map/car-search';
import { ClientPicker } from '../../map/client-picker';
import { LiveMap, type MapPin } from '../../map/live-map';
import { useMapNav } from '../../map/map-nav';
import { type Guidance as TurnGuidance, useTurnByTurn } from '../../map/navigation';
import { PannableMap } from '../../map/pannable-map';
import { ExploreSheet, RouteSheet, type TripInfo } from '../../map/phone-sheet';
import {
  formatArrival,
  formatDuration,
  formatKm,
  formatStepDistance,
  type LatLng,
} from '../../map/routing';
import { OptionGroup, OptionRow, SavedRoutes } from '../../map/saved-routes';
import { useStops } from '../../map/stops';
import { useCarPosition, useClientPlaces, useLiveRoute } from '../../map/use-live-map';
import { CLIENT_FOCUS, DAY_FOCUS, type MapMode, USER } from '../../map/world';
import { CLIENTS, type MockClient } from '../../mocks/data';
import { useNowPlaying } from '../../music/now-playing';
import { ProgressBar } from '../../music/player-parts';
import { usePrototype } from '../../prototype/state';
import { concentric, layout, spacing, useColors } from '../../theme';
import { BlurArea, BlurTargetProvider } from '../../ui/blur-target';
import { Cover } from '../../ui/brand';
import { Appear, Presence, Swap } from '../../ui/motion';
import {
  Avatar,
  Button,
  Icon,
  IconButton,
  type IconName,
  Material,
  Text,
  Touchable,
} from '../../ui/primitives';

/**
 * Tela inicial (Mapa): o mapa ocupa todo o fundo e os painéis flutuam por cima com
 * material translúcido. `?rota=cliente&id=c1` mostra a rota até um cliente;
 * `?rota=dia` mostra a rota do dia.
 */
export default function MapScreen() {
  const phone = usePhone();
  const { rota, id } = useLocalSearchParams<{ rota?: string; id?: string }>();
  const mode: MapMode = rota === 'dia' ? 'day' : rota === 'cliente' ? 'client' : 'explore';
  const [stop, setStop] = useState(0);
  const target = mode === 'explore' ? USER : mode === 'day' ? DAY_FOCUS : CLIENT_FOCUS;

  // Rota do dia: os clientes planejados + os postos na rota pelo Kyte ou pela Havena.
  const stops = useStops();
  const plannedDay = stops.dayIds
    .map((cid) => stops.find(cid))
    .filter((x): x is MockClient => x !== null);
  const picked = stops.find(id);

  // Mapa real (compilação com a chave do OpenRouteService): GPS, endereços e rota.
  const live = MAPS_ENABLED;
  const c = useColors();
  const { position, heading } = useCarPosition(live);
  // Navegação dentro do GoClient (voz e câmera seguindo o carro).
  const [navigating, setNavigating] = useState(false);
  const [arrivedAt, setArrivedAt] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: troca de destino encerra a navegação
  useEffect(() => {
    setNavigating(false);
    setArrivedAt(null);
    // `?rota=dia&id=…` (escolhido na lista "Rota"): começa naquela parada.
    setStop(mode === 'day' && id ? Math.max(0, stops.dayIds.indexOf(id)) : 0);
  }, [mode, id]);
  const places = useClientPlaces(live ? [...CLIENTS, ...stops.extra] : [], live);
  const targets = mode === 'day' ? plannedDay : mode === 'client' && picked ? [picked] : [];
  const located = targets.filter((t) => places[t.id]);
  const { route, error: routeError } = useLiveRoute(
    live && mode !== 'explore' ? position : null,
    located.map((t) => places[t.id] as LatLng),
    // Ordem escolhida pelo usuário (lista "Rota") vale mais que a otimizada.
    mode === 'day' && !stops.manual,
  );
  // Na rota do dia, segue a melhor ordem calculada (o último cliente continua o último),
  // a não ser que o usuário tenha reordenado as paradas.
  const routeClients =
    live && mode === 'day' && !stops.manual && route && located.length > 1
      ? [
          ...route.order.map((i) => located[i] as MockClient),
          located[located.length - 1] as MockClient,
        ]
      : plannedDay;

  // Sem rota e sem cliente escolhido (ex.: primeira entrada no app), o cartão convida o
  // usuário a escolher para onde ir.
  const client =
    mode === 'day' ? (routeClients[wrap(stop, routeClients.length)] as MockClient) : picked;

  const pins: MapPin[] =
    mode === 'explore'
      ? CLIENTS.filter((x) => places[x.id]).map((x) => ({
          id: x.id,
          coordinate: places[x.id] as LatLng,
          label: x.name.charAt(0),
          kind: 'client',
        }))
      : routeClients
          .filter((x) => places[x.id])
          .map((x, i) => ({
            id: x.id,
            coordinate: places[x.id] as LatLng,
            label: mode === 'day' ? String(i + 1) : undefined,
            kind: 'stop',
          }));
  // Navegação: uma rota do carro até as paradas que faltam, na ordem já escolhida. Recalcula
  // só quando o carro sai do caminho ou quando chega numa parada.
  const from = mode === 'day' ? wrap(stop, routeClients.length) : 0;
  const remaining =
    mode === 'day'
      ? routeClients
          .slice(from)
          .map((x) => places[x.id])
          .filter((p): p is LatLng => !!p)
      : client && places[client.id]
        ? [places[client.id] as LatLng]
        : [];
  const nav = useLiveRoute(navigating ? position : null, navigating ? remaining : [], false, true);
  const onArrive = useCallback(
    (k: number) => {
      const reached = mode === 'day' ? routeClients[from + k] : client;
      setArrivedAt(reached?.tradeName ?? null);
      if (mode === 'day' && from + k + 1 < routeClients.length) setStop(from + k + 1);
      else setNavigating(false);
    },
    [mode, routeClients, from, client],
  );
  const guidance = useTurnByTurn({ route: nav.route, position, active: navigating, onArrive });
  const navigate = () => {
    setArrivedAt(null);
    setNavigating(true);
  };
  const shownRoute = navigating ? (nav.route ?? route) : route;
  const liveStatus = !position
    ? 'Aguardando o GPS…'
    : (navigating ? nav.error : routeError)
      ? ((navigating ? nav.error : routeError) as string)
      : arrivedAt
        ? `Você chegou: ${arrivedAt}`
        : navigating
          ? nav.rerouting
            ? 'Você saiu do caminho. Recalculando…'
            : 'Calculando o caminho…'
          : !route
            ? located.length < targets.length
              ? 'Localizando o endereço…'
              : 'Calculando o caminho…'
            : 'Pronto para navegar, com voz';

  const mapArea = useRef<ComponentRef<typeof View>>(null);
  const _router = useRouter();
  const mapNav = useMapNav();
  // Dados da viagem: da rota real (Google) ou os de exemplo do protótipo.
  const left = guidance
    ? { s: guidance.remainingSeconds, m: guidance.remainingMeters }
    : shownRoute
      ? { s: shownRoute.durationSeconds, m: shownRoute.distanceMeters }
      : null;
  const liveTime = live && left ? formatDuration(left.s) : null;
  const trip: TripInfo =
    live && left && liveTime
      ? {
          arrival: formatArrival(left.s),
          duration: liveTime,
          km: formatKm(left.m),
        }
      : mode === 'day'
        ? { arrival: '11:58', duration: { value: '1:12', unit: 'hrs' }, km: '24,6' }
        : { arrival: '09:59', duration: { value: '18', unit: 'min' }, km: '7,4' };
  const stopLabel =
    mode === 'day' && routeClients.length > 1
      ? `Parada ${wrap(stop, routeClients.length) + 1} de ${routeClients.length}`
      : undefined;

  // Celular em pé: mapa aberto + aba puxável (estilo Apple Maps) no lugar dos cartões.
  if (phone) {
    return (
      <View style={{ flex: 1 }}>
        <BlurArea targetRef={mapArea} style={StyleSheet.absoluteFill}>
          {live ? (
            <LiveMap
              dark={c.mode === 'dark'}
              user={position}
              heading={heading}
              path={shownRoute?.path ?? []}
              pins={pins}
              follow={navigating}
            />
          ) : (
            <PannableMap mode={mode} focus={{ x: target.x, y: target.y + 220 }} />
          )}
        </BlurArea>
        <BlurTargetProvider value={mapArea}>
          {/* Entrar ou sair de uma rota: a orientação no topo e as abas trocam com fade e um
              pequeno deslocamento, sem corte seco. */}
          <Presence show={mode !== 'explore'} distance={-24} style={StyleSheet.absoluteFill}>
            {live ? (
              <LiveGuidance
                to={client?.tradeName ?? ''}
                status={liveStatus}
                guidance={guidance}
                onStop={navigating ? () => setNavigating(false) : undefined}
                trip={client ? trip : undefined}
              />
            ) : (
              <Guidance trip={client ? trip : undefined} />
            )}
          </Presence>
          <Presence show={!client} distance={60} style={StyleSheet.absoluteFill}>
            <ExploreSheet />
          </Presence>
          <Presence show={!!client} distance={60} style={StyleSheet.absoluteFill}>
            {client ? (
              <RouteSheet
                client={client}
                stopLabel={stopLabel}
                trip={trip}
                queue={mode === 'day' ? routeClients : plannedDay}
                onReorder={(ids) => {
                  stops.reorder(ids);
                  if (mode === 'day') setStop(Math.max(0, ids.indexOf(client.id)));
                }}
                onPick={(pickedId) => {
                  if (mode === 'day') {
                    setStop(
                      Math.max(
                        0,
                        routeClients.findIndex((x) => x.id === pickedId),
                      ),
                    );
                    return;
                  }
                  // Fora da rota do dia: fixa a ordem mostrada e abre a rota naquela parada.
                  stops.reorder(plannedDay.map((x) => x.id));
                  mapNav({ rota: 'dia', id: pickedId });
                }}
                onNext={
                  mode === 'day' && routeClients.length > 1
                    ? () => setStop((s) => s + 1)
                    : undefined
                }
                onPrevious={
                  mode === 'day' && routeClients.length > 1
                    ? () => setStop((s) => s - 1)
                    : undefined
                }
                onNavigate={() =>
                  mode === 'explore' ? mapNav({ rota: 'cliente', id: client.id }) : navigate()
                }
                navigating={navigating}
                onStopNavigation={() => setNavigating(false)}
                onEnd={() => mapNav()}
              />
            ) : null}
          </Presence>
        </BlurTargetProvider>
      </View>
    );
  }

  // Multimídia: painel de bordo — o mapa num quadro arredondado à esquerda e, à direita, a
  // coluna de cartões (destino/cliente em cima, música tocando embaixo).
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.mapPanel, { backgroundColor: c.fill }]}>
        <BlurArea targetRef={mapArea} style={StyleSheet.absoluteFill}>
          {live ? (
            <LiveMap
              dark={c.mode === 'dark'}
              user={position}
              heading={heading}
              path={shownRoute?.path ?? []}
              pins={pins}
              follow={navigating}
            />
          ) : (
            <PannableMap mode={mode} focus={{ x: target.x, y: target.y }} />
          )}
        </BlurArea>
      </View>
      {/* Os cartões por cima desfocam o mapa (no Android, ver ui/blur-target.tsx). Ficam fora
          do quadro recortado: o desfoque da Web perde os cantos dentro de um recorte. */}
      <View pointerEvents="box-none" style={styles.mapOverlay}>
        <BlurTargetProvider value={mapArea}>
          {/* Entrar ou sair de uma rota: a busca e os controles da viagem trocam com fade. */}
          <Presence show={mode === 'explore'} distance={-16} style={StyleSheet.absoluteFill}>
            <CarSearch maxHeight={layout.height - layout.gutter * 4} />
          </Presence>
          <Presence show={mode !== 'explore'} distance={16} style={StyleSheet.absoluteFill}>
            {live ? (
              <LiveGuidance to={client?.tradeName ?? ''} status={liveStatus} guidance={guidance} />
            ) : (
              // A manobra só aparece depois de tocar em "Ir" (navegação começada).
              <Presence show={navigating} distance={-24} style={StyleSheet.absoluteFill}>
                <Guidance />
              </Presence>
            )}
            <TripBar
              navigating={navigating}
              onNavigate={navigate}
              onStop={() => setNavigating(false)}
            />
          </Presence>
        </BlurTargetProvider>
      </View>

      {/* Coluna da direita: a música num cartão baixo em cima e o destino (cliente ou "Para
          onde vamos?") embaixo, ocupando o resto — o cartão do cliente é o maior. */}
      <View style={styles.side}>
        <Appear delay={160} distance={40} fade={false} style={{ height: NOW_H }}>
          <NowPlayingCard />
        </Appear>
        {/* Trocar de cartão (entrar ou sair de uma rota, ir para outra parada) desliza: o
            atual sai e o novo entra, sem corte seco. */}
        <Swap
          id={client ? `${mode}:${client.id}` : 'welcome'}
          index={client ? (mode === 'day' ? wrap(stop, routeClients.length) + 1 : 1) : 0}
          style={{ flex: 1 }}
        >
          {client ? (
            <ClientCard
              key={client.id}
              client={client}
              mode={mode}
              stopLabel={stopLabel}
              queue={mode === 'day' ? routeClients : []}
              current={wrap(stop, routeClients.length)}
              onPick={setStop}
              // Setas só na rota do dia com mais de uma parada (destino único não tem).
              onNext={
                mode === 'day' && routeClients.length > 1 ? () => setStop((s) => s + 1) : undefined
              }
              onPrevious={
                mode === 'day' && routeClients.length > 1 ? () => setStop((s) => s - 1) : undefined
              }
              trip={trip}
              onClose={() => mapNav()}
            />
          ) : (
            <WelcomeCard />
          )}
        </Swap>
      </View>
    </View>
  );
}

/**
 * Cartão da música tocando (painel de bordo): o fundo é a própria capa, ampliada e
 * desfocada, com um véu escuro. Capa, nome e artista em cima (tocar abre o player), barra de
 * progresso e os controles anterior / tocar-pausar / próxima embaixo. "Anterior" volta ao
 * início da música se ela já passou dos 3 s (como no Spotify e no iPhone).
 */
function NowPlayingCard() {
  const router = useRouter();
  const { togglePlaying, next, previous } = usePrototype();
  const np = useNowPlaying();
  const { track, playing } = np;
  const back = () => (np.positionMs() > 3000 ? np.seek(0) : previous());
  return (
    <View style={styles.now}>
      <Image
        source={track.backdrop}
        blurRadius={track.backdropBlur}
        resizeMode="cover"
        style={[styles.nowBackdrop, { transform: [{ scale: 1.3 }] }]}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.42)' }]} />
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={`Abrir o player: ${track.title}`}
        onPress={() => router.push('/player')}
        style={styles.nowHead}
      >
        <Cover color={track.cover} image={track.image} size={80} radius={NOW_INNER} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" color="#FFFFFF" numberOfLines={1}>
            {track.title}
          </Text>
          <Text variant="callout" color="rgba(255,255,255,0.72)" numberOfLines={1}>
            {track.artists}
          </Text>
        </View>
      </Touchable>
      <ProgressBar
        np={np}
        height={6}
        thumb={0}
        labelColor="rgba(255,255,255,0.72)"
        showLabels={false}
      />
      <View style={styles.nowControls}>
        <IconButton
          icon="play-back"
          size={76}
          iconSize={42}
          color="#FFFFFF"
          accessibilityLabel="Voltar ao início ou música anterior"
          onPress={back}
        />
        <IconButton
          icon={playing ? 'pause' : 'play'}
          size={76}
          iconSize={48}
          color="#FFFFFF"
          accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
          onPress={togglePlaying}
        />
        <IconButton
          icon="play-forward"
          size={76}
          iconSize={42}
          color="#FFFFFF"
          accessibilityLabel="Próxima"
          onPress={next}
        />
      </View>
    </View>
  );
}

function Guidance({ trip }: { trip?: TripInfo }) {
  const phone = usePhone();
  const system = useSystemInsets();
  const c = useColors();
  return (
    <Appear
      delay={60}
      fade={false}
      style={phone ? [PHONE.top, { top: layout.gutter + system.top }] : styles.topLeft}
    >
      <Material style={phone && trip ? styles.guidanceStack : styles.guidance}>
        <View style={styles.maneuver}>
          <Icon name="return-up-forward" size={phone ? 48 : 64} color={c.text} />
          <View style={{ flex: phone ? 1 : undefined }}>
            <Text
              variant="largeTitle"
              style={phone ? { fontSize: 40, lineHeight: 46 } : { fontSize: 48, lineHeight: 54 }}
            >
              350 m
            </Text>
            <Text variant="headline" tone="secondary" numberOfLines={1}>
              Av. das Palmeiras
            </Text>
          </View>
        </View>
        {phone && trip && <TripStrip trip={trip} />}
      </Material>
    </Appear>
  );
}

/**
 * Celular: chegada, tempo e distância dentro do cartão da manobra (no topo), em três colunas
 * iguais separadas por traços finos — cabem em qualquer largura sem quebrar.
 */
function TripStrip({ trip }: { trip: TripInfo }) {
  const c = useColors();
  const items = [
    { value: trip.arrival, label: 'chegada' },
    { value: trip.duration.value, label: trip.duration.unit },
    { value: trip.km, label: 'km' },
  ];
  return (
    <View style={[styles.strip, { borderTopColor: c.separator }]}>
      {items.map((it, i) => (
        <View
          key={it.label}
          style={[
            styles.stripItem,
            i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.separator },
          ]}
        >
          <Text
            variant="title2"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontSize: 30, lineHeight: 36 }}
          >
            {it.value}
          </Text>
          <Text variant="callout" tone="secondary" numberOfLines={1} style={{ fontSize: 21 }}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Mapa real. Navegando: a próxima manobra (seta, distância e rua), falada em voz alta.
 * Antes: o destino e o estado (GPS, endereço, caminho) com o botão Navegar.
 */
function LiveGuidance({
  to,
  status,
  guidance,
  onNavigate,
  onStop,
  trip,
}: {
  to: string;
  status: string;
  guidance: TurnGuidance | null;
  onNavigate?: () => void;
  onStop?: () => void;
  trip?: TripInfo;
}) {
  const phone = usePhone();
  const system = useSystemInsets();
  const c = useColors();
  const next = guidance?.next;
  return (
    <Appear
      delay={60}
      fade={false}
      style={phone ? [PHONE.top, { top: layout.gutter + system.top }] : styles.topLeft}
    >
      <Material style={phone && trip ? styles.guidanceStack : [styles.guidance, { maxWidth: 820 }]}>
        <View style={styles.maneuver}>
          {next ? (
            <>
              <Icon name={maneuverIcon(next.type)} size={phone ? 48 : 64} color={c.text} />
              <View style={{ flexShrink: 1, flex: phone ? 1 : undefined }}>
                <Text
                  variant="largeTitle"
                  style={
                    phone ? { fontSize: 40, lineHeight: 46 } : { fontSize: 48, lineHeight: 54 }
                  }
                >
                  {formatStepDistance(guidance.toNext)}
                </Text>
                <Text variant="headline" tone="secondary" numberOfLines={2}>
                  {next.name || next.instruction}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Icon name="navigate" size={56} color={c.accent} />
              <View style={{ flexShrink: 1, flex: phone ? 1 : undefined }}>
                <Text variant="title2" numberOfLines={1}>
                  {to}
                </Text>
                <Text variant="headline" tone="secondary" numberOfLines={2}>
                  {status}
                </Text>
              </View>
            </>
          )}
          {onNavigate && <Button label="Navegar" icon="navigate" size="md" onPress={onNavigate} />}
          {onStop && <Button label="Parar" variant="destructive" size="md" onPress={onStop} />}
        </View>
        {phone && trip && <TripStrip trip={trip} />}
      </Material>
    </Appear>
  );
}

/** Seta da manobra (tipos do OpenRouteService, ver map/routing.ts). */
function maneuverIcon(type: number): IconName {
  switch (type) {
    case 0:
    case 2:
      return 'arrow-back';
    case 1:
    case 3:
      return 'arrow-forward';
    case 4:
    case 12:
      return 'return-up-back';
    case 5:
    case 13:
      return 'return-up-forward';
    case 7:
    case 8:
      return 'sync';
    case 9:
      return 'arrow-undo';
    case 10:
      return 'flag';
    default:
      return 'arrow-up';
  }
}

/**
 * Botão da viagem (canto de baixo do mapa, multimídia): "Ir" começa a navegação e, só depois
 * disso, vira "Encerrar". Chegada, tempo e distância ficam no cartão do cliente.
 */
function TripBar({
  navigating,
  onNavigate,
  onStop,
}: {
  navigating: boolean;
  onNavigate: () => void;
  onStop: () => void;
}) {
  return (
    <Appear delay={160} fade={false} distance={40} style={styles.bottomLeft}>
      <Material style={styles.trip}>
        <Swap id={navigating ? 'stop' : 'go'} dir={navigating ? 1 : -1}>
          {navigating ? (
            <Button
              label="Encerrar"
              icon="stop-circle"
              variant="destructive"
              style={styles.tripButton}
              onPress={onStop}
            />
          ) : (
            <Button label="Ir" icon="navigate" style={styles.tripButton} onPress={onNavigate} />
          )}
        </Swap>
      </Material>
    </Appear>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="title" style={{ fontSize: 40, lineHeight: 46 }}>
        {value}
      </Text>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

/**
 * Cartão do cliente com o destino escolhido. Em cima: "Ver lista" (fila da rota) à esquerda e
 * "Parada 2 de 5" à direita. "Ver lista" troca o conteúdo do cartão pela fila de clientes
 * (com "<" para voltar); tocar num cliente da fila vai para aquela parada.
 */
function ClientCard({
  client,
  mode,
  stopLabel,
  queue,
  current,
  onPick,
  onNext,
  onPrevious,
  trip,
  onClose,
}: {
  client: MockClient;
  mode: MapMode;
  stopLabel?: string;
  /** Clientes da rota, na ordem (só na rota do dia com mais de uma parada). */
  queue: MockClient[];
  current: number;
  onPick: (index: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  /** Chegada, tempo e distância (o botão "Ir" fica no canto do mapa). */
  trip: TripInfo;
  onClose: () => void;
}) {
  const c = useColors();
  const [list, setList] = useState(false);
  const tile = c.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#FFFFFF';
  const district = client.district.split(' · ')[0];
  const hasQueue = queue.length > 1;
  const nextIndex = current + 1;
  const next = hasQueue ? queue[nextIndex] : undefined;
  const soft = c.mode === 'dark' ? 'rgba(10,132,255,0.2)' : 'rgba(0,122,255,0.12)';
  const square = (icon: IconName, label: string, onPress: () => void) => (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.step, { backgroundColor: tile }]}
    >
      <Icon name={icon} size={38} />
    </Touchable>
  );

  return (
    <Material style={styles.compact}>
      <View style={styles.compactTop}>
        {hasQueue ? (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={list ? 'Voltar' : 'Ver lista'}
            onPress={() => setList((v) => !v)}
            style={styles.topLink}
          >
            <Icon name={list ? 'chevron-back' : 'list'} size={32} color={c.accent} />
            {!list && (
              <Text variant="headline" tone="accent" style={{ fontSize: 26, lineHeight: 32 }}>
                Ver lista
              </Text>
            )}
          </Touchable>
        ) : (
          <View />
        )}
        <Text variant="headline" tone="secondary" style={{ fontSize: 24, lineHeight: 30 }}>
          {stopLabel ?? 'Destino'}
        </Text>
      </View>
      <Swap id={list ? 'list' : 'card'} dir={list ? 1 : -1} style={{ flex: 1 }}>
        {list ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing[2] }}
          >
            <View style={[styles.queue, { backgroundColor: tile }]}>
              {queue.map((q, i) => {
                const on = i === current;
                return (
                  <Touchable
                    key={q.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Parada ${i + 1}: ${q.tradeName}`}
                    scaleTo={0.98}
                    onPress={() => (on ? setList(false) : onPick(i))}
                    style={[
                      styles.queueRow,
                      i > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: c.separator,
                      },
                    ]}
                  >
                    <View style={[styles.queueDot, { backgroundColor: on ? c.accent : soft }]}>
                      <Text
                        variant="headline"
                        style={{ fontSize: 26, color: on ? '#FFFFFF' : c.accent }}
                      >
                        {i + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        variant="headline"
                        numberOfLines={1}
                        style={{ fontSize: 28, lineHeight: 34 }}
                      >
                        {q.tradeName || q.name}
                      </Text>
                      <Text
                        variant="callout"
                        tone="secondary"
                        numberOfLines={1}
                        style={{ fontSize: 22, lineHeight: 28 }}
                      >
                        {on ? 'Parada atual' : q.address}
                      </Text>
                    </View>
                  </Touchable>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.compactBody}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] }}>
              <Avatar name={client.name} size={120} radius={COMPACT_INNER} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="title" numberOfLines={2} style={{ fontSize: 40, lineHeight: 46 }}>
                  {client.tradeName || client.name}
                </Text>
                <Text
                  variant="subhead"
                  tone="secondary"
                  numberOfLines={3}
                  style={{ fontSize: 24, lineHeight: 30 }}
                >
                  {[client.address, district].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <IconButton
                icon="close"
                size={56}
                iconSize={28}
                accessibilityLabel="Fechar destino"
                onPress={onClose}
              />
            </View>
            {/* Rota do dia: a próxima parada no meio do cartão (tocar vai para ela). */}
            {next ? (
              <Touchable
                accessibilityRole="button"
                accessibilityLabel={`Próxima parada: ${next.tradeName}`}
                scaleTo={0.98}
                onPress={() => onPick(nextIndex)}
                style={[styles.nextStop, { backgroundColor: tile }]}
              >
                <View style={[styles.queueDot, { backgroundColor: soft }]}>
                  <Text variant="headline" style={{ fontSize: 26, color: c.accent }}>
                    {nextIndex + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="callout" tone="secondary" style={{ fontSize: 22, lineHeight: 28 }}>
                    Próxima parada
                  </Text>
                  <Text
                    variant="headline"
                    numberOfLines={1}
                    style={{ fontSize: 28, lineHeight: 34 }}
                  >
                    {next.tradeName || next.name}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={30} color={c.textTertiary} />
              </Touchable>
            ) : null}
            <View style={{ gap: spacing[4] }}>
              <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                {client.phone ? square('call', 'Ligar', () => callPhone(client.phone)) : null}
                {client.phone
                  ? square('logo-whatsapp', 'WhatsApp', () => openWhatsApp(client.phone))
                  : null}
                <View style={{ flex: 1 }} />
                {onPrevious ? square('chevron-back', 'Cliente anterior', onPrevious) : null}
                {onNext ? square('chevron-forward', 'Próximo cliente', onNext) : null}
              </View>
              {mode !== 'explore' && (
                <View style={[styles.tripStats, { backgroundColor: tile }]}>
                  <Stat value={trip.arrival} label="chegada" />
                  <Stat value={trip.duration.value} label={trip.duration.unit} />
                  <Stat value={trip.km} label="km" />
                </View>
              )}
            </View>
          </View>
        )}
      </Swap>
    </Material>
  );
}

/**
 * Cartão inicial (multimídia), no estilo dos cartões do Apple Maps: título e uma lista
 * agrupada com linhas grandes, todas no azul do app. Regra 3: a multimídia não monta rotas —
 * só escolhe um cliente ou começa uma rota montada no celular.
 */
function WelcomeCard() {
  const stops = useStops();
  const [view, setView] = useState<'home' | 'pick' | 'routes'>('home');
  const count = stops.saved.length;
  // Mesma transição da aba "Rotas" do celular: o atual sai deslizando e o novo entra.
  return (
    <Material style={[styles.welcome, view !== 'home' && { justifyContent: 'flex-start' }]}>
      <Swap
        id={view}
        dir={view === 'home' ? -1 : 1}
        style={view === 'home' ? { gap: spacing[6] } : { flex: 1, gap: spacing[5] }}
      >
        {view === 'pick' ? (
          <ClientPicker onClose={() => setView('home')} />
        ) : view === 'routes' ? (
          <>
            <View style={styles.welcomeHead}>
              <Text variant="largeTitle" style={{ fontSize: 40, lineHeight: 48 }}>
                Rotas
              </Text>
              <IconButton
                icon="close"
                size={80}
                iconSize={36}
                accessibilityLabel="Voltar"
                onPress={() => setView('home')}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <SavedRoutes outerRadius={WELCOME_R} outerPadding={spacing[6]} />
            </ScrollView>
          </>
        ) : (
          <>
            <View style={{ gap: spacing[1] }}>
              <Text variant="largeTitle" style={{ fontSize: 42, lineHeight: 50 }}>
                Para onde vamos?
              </Text>
              <Text variant="body" tone="secondary" style={{ fontSize: 26, lineHeight: 32 }}>
                Escolha um cliente ou uma rota montada.
              </Text>
            </View>
            <OptionGroup outerRadius={WELCOME_R} outerPadding={spacing[6]}>
              <OptionRow
                first
                big
                strong
                icon="storefront"
                title="Escolher cliente"
                sub="Traçar o caminho até ele"
                onPress={() => setView('pick')}
              />
              <OptionRow
                big
                icon="trail-sign"
                title="Rotas montadas"
                sub={
                  count === 0
                    ? 'Monte no celular'
                    : count === 1
                      ? '1 rota do celular'
                      : `${count} rotas do celular`
                }
                onPress={() => setView('routes')}
              />
            </OptionGroup>
          </>
        )}
      </Swap>
    </Material>
  );
}

/**
 * Bordas concêntricas dos cartões da multimídia: raio de dentro = raio de fora − espaçamento.
 * Cartão grande ("Para onde vamos?"): 56 − 24 = 32. Cartão do cliente: 48 − 24 = 24.
 * Barra da viagem: 32 − 16 = 16.
 */
const WELCOME_R = 56;
const COMPACT_R = 48;
const TRIP_R = layout.radius.xl;
const COMPACT_INNER = concentric(COMPACT_R, spacing[6]);
const TRIP_INNER = concentric(TRIP_R, spacing[4]);

const LEFT = layout.sidebarWidth + layout.gutter;
/** Coluna de cartões à direita do mapa e o cartão da música (painel de bordo). */
const SIDE_W = 480;
const NOW_H = 232;
const NOW_R = 48;
const NOW_INNER = concentric(NOW_R, spacing[6]);
const MAP_R = 48;

/** Celular em pé: busca/orientação no topo, cartão embaixo (acima das abas). */
const PHONE = StyleSheet.create({
  top: { position: 'absolute', top: layout.gutter, left: layout.gutter, right: layout.gutter },
  trip: { position: 'absolute', top: 150, left: layout.gutter, right: layout.gutter },
});

const styles = StyleSheet.create({
  topLeft: { position: 'absolute', top: layout.gutter, left: layout.gutter },
  bottomLeft: { position: 'absolute', bottom: layout.gutter, left: layout.gutter },
  mapPanel: {
    position: 'absolute',
    top: layout.gutter,
    bottom: layout.gutter,
    left: LEFT,
    right: SIDE_W + layout.gutter * 2,
    borderRadius: MAP_R,
    overflow: 'hidden',
  },
  mapOverlay: {
    position: 'absolute',
    top: layout.gutter,
    bottom: layout.gutter,
    left: LEFT,
    right: SIDE_W + layout.gutter * 2,
  },
  side: {
    position: 'absolute',
    top: layout.gutter,
    right: layout.gutter,
    bottom: layout.gutter,
    width: SIDE_W,
    gap: layout.gutter,
  },
  now: {
    flex: 1,
    borderRadius: NOW_R,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[5],
    gap: spacing[3],
    justifyContent: 'center',
  },
  nowBackdrop: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  nowControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  nowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  maneuver: { flexDirection: 'row', alignItems: 'center', gap: spacing[6] },
  // Celular: manobra em cima e a faixa de chegada/tempo/distância embaixo.
  guidanceStack: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[5],
    borderRadius: layout.radius.xl,
  },
  strip: {
    flexDirection: 'row',
    marginTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Valor e rótulo na mesma linha ("11:58 chegada"): a faixa fica com uma linha só de altura.
  stripItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    minWidth: 0,
  },
  guidance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    paddingVertical: spacing[5],
    paddingLeft: spacing[6],
    paddingRight: spacing[10],
    borderRadius: layout.radius.xl,
  },
  trip: { padding: spacing[4], borderRadius: TRIP_R },
  tripButton: { borderRadius: TRIP_INNER, minWidth: 280, paddingHorizontal: spacing[8] },
  card: { flex: 1, borderRadius: 40, padding: spacing[8] },
  compact: { flex: 1, borderRadius: COMPACT_R, padding: spacing[6] },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: COMPACT_INNER,
    paddingVertical: spacing[4],
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    marginTop: -spacing[2],
    marginBottom: spacing[3],
  },
  topLink: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48 },
  nextStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    borderRadius: COMPACT_INNER,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  queue: { borderRadius: COMPACT_INNER, paddingLeft: spacing[4] },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    minHeight: 104,
    paddingRight: spacing[4],
  },
  queueDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBody: { flex: 1, gap: spacing[5], justifyContent: 'space-between' },
  welcome: {
    flex: 1,
    borderRadius: WELCOME_R,
    padding: spacing[6],
    gap: spacing[6],
  },
  welcomeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarTile: {
    width: 112,
    height: 112,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 22, height: 22, borderRadius: 11 },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  next: { height: 96, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', gap: spacing[3] },
  step: {
    width: 96,
    height: 96,
    borderRadius: COMPACT_INNER,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Índice circular (aceita negativos): anterior do primeiro volta para o último. */
function wrap(i: number, n: number): number {
  return ((i % n) + n) % n;
}
