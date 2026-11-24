import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { callPhone, openWhatsApp } from '../../integrations/contact';
import { MAPS_ENABLED } from '../../integrations/env';
import { usePhone, useSystemInsets } from '../../layout/form-factor';
import { ClientPicker } from '../../map/client-picker';
import { LiveMap, type MapPin } from '../../map/live-map';
import { type Guidance as TurnGuidance, useTurnByTurn } from '../../map/navigation';
import { PannableMap } from '../../map/pannable-map';
import { ExploreSheet, RouteSheet, type TripInfo } from '../../map/phone-sheet';
import { RoutePlanner } from '../../map/route-planner';
import {
  formatArrival,
  formatDuration,
  formatKm,
  formatStepDistance,
  type LatLng,
  type LiveRoute,
} from '../../map/routing';
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
import { Appear } from '../../ui/motion';
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
  const router = useRouter();
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
          {mode !== 'explore' &&
            (live ? (
              <LiveGuidance
                to={client?.tradeName ?? ''}
                status={liveStatus}
                guidance={guidance}
                onStop={navigating ? () => setNavigating(false) : undefined}
                trip={client ? trip : undefined}
              />
            ) : (
              <Guidance trip={client ? trip : undefined} />
            ))}
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
                router.replace({ pathname: '/mapa', params: { rota: 'dia', id: pickedId } });
              }}
              onNext={
                mode === 'day' && routeClients.length > 1 ? () => setStop((s) => s + 1) : undefined
              }
              onPrevious={
                mode === 'day' && routeClients.length > 1 ? () => setStop((s) => s - 1) : undefined
              }
              onNavigate={() =>
                mode === 'explore'
                  ? router.replace({
                      pathname: '/mapa',
                      params: { rota: 'cliente', id: client.id },
                    })
                  : live
                    ? navigate()
                    : undefined
              }
              onEnd={() => router.replace('/mapa')}
            />
          ) : (
            <ExploreSheet />
          )}
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
          {mode === 'explore' ? (
            <SearchPill />
          ) : live ? (
            <LiveGuidance
              to={client?.tradeName ?? ''}
              status={liveStatus}
              guidance={guidance}
              onNavigate={!navigating && located.length > 0 ? navigate : undefined}
              onStop={navigating ? () => setNavigating(false) : undefined}
            />
          ) : (
            <Guidance />
          )}
          {mode !== 'explore' && (
            <TripBar key={`trip:${mode}`} mode={mode} route={live ? shownRoute : undefined} />
          )}
        </BlurTargetProvider>
      </View>

      {/* Coluna da direita: a música num cartão baixo em cima e o destino (cliente ou "Para
          onde vamos?") embaixo, ocupando o resto — o cartão do cliente é o maior. */}
      <View style={styles.side}>
        <Appear delay={160} distance={40} fade={false} style={{ height: NOW_H }}>
          <NowPlayingCard />
        </Appear>
        <Appear
          key={`${mode}:${client?.id ?? ''}`}
          axis="x"
          distance={520}
          delay={80}
          duration={520}
          fade={false}
          style={{ flex: 1 }}
        >
          {client ? (
            <ClientCard
              key={client.id}
              client={client}
              mode={mode}
              stopLabel={stopLabel}
              onNext={routeClients.length > 1 ? () => setStop((s) => s + 1) : undefined}
              onPrevious={routeClients.length > 1 ? () => setStop((s) => s - 1) : undefined}
            />
          ) : (
            <WelcomeCard />
          )}
        </Appear>
      </View>
    </View>
  );
}

/**
 * Cartão da música tocando (painel de bordo): capa, nome, artista, progresso e os controles
 * anterior / tocar-pausar / próxima. Tocar na capa ou no nome abre o player.
 */
function NowPlayingCard() {
  const c = useColors();
  const router = useRouter();
  const { togglePlaying, next } = usePrototype();
  const np = useNowPlaying();
  const { track, playing } = np;
  return (
    <Material style={styles.now}>
      <View style={styles.nowHead}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={`Abrir o player: ${track.title}`}
          onPress={() => router.push('/player')}
          style={styles.nowOpen}
        >
          <Cover color={track.cover} image={track.image} size={88} radius={NOW_INNER} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline" numberOfLines={1}>
              {track.title}
            </Text>
            <Text variant="callout" tone="secondary" numberOfLines={1}>
              {track.artists}
            </Text>
          </View>
        </Touchable>
        <IconButton
          icon={playing ? 'pause' : 'play'}
          size={76}
          iconSize={46}
          accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
          onPress={togglePlaying}
        />
        <IconButton
          icon="play-forward"
          size={76}
          iconSize={42}
          accessibilityLabel="Próxima"
          onPress={next}
        />
      </View>
      <ProgressBar np={np} height={6} thumb={0} labelColor={c.textSecondary} showLabels={false} />
    </Material>
  );
}

function SearchPill() {
  const phone = usePhone();
  const system = useSystemInsets();
  const c = useColors();
  return (
    <Appear
      delay={60}
      fade={false}
      style={phone ? [PHONE.top, { top: layout.gutter + system.top }] : styles.topLeft}
    >
      <Material style={[styles.search, phone && { width: '100%' }]}>
        <Icon name="search" size={28} color={c.textSecondary} />
        <Text variant="body" tone="secondary">
          Buscar cliente ou endereço
        </Text>
      </Material>
    </Appear>
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

function TripBar({ mode, route }: { mode: MapMode; route?: LiveRoute | null }) {
  const phone = usePhone();
  const system = useSystemInsets();
  const router = useRouter();
  const time = route ? formatDuration(route.durationSeconds) : null;
  return (
    <Appear
      delay={160}
      fade={false}
      distance={40}
      style={phone ? [PHONE.trip, { top: 150 + system.top }] : styles.bottomLeft}
    >
      <Material style={styles.trip}>
        <Button
          label="Encerrar"
          variant="destructive"
          size="md"
          style={{ borderRadius: TRIP_INNER }}
          onPress={() => router.replace('/mapa')}
        />
        <View style={{ flexDirection: 'row', gap: spacing[8] }}>
          {route === undefined ? (
            <>
              <Stat value={mode === 'day' ? '11:58' : '09:59'} label="chegada" />
              <Stat value={mode === 'day' ? '1:12' : '18'} label={mode === 'day' ? 'hrs' : 'min'} />
              <Stat value={mode === 'day' ? '24,6' : '7,4'} label="km" />
            </>
          ) : (
            <>
              <Stat
                value={route ? formatArrival(route.durationSeconds) : '--:--'}
                label="chegada"
              />
              <Stat value={time?.value ?? '--'} label={time?.unit ?? 'min'} />
              <Stat value={route ? formatKm(route.distanceMeters) : '--'} label="km" />
            </>
          )}
        </View>
      </Material>
    </Appear>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text variant="title2">{value}</Text>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

/** Cartão do cliente com o destino escolhido: compacto, no pé do espaço do cartão. */
function ClientCard({
  client,
  mode,
  stopLabel,
  onNext,
  onPrevious,
}: {
  client: MockClient;
  mode: MapMode;
  stopLabel?: string;
  onNext?: () => void;
  onPrevious?: () => void;
}) {
  const c = useColors();
  const router = useRouter();
  const tile = c.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#FFFFFF';
  const district = client.district.split(' · ')[0];
  const square = (icon: IconName, label: string, onPress: () => void) => (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.step, { backgroundColor: tile }]}
    >
      <Icon name={icon} size={34} />
    </Touchable>
  );

  return (
    <Material style={styles.compact}>
      <Appear distance={10} style={styles.compactBody}>
        <View style={{ gap: spacing[4] }}>
          {stopLabel && (
            <Text variant="footnote" tone="secondary">
              {stopLabel}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
            <Avatar name={client.name} size={104} radius={COMPACT_INNER} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="title" numberOfLines={2}>
                {client.tradeName || client.name}
              </Text>
              <Text variant="subhead" tone="secondary" numberOfLines={2}>
                {[client.address, district].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        </View>
        {/* Resumo do cliente no meio do cartão (dados do Kyte). */}
        <View style={[styles.facts, { backgroundColor: tile }]}>
          {[
            { label: 'Última visita', value: client.lastVisit },
            { label: 'Última compra', value: client.lastPurchaseTotal },
            ...(client.order.length > 0
              ? [{ label: 'Pedido em aberto', value: `${client.order.length} itens` }]
              : []),
          ].map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.fact,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
              ]}
            >
              <Text variant="callout" tone="secondary" numberOfLines={1}>
                {f.label}
              </Text>
              <Text variant="headline" numberOfLines={1}>
                {f.value}
              </Text>
            </View>
          ))}
        </View>
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
          {mode === 'explore' && (
            <Button
              label="IR"
              icon="navigate"
              style={{ borderRadius: COMPACT_INNER }}
              onPress={() =>
                router.replace({ pathname: '/mapa', params: { rota: 'cliente', id: client.id } })
              }
            />
          )}
        </View>
      </Appear>
    </Material>
  );
}

/** Cartão inicial: nenhum cliente selecionado ainda. */
function WelcomeCard() {
  // "Escolher cliente" abre a lista dentro do próprio cartão (sem trocar de tela).
  const [picking, setPicking] = useState(false);
  const [planning, setPlanning] = useState(false);
  if (planning)
    return (
      <Material style={[styles.welcome, { justifyContent: 'flex-start' }]}>
        <RoutePlanner big onClose={() => setPlanning(false)} />
      </Material>
    );
  if (picking)
    return (
      <Material style={[styles.welcome, { justifyContent: 'flex-start' }]}>
        <ClientPicker onClose={() => setPicking(false)} />
      </Material>
    );
  // Ocupa a altura toda do espaço do cartão, com botões grandes para tocar dirigindo.
  return (
    <Material style={styles.welcome}>
      <View style={{ gap: spacing[3] }}>
        <Text variant="largeTitle" style={{ fontSize: 42, lineHeight: 50 }}>
          Para onde vamos?
        </Text>
        <Text variant="body" tone="secondary">
          Escolha um cliente para traçar o caminho até ele, ou monte as visitas de hoje e o GoClient
          organiza a rota.
        </Text>
      </View>
      <View style={{ gap: spacing[4] }}>
        <Button
          label="Escolher cliente"
          icon="storefront"
          size="xl"
          style={styles.welcomeButton}
          onPress={() => setPicking(true)}
        />
        <Button
          label="Montar rota do dia"
          icon="trail-sign"
          variant="tinted"
          size="xl"
          style={styles.welcomeButton}
          onPress={() => setPlanning(true)}
        />
      </View>
    </Material>
  );
}

/**
 * Bordas concêntricas dos cartões da multimídia: raio de dentro = raio de fora − espaçamento.
 * Cartão grande ("Para onde vamos?"): 56 − 32 = 24. Cartão do cliente: 48 − 24 = 24.
 * Barra da viagem: 32 − 16 = 16.
 */
const WELCOME_R = 56;
const COMPACT_R = 48;
const TRIP_R = layout.radius.xl;
const WELCOME_INNER = concentric(WELCOME_R, spacing[8]);
const COMPACT_INNER = concentric(COMPACT_R, spacing[6]);
const TRIP_INNER = concentric(TRIP_R, spacing[4]);

const LEFT = layout.sidebarWidth + layout.gutter;
/** Coluna de cartões à direita do mapa e o cartão da música (painel de bordo). */
const SIDE_W = 480;
const NOW_H = 176;
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
    padding: spacing[6],
    gap: spacing[4],
    justifyContent: 'center',
  },
  nowOpen: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  nowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  search: {
    height: 80,
    width: 500,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
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
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
    paddingVertical: spacing[4],
    paddingLeft: spacing[4],
    paddingRight: spacing[8],
    borderRadius: TRIP_R,
  },
  card: { flex: 1, borderRadius: 40, padding: spacing[8] },
  compact: { flex: 1, borderRadius: COMPACT_R, padding: spacing[6] },
  // Cabeçalho em cima e os botões no pé do cartão (que ocupa a coluna até embaixo).
  facts: { borderRadius: COMPACT_INNER, paddingHorizontal: spacing[5] },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  compactBody: { flex: 1, gap: spacing[5], justifyContent: 'space-between' },
  welcome: {
    flex: 1,
    borderRadius: WELCOME_R,
    padding: spacing[8],
    justifyContent: 'space-between',
  },
  welcomeButton: { height: 128, borderRadius: WELCOME_INNER },
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
