import { can } from '@goclient/core';
import { useRouter } from 'expo-router';
import { type ComponentRef, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { callPhone, openWhatsApp } from '../integrations/contact';
import { MAPS_ENABLED } from '../integrations/env';
import { usePhone, useSystemInsets } from '../layout/form-factor';
import { CarSearch } from '../map/car-search';
import { ClientPicker } from '../map/client-picker';
import { LiveMap, type MapPin } from '../map/live-map';
import { rememberMap, useMapNav } from '../map/map-nav';
import { NavCard } from '../map/nav-card';
import {
  secondsToFirstStop,
  type Guidance as TurnGuidance,
  useTurnByTurn,
} from '../map/navigation';
import { PannableMap } from '../map/pannable-map';
import { ExploreSheet, RouteSheet, type TripInfo } from '../map/phone-sheet';
import { RouteQueue } from '../map/route-queue';
import {
  formatArrival,
  formatDuration,
  formatKm,
  formatStepDistance,
  type LatLng,
} from '../map/routing';
import { OptionGroup, OptionRow, SavedRoutes } from '../map/saved-routes';
import { SheetLock } from '../map/sheet-context';
import { useStops } from '../map/stops';
import { districtOf, publishTrip } from '../map/trip';
import { useCarPosition, useClientPlaces, useLiveRoute } from '../map/use-live-map';
import { CLIENT_FOCUS, DAY_FOCUS, type MapMode, USER } from '../map/world';
import { CLIENTS, type MockClient } from '../mocks/data';
import { useKeptParams } from '../shell/kept-context';
import { concentric, layout, spacing, useColors } from '../theme';
import { BlurArea, BlurTargetProvider } from '../ui/blur-target';
import { Marquee } from '../ui/marquee';
import { Appear, appleEase, Presence, Swap } from '../ui/motion';
import {
  Avatar,
  Blur,
  Button,
  Icon,
  IconButton,
  type IconName,
  Material,
  Text,
  Touchable,
} from '../ui/primitives';
import { WhatsAppLogo } from '../whatsapp/brand';
import { recentMessages } from '../whatsapp/sim/data';
import { requestOpenChat } from '../whatsapp/sim/outbox';

/**
 * Tela inicial (Mapa): o mapa ocupa todo o fundo e os painéis flutuam por cima com
 * material translúcido. `?rota=cliente&id=c1` mostra a rota até um cliente;
 * `?rota=dia` mostra a rota do dia.
 */
export default function MapScreen() {
  const phone = usePhone();
  const { rota, id } = useKeptParams<{ rota?: string; id?: string }>();
  const mode: MapMode = rota === 'dia' ? 'day' : rota === 'cliente' ? 'client' : 'explore';
  useEffect(() => rememberMap({ rota, id }), [rota, id]);
  const [stop, setStop] = useState(0);
  const target = mode === 'explore' ? USER : mode === 'day' ? DAY_FOCUS : CLIENT_FOCUS;

  // Rota do dia: os clientes planejados + os postos na rota pelo Kyte ou pela Havena.
  const stops = useStops();
  // Regra 3: na multimídia a rota não é montada, mas as paradas podem ser reordenadas.
  const canReorder = can(
    { role: 'seller', platform: phone ? 'mobile' : 'automotive', channel: 'manual' },
    'route',
    'reorder',
  ).allowed;
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
  // Coluna da direita (multimídia): o início do "Para onde vamos?" é baixo e o WhatsApp
  // cresce; escolher cliente ou rota (ou ter um destino) aumenta o cartão de baixo.
  const [, setWelcomeCompact] = useState(true);
  const [homeH, setHomeH] = useState(0);
  // Altura do cartão de destino único (medida uma vez e guardada para as próximas).
  const [fitH, setFitH] = useState(savedFit);
  const setFit = useCallback((h: number) => {
    savedFit = h;
    setFitH(h);
  }, []);
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
  const single = !!client && !(mode === 'day' && routeClients.length > 1);

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
  // Dados da viagem: da rota real (OpenRouteService) ou os de exemplo do Preview.
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
      : live
        ? // App real com a rota ainda sendo calculada: sem número inventado.
          { arrival: '—', duration: { value: '—', unit: 'min' }, km: '—' }
        : mode === 'day'
          ? { arrival: '11:58', duration: { value: '1:12', unit: 'hrs' }, km: '24,6' }
          : { arrival: '09:59', duration: { value: '18', unit: 'min' }, km: '7,4' };
  const stopLabel =
    mode === 'day' && routeClients.length > 1
      ? `Parada ${wrap(stop, routeClients.length) + 1} de ${routeClients.length}`
      : undefined;

  // Conta ao Lucas quem é a próxima parada e quanto falta para chegar nela ("Lucas, avisa
  // o próximo cliente"). No Preview (sem mapa real), um tempo de exemplo.
  const firstStop = mode !== 'day' || wrap(stop, routeClients.length) === 0;
  const nextSeconds = !live
    ? mode === 'day'
      ? 6 * 60
      : 18 * 60
    : guidance
      ? guidance.toStopSeconds
      : route && firstStop
        ? secondsToFirstStop(route)
        : null;
  const nextMinute = nextSeconds === null ? null : Math.round(nextSeconds / 30);
  // biome-ignore lint/correctness/useExhaustiveDependencies: publica quando parada ou tempo mudam
  useEffect(() => {
    publishTrip(
      client
        ? {
            next: { name: client.name, district: districtOf(client), phone: client.phone },
            secondsToNext: nextSeconds,
            navigating,
            at: Date.now(),
          }
        : null,
    );
  }, [client?.id, nextMinute, navigating]);

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
                trip={client ? trip : undefined}
              />
            ) : (
              <Guidance trip={client ? trip : undefined} />
            )}
          </Presence>
          <Presence show={!client} distance={60} style={StyleSheet.absoluteFill}>
            <ExploreSheet />
          </Presence>
          {/* Navegando: o cartão do cliente vira o cartão compacto da navegação (um botão só
              para encerrar, recolhe sozinho e cresce ao toque). */}
          <Presence show={!!client && navigating} distance={60} style={StyleSheet.absoluteFill}>
            {client && navigating ? (
              <NavCard
                client={client}
                stopLabel={stopLabel}
                secondsToArrive={nextSeconds}
                onStop={() => setNavigating(false)}
              />
            ) : null}
          </Presence>
          <Presence show={!!client && !navigating} distance={60} style={StyleSheet.absoluteFill}>
            {client && !navigating ? (
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
  // coluna com o cartão do destino/cliente.
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

      {/* Coluna da direita: WhatsApp em cima e destino embaixo, sempre ocupando a coluna
          inteira. Com "Para onde vamos?" (cartão baixo) o WhatsApp cresce; ao escolher cliente
          ou rota (cartão alto) ele encolhe. Os dois mudam de forma juntos. */}
      <View style={styles.side}>
        <MorphColumn
          top={<WhatsAppCard />}
          // O WhatsApp fica sempre no tamanho de painel (pedido do usuário, 27/11): o cartão
          // de escolher cliente ou rota leva o resto da coluna.
          compact={false}
          compactHeight={homeH > 0 ? homeH + spacing[6] * 2 : 0}
          // Destino único (um cliente só): pouca informação, então o cartão fica do tamanho
          // dela (pedido de 27/11/2026).
          fit={single ? fitH : 0}
        >
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
                onReorder={
                  mode === 'day' && canReorder
                    ? (ids) => {
                        stops.reorder(ids);
                        setStop(Math.max(0, ids.indexOf(client.id)));
                      }
                    : undefined
                }
                // Setas só na rota do dia com mais de uma parada (destino único não tem).
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
                trip={trip}
                onClose={() => mapNav()}
                onFit={setFit}
              />
            ) : (
              <WelcomeCard onCompact={setWelcomeCompact} onHomeHeight={setHomeH} />
            )}
          </Swap>
        </MorphColumn>
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
      {/* "Ir" e "Encerrar" ficam sozinhos sobre o mapa, sem a moldura branca (pedido de
          27/11/2026), com fundo sólido e sombra leve para ter contraste. */}
      <Swap id={navigating ? 'stop' : 'go'} dir={navigating ? 1 : -1}>
        {navigating ? (
          <StopButton onPress={onStop} />
        ) : (
          <Button
            label="Ir"
            icon="navigate"
            size="xl"
            style={styles.tripButton}
            onPress={onNavigate}
          />
        )}
      </Swap>
    </Appear>
  );
}

/**
 * "Encerrar" da navegação: depois de 3 s se recolhe num quadrado só com o "×". A forma muda
 * suavemente (largura e conteúdo juntos, como a busca) e passa um desfoque no estilo da Apple
 * durante a troca. Tocar (grande ou recolhido) encerra a navegação.
 */
const STOP_W = 280;
const STOP_H = 100;
function StopButton({ onPress }: { onPress: () => void }) {
  const c = useColors();
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(p, {
        toValue: 1,
        duration: 620,
        easing: appleEase,
        // Largura não anda no driver nativo.
        useNativeDriver: false,
      }).start();
    }, 3000);
    return () => {
      clearTimeout(t);
      p.stopAnimation();
    };
  }, [p]);
  const fg = c.danger;
  const bg = c.mode === 'dark' ? '#3B1F1D' : '#FFE7E5';
  const width = p.interpolate({ inputRange: [0, 1], outputRange: [STOP_W, STOP_H] });
  const labelW = p.interpolate({
    inputRange: [0, 0.7],
    outputRange: [150, 0],
    extrapolate: 'clamp',
  });
  const labelO = p.interpolate({
    inputRange: [0, 0.35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const gap = p.interpolate({ inputRange: [0, 0.7], outputRange: [12, 0], extrapolate: 'clamp' });
  const stopO = p.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const xO = p.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const iconScale = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.7, 1] });
  // Desfoque de movimento: máximo no meio da troca de forma, nenhum nas pontas.
  const blurO = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const webBlur =
    Platform.OS === 'web'
      ? {
          filter: p.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['blur(0px)', 'blur(5px)', 'blur(0px)'],
          }),
        }
      : null;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel="Encerrar navegação"
      onPress={onPress}
      scaleTo={0.96}
    >
      <Animated.View
        style={[
          styles.stop,
          styles.floatShadow,
          { width, backgroundColor: bg, borderRadius: TRIP_R },
        ]}
      >
        <Animated.View style={[styles.stopRow, webBlur as object]}>
          <Animated.View style={{ width: 34, height: 34, transform: [{ scale: iconScale }] }}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: stopO }]}>
              <Icon name="stop-circle" size={32} color={fg} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: xO }]}>
              <Icon name="close" size={40} color={fg} />
            </Animated.View>
          </Animated.View>
          <Animated.View
            style={{ width: labelW, marginLeft: gap, opacity: labelO, overflow: 'hidden' }}
          >
            <Text variant="headline" color={fg} numberOfLines={1} style={{ width: 150 }}>
              Encerrar
            </Text>
          </Animated.View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: blurO }]}>
          <Blur radius={12} tint={c.material.tint} />
        </Animated.View>
      </Animated.View>
    </Touchable>
  );
}

/**
 * Cartão do WhatsApp (multimídia), no lugar do antigo mini player de música, no estilo dos
 * cartões do CarPlay: só a mensagem mais recente, com o logo do WhatsApp à esquerda, o nome do
 * cliente, a mensagem e o horário à direita. Tocar abre o WhatsApp.
 *
 * No Preview a mensagem vem do WhatsApp simulado (fictícia). No app instalado o WhatsApp Web
 * não expõe as conversas, então o cartão mostra só o atalho.
 */
const WA_RECENT = Platform.OS === 'web' ? recentMessages(6) : [];
const WA_LAST = WA_RECENT[0];

function WhatsAppCard() {
  const c = useColors();
  const router = useRouter();
  const [h, setH] = useState(0);
  const m = WA_LAST ?? { id: 'app', name: 'WhatsApp', text: 'Conversas da equipe', time: '' };
  // Cartão alto (destino de um cliente só deixa a coluna livre): mostra as últimas conversas
  // em vez de deixar espaço vazio (pedido de 27/11/2026).
  const ROW = 92;
  const rows = h > WA_H + ROW ? Math.min(WA_RECENT.length, Math.floor((h - 120) / ROW)) : 0;
  // Tocar numa conversa abre o WhatsApp direto nela (no Preview; no app o WhatsApp Web abre
  // na lista, porque o cartão não lê as conversas de verdade).
  const open = (chatId?: string) => {
    if (chatId && WA_RECENT.some((r) => r.id === chatId)) requestOpenChat(chatId);
    router.push('/whatsapp');
  };
  const shell = [
    styles.wa,
    { borderColor: c.material.border },
    rows > 0 && { justifyContent: 'flex-start' as const, paddingTop: spacing[6] },
  ];
  const bg = (
    <>
      <Blur radius={44} tint={c.material.tint} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.material.fallback }]} />
    </>
  );
  if (rows > 0)
    return (
      <View style={shell} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
        {bg}
        <View style={{ gap: spacing[3] }}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Abrir o WhatsApp"
            onPress={() => open()}
            scaleTo={0.98}
            style={styles.waRow}
          >
            <WhatsAppLogo size={64} />
            <Text variant="headline" style={{ fontSize: 30, lineHeight: 36, flex: 1 }}>
              WhatsApp
            </Text>
            <Icon name="chevron-forward" size={28} color={c.textTertiary} />
          </Touchable>
          {WA_RECENT.slice(0, rows).map((r, i) => (
            <Touchable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir a conversa com ${r.name}`}
              onPress={() => open(r.id)}
              scaleTo={0.98}
              style={[
                styles.waItem,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="headline" numberOfLines={1} style={{ fontSize: 26, lineHeight: 32 }}>
                  {r.name}
                </Text>
                <Text
                  variant="body"
                  tone="secondary"
                  numberOfLines={1}
                  style={{ fontSize: 22, lineHeight: 28 }}
                >
                  {r.text}
                </Text>
              </View>
              <Text variant="callout" tone="secondary" style={styles.waTime}>
                {r.time}
              </Text>
            </Touchable>
          ))}
        </View>
      </View>
    );
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`Abrir a conversa com ${m.name}`}
      onPress={() => open(m.id)}
      scaleTo={0.98}
      style={shell}
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
    >
      {bg}
      <View style={styles.waRow}>
        <WhatsAppLogo size={80} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" numberOfLines={1} style={{ fontSize: 30, lineHeight: 36 }}>
            {m.name}
          </Text>
          <Text
            variant="body"
            tone="secondary"
            numberOfLines={1}
            style={{ fontSize: 24, lineHeight: 30 }}
          >
            {m.text}
          </Text>
        </View>
        {!!m.time && (
          <Text variant="callout" tone="secondary" style={styles.waTime}>
            {m.time}
          </Text>
        )}
      </View>
    </Touchable>
  );
}

/**
 * Coluna da direita: cartão do WhatsApp em cima e o cartão de vidro do destino embaixo,
 * sempre preenchendo a coluna de cima a baixo. Quando o destino fica baixo ("Para onde
 * vamos?"), o WhatsApp cresce e ocupa o resto; quando o destino precisa de espaço (escolher
 * cliente, rotas, um destino), o WhatsApp volta ao tamanho de painel. As duas formas andam
 * juntas (altura e cantos) e um desfoque de movimento passa pelas duas no meio da troca. O
 * conteúdo do destino é montado já no tamanho final e a casca recorta, para nada se espremer
 * durante a animação.
 */
function MorphColumn({
  compact,
  compactHeight,
  fit = 0,
  top,
  children,
}: {
  compact: boolean;
  compactHeight: number;
  /** Altura do conteúdo (destino único): o cartão fica só desse tamanho, embaixo, e o
   * WhatsApp cresce e ocupa o resto da coluna com as últimas conversas. */
  fit?: number;
  top: ReactNode;
  children: ReactNode;
}) {
  const c = useColors();
  const [total, setTotal] = useState(0);
  const gap = layout.gutter;
  // Destino alto: o WhatsApp fica no tamanho de painel e o destino leva o resto.
  const big = Math.max(total - WA_H - gap, 0);
  // Início: o destino fica baixo, mas nunca deixa o WhatsApp passar de WA_HOME (divisão
  // parecida com a do CarPlay: cartão de cima menor, o de baixo maior).
  const small =
    compactHeight > 0 ? Math.min(Math.max(compactHeight, total - gap - WA_HOME), big) : big;
  const target = fit > 0 ? Math.min(fit, big) : compact ? small : big;
  const h = useRef(new Animated.Value(0)).current;
  const m = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (!total) return;
    if (first.current) {
      first.current = false;
      h.setValue(target);
      return;
    }
    m.setValue(0);
    Animated.parallel([
      Animated.timing(h, {
        toValue: target,
        duration: 560,
        easing: appleEase,
        useNativeDriver: false,
      }),
      Animated.timing(m, { toValue: 1, duration: 560, useNativeDriver: false }),
    ]).start();
  }, [target, total, h, m]);
  const topH = Animated.add(total - gap, Animated.multiply(h, -1));
  const blurO = m.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const webBlur =
    Platform.OS === 'web'
      ? {
          filter: m.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['blur(0px)', 'blur(6px)', 'blur(0px)'],
          }),
        }
      : null;
  const pulse = (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: blurO }]}>
      <Blur radius={18} tint={c.material.tint} />
    </Animated.View>
  );
  return (
    <View style={{ flex: 1 }} onLayout={(e) => setTotal(e.nativeEvent.layout.height)}>
      {total > 0 && (
        <>
          <Appear delay={160} distance={40} fade={false}>
            <Animated.View style={[styles.waShell, { height: topH }]}>
              <Animated.View style={[{ flex: 1 }, webBlur as object]}>{top}</Animated.View>
              {pulse}
            </Animated.View>
          </Appear>
          <Animated.View
            style={[styles.morph, { height: h, marginTop: gap, borderColor: c.material.border }]}
          >
            <Blur radius={44} tint={c.material.tint} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.material.fallback }]} />
            <Animated.View
              style={[
                { height: fit > 0 ? target : compact ? Math.max(target, 1) : big },
                webBlur as object,
              ]}
            >
              {children}
            </Animated.View>
            {pulse}
          </Animated.View>
        </>
      )}
    </View>
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
  onReorder,
  onNext,
  onPrevious,
  trip,
  onClose,
  onFit,
}: {
  client: MockClient;
  mode: MapMode;
  stopLabel?: string;
  /** Clientes da rota, na ordem (só na rota do dia com mais de uma parada). */
  queue: MockClient[];
  current: number;
  onPick: (index: number) => void;
  /** Reordenar as paradas (só na rota do dia e se `can()` deixar). */
  onReorder?: (ids: string[]) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  /** Chegada, tempo e distância (o botão "Ir" fica no canto do mapa). */
  trip: TripInfo;
  onClose: () => void;
  /** Destino único: avisa a altura do conteúdo para o cartão ficar só desse tamanho. */
  onFit?: (height: number) => void;
}) {
  const c = useColors();
  const [list, setList] = useState(false);
  const [dragging, setDragging] = useState(false);
  const lockScroll = useCallback((locked: boolean) => setDragging(locked), []);
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

  if (!hasQueue) {
    // Destino único: cartão baixo e horizontal, do tamanho do que tem para mostrar.
    return (
      <View
        style={styles.fitCard}
        onLayout={(e) => onFit?.(Math.ceil(e.nativeEvent.layout.height))}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
          <Avatar name={client.name} size={104} radius={COMPACT_INNER} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text variant="headline" tone="secondary" style={{ fontSize: 22, lineHeight: 28 }}>
              {stopLabel ?? 'Destino'}
            </Text>
            <Text variant="title" numberOfLines={1} style={{ fontSize: 36, lineHeight: 42 }}>
              {client.tradeName || client.name}
            </Text>
            <Marquee
              text={[client.address, district].filter(Boolean).join(' · ')}
              lineHeight={30}
              style={{ fontSize: 24 }}
            />
          </View>
          <IconButton
            icon="close"
            size={56}
            iconSize={30}
            variant="gray"
            accessibilityLabel="Fechar destino"
            onPress={onClose}
          />
        </View>
        <View style={[styles.tripStats, { backgroundColor: tile }]}>
          <Stat value={trip.arrival} label="chegada" />
          <Stat value={trip.duration.value} label={trip.duration.unit} />
          <Stat value={trip.km} label="km" />
        </View>
        {client.phone ? (
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <Touchable
              accessibilityRole="button"
              onPress={() => callPhone(client.phone)}
              style={[styles.wideAction, { backgroundColor: tile }]}
            >
              <Icon name="call" size={34} />
              <Text variant="headline" style={{ fontSize: 26 }}>
                Ligar
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              onPress={() => openWhatsApp(client.phone)}
              style={[styles.wideAction, { backgroundColor: tile }]}
            >
              <Icon name="logo-whatsapp" size={34} />
              <Text variant="headline" style={{ fontSize: 26 }}>
                WhatsApp
              </Text>
            </Touchable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.compact}>
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
          <IconButton
            icon="close"
            size={56}
            iconSize={30}
            variant="gray"
            accessibilityLabel="Fechar destino"
            onPress={onClose}
          />
        )}
        <Text variant="headline" tone="secondary" style={{ fontSize: 24, lineHeight: 30 }}>
          {stopLabel ?? 'Destino'}
        </Text>
      </View>
      <Swap id={list ? 'list' : 'card'} dir={list ? 1 : -1} style={{ flex: 1 }}>
        {list ? (
          // Fila da rota: tocar vai para a parada; a alça (≡) arrasta para mudar a ordem.
          <SheetLock.Provider value={lockScroll}>
            <ScrollView
              scrollEnabled={!dragging}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing[2] }}
            >
              <RouteQueue
                car
                clients={queue}
                currentId={client.id}
                radius={COMPACT_INNER}
                background={tile}
                onReorder={onReorder}
                onPick={(id) => {
                  const i = queue.findIndex((q) => q.id === id);
                  if (i === current) setList(false);
                  else if (i >= 0) onPick(i);
                }}
              />
            </ScrollView>
          </SheetLock.Provider>
        ) : (
          <View style={styles.compactBody}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] }}>
              <Avatar name={client.name} size={120} radius={COMPACT_INNER} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="title" numberOfLines={2} style={{ fontSize: 40, lineHeight: 46 }}>
                  {client.tradeName || client.name}
                </Text>
                {/* Endereço numa linha só: quando não cabe, passa como um carrossel. */}
                <Marquee
                  text={[client.address, district].filter(Boolean).join(' · ')}
                  lineHeight={30}
                  style={{ fontSize: 24 }}
                />
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
    </View>
  );
}

/**
 * Cartão inicial (multimídia), no estilo dos cartões do Apple Maps: título e uma lista
 * agrupada com linhas grandes, todas no azul do app. Regra 3: a multimídia não monta rotas —
 * só escolhe um cliente ou começa uma rota montada no celular.
 */
function WelcomeCard({
  onCompact,
  onHomeHeight,
}: {
  /** O cartão fica baixo (só o início) ou cresce (listas de clientes e rotas). */
  onCompact: (compact: boolean) => void;
  /** Altura do conteúdo do início, para o cartão ter só esse tamanho. */
  onHomeHeight: (h: number) => void;
}) {
  const stops = useStops();
  const [view, setView] = useState<'home' | 'pick' | 'routes'>('home');
  const count = stops.saved.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: avisa só na troca de tela
  useEffect(() => onCompact(view === 'home'), [view]);
  // Mesma transição da aba "Rotas" do celular: o atual sai deslizando e o novo entra.
  return (
    <View style={styles.welcome}>
      <Swap id={view} dir={view === 'home' ? -1 : 1} style={{ flex: 1, gap: spacing[5] }}>
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
          // Só o título e as opções: o cartão fica baixo e o WhatsApp ocupa o resto em cima.
          <View
            style={{ flex: 1, gap: spacing[6], justifyContent: 'space-between' }}
            onLayout={(e) => onHomeHeight(e.nativeEvent.layout.height)}
          >
            <View style={{ gap: spacing[2] }}>
              <Text variant="largeTitle" style={{ fontSize: 50, lineHeight: 58 }}>
                Para onde vamos?
              </Text>
              <Text variant="body" tone="secondary" style={{ fontSize: 28, lineHeight: 34 }}>
                Escolha um cliente ou uma rota montada.
              </Text>
            </View>
            <OptionGroup outerRadius={WELCOME_R} outerPadding={spacing[6]}>
              <OptionRow
                first
                big
                strong
                icon="person"
                title="Escolher cliente"
                sub="Traçar o caminho até ele"
                onPress={() => setView('pick')}
              />
              <OptionRow
                big
                icon="map"
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
          </View>
        )}
      </Swap>
    </View>
  );
}

/**
 * Bordas concêntricas dos cartões da multimídia: raio de dentro = raio de fora − espaçamento.
 * Cartão grande ("Para onde vamos?"): 56 − 24 = 32. Cartão do cliente: 48 − 24 = 24.
 * Barra da viagem: 32 − 16 = 16.
 */
const WELCOME_R = 48;
const COMPACT_R = 48;
const TRIP_R = layout.radius.xl;
const COMPACT_INNER = concentric(COMPACT_R, spacing[6]);

const LEFT = layout.sidebarWidth + layout.gutter;
/** Coluna de cartões à direita do mapa. */
const SIDE_W = 520;
/** Cartão do WhatsApp no tamanho de painel (quando o cartão de baixo cresce). */
const WA_H = 136;
let savedFit = 0;
/** Altura do cartão do WhatsApp no início ("Para onde vamos?"). */
const WA_HOME = 300;
const WA_R = 48;
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
  stop: { height: STOP_H, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  stopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  tripButton: {
    borderRadius: TRIP_R,
    width: STOP_W,
    height: STOP_H,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  floatShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  card: { flex: 1, borderRadius: 40, padding: spacing[8] },
  compact: { flex: 1, padding: spacing[6] },
  fitCard: { padding: spacing[6], gap: spacing[4] },
  morph: { borderRadius: COMPACT_R, overflow: 'hidden', borderWidth: 1 },
  waShell: { borderRadius: WA_R, overflow: 'hidden' },
  wa: {
    flex: 1,
    borderRadius: WA_R,
    overflow: 'hidden',
    borderWidth: 1,
    paddingHorizontal: spacing[6],
    justifyContent: 'center',
  },
  waRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
  waTime: { alignSelf: 'flex-start', marginTop: spacing[1] },
  waItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], height: 92 },
  wideAction: {
    flex: 1,
    height: 84,
    borderRadius: COMPACT_INNER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: COMPACT_INNER,
    paddingVertical: spacing[3],
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
