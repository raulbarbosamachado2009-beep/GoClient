import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOGLE_MAPS_ENABLED } from '../../integrations/env';
import {
  TAB_BAR_HEIGHT,
  usePhone,
  useSystemInsets,
  useTabBarSpace,
} from '../../layout/form-factor';
import {
  formatArrival,
  formatDuration,
  formatKm,
  type LatLng,
  type LiveRoute,
  openInGoogleMaps,
} from '../../map/google';
import { GoogleMap, type MapPin } from '../../map/google-map';
import { PannableMap } from '../../map/pannable-map';
import { ExploreSheet, RouteSheet, type TripInfo } from '../../map/phone-sheet';
import { useCarPosition, useClientPlaces, useLiveRoute } from '../../map/use-live-map';
import { CLIENT_FOCUS, DAY_FOCUS, type MapMode, USER } from '../../map/world';
import { CLIENTS, type MockClient, TODAY_ROUTE } from '../../mocks/data';
import { layout, spacing, useColors } from '../../theme';
import { BlurArea, BlurTargetProvider } from '../../ui/blur-target';
import { Appear } from '../../ui/motion';
import {
  Avatar,
  Button,
  Icon,
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
  const tabSpace = useTabBarSpace();
  const { rota, id } = useLocalSearchParams<{ rota?: string; id?: string }>();
  const mode: MapMode = rota === 'dia' ? 'day' : rota === 'cliente' ? 'client' : 'explore';
  const [stop, setStop] = useState(0);
  const target = mode === 'explore' ? USER : mode === 'day' ? DAY_FOCUS : CLIENT_FOCUS;

  const plannedDay = TODAY_ROUTE.map((cid) => CLIENTS.find((c) => c.id === cid) as MockClient);
  const picked = CLIENTS.find((c) => c.id === id) ?? null;

  // Mapa real (compilação com chave do Google): GPS, endereços dos clientes e rota.
  const live = GOOGLE_MAPS_ENABLED;
  const c = useColors();
  const { position } = useCarPosition(live);
  const places = useClientPlaces(live ? CLIENTS : [], live);
  const targets = mode === 'day' ? plannedDay : mode === 'client' && picked ? [picked] : [];
  const located = targets.filter((t) => places[t.id]);
  const { route, error: routeError } = useLiveRoute(
    live && mode !== 'explore' ? position : null,
    located.map((t) => places[t.id] as LatLng),
    mode === 'day',
  );
  // Na rota do dia, segue a ordem otimizada pelo Google (o último cliente continua o último).
  const routeClients =
    live && mode === 'day' && route && located.length > 1
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
  const navigate = () => {
    const from = mode === 'day' ? wrap(stop, routeClients.length) : 0;
    const coords = routeClients
      .slice(from)
      .map((x) => places[x.id])
      .filter((p): p is LatLng => !!p);
    openInGoogleMaps(
      mode === 'day' ? coords : client && places[client.id] ? [places[client.id] as LatLng] : [],
    );
  };

  const mapArea = useRef<ComponentRef<typeof View>>(null);
  const router = useRouter();
  // Dados da viagem: da rota real (Google) ou os de exemplo do protótipo.
  const liveTime = live && route ? formatDuration(route.durationSeconds) : null;
  const trip: TripInfo =
    live && route && liveTime
      ? {
          arrival: formatArrival(route.durationSeconds),
          duration: liveTime,
          km: formatKm(route.distanceMeters),
        }
      : mode === 'day'
        ? { arrival: '11:58', duration: { value: '1:12', unit: 'hrs' }, km: '24,6' }
        : { arrival: '09:59', duration: { value: '18', unit: 'min' }, km: '7,4' };
  const stopLabel =
    mode === 'day'
      ? `Parada ${wrap(stop, routeClients.length) + 1} de ${routeClients.length}`
      : undefined;

  // Celular em pé: mapa aberto + aba puxável (estilo Apple Maps) no lugar dos cartões.
  if (phone) {
    return (
      <View style={{ flex: 1 }}>
        <BlurArea targetRef={mapArea} style={StyleSheet.absoluteFill}>
          {live ? (
            <GoogleMap
              dark={c.mode === 'dark'}
              user={position}
              path={route?.path ?? []}
              pins={pins}
            />
          ) : (
            <PannableMap mode={mode} focus={{ x: target.x, y: target.y + 220 }} />
          )}
        </BlurArea>
        <BlurTargetProvider value={mapArea}>
          {mode !== 'explore' &&
            (live ? (
              <LiveGuidance
                to={client?.name ?? ''}
                status={
                  !position
                    ? 'Aguardando o GPS…'
                    : routeError
                      ? routeError
                      : !route
                        ? 'Calculando o caminho…'
                        : 'Navegação com voz pelo Google Maps'
                }
              />
            ) : (
              <Guidance />
            ))}
          {client ? (
            <RouteSheet
              client={client}
              stopLabel={stopLabel}
              trip={trip}
              onNext={mode === 'day' ? () => setStop((s) => s + 1) : undefined}
              onPrevious={mode === 'day' ? () => setStop((s) => s - 1) : undefined}
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

  return (
    <View style={{ flex: 1 }}>
      {/* O foco é deslocado para a direita para que o conteúdo fique centrado na área livre à esquerda do cartão. */}
      <BlurArea targetRef={mapArea} style={StyleSheet.absoluteFill}>
        {live ? (
          <GoogleMap
            dark={c.mode === 'dark'}
            user={position}
            path={route?.path ?? []}
            pins={pins}
          />
        ) : (
          <PannableMap
            mode={mode}
            focus={
              phone
                ? { x: target.x, y: target.y + 280 }
                : { x: target.x + FOCUS_SHIFT, y: target.y }
            }
          />
        )}
      </BlurArea>
      {/* Os cartões por cima desfocam o mapa (no Android, ver ui/blur-target.tsx). */}
      <BlurTargetProvider value={mapArea}>
        {mode === 'explore' ? (
          <SearchPill />
        ) : live ? (
          <LiveGuidance
            to={client?.name ?? ''}
            status={
              !position
                ? 'Aguardando o GPS…'
                : routeError
                  ? routeError
                  : !route
                    ? located.length < targets.length
                      ? 'Localizando o endereço…'
                      : 'Calculando o caminho…'
                    : 'Navegação com voz pelo Google Maps'
            }
            onNavigate={located.length > 0 ? navigate : undefined}
          />
        ) : (
          <Guidance />
        )}
        {mode !== 'explore' && <TripBar mode={mode} route={live ? route : undefined} />}

        <Appear
          axis="x"
          distance={520}
          delay={80}
          duration={520}
          fade={false}
          style={
            phone
              ? [PHONE.card, { height: client ? 620 : 500, bottom: tabSpace + layout.gutter }]
              : styles.cardSlot
          }
        >
          {client ? (
            <ClientCard
              key={client.id}
              client={client}
              mode={mode}
              stopLabel={
                mode === 'day'
                  ? `Parada ${wrap(stop, routeClients.length) + 1} de ${routeClients.length}`
                  : undefined
              }
              onNext={() => setStop((s) => s + 1)}
              onPrevious={() => setStop((s) => s - 1)}
            />
          ) : (
            <WelcomeCard />
          )}
        </Appear>
      </BlurTargetProvider>
    </View>
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

function Guidance() {
  const phone = usePhone();
  const system = useSystemInsets();
  const c = useColors();
  return (
    <Appear
      delay={60}
      fade={false}
      style={phone ? [PHONE.top, { top: layout.gutter + system.top }] : styles.topLeft}
    >
      <Material style={styles.guidance}>
        <Icon name="return-up-forward" size={64} color={c.text} />
        <View>
          <Text variant="largeTitle" style={{ fontSize: 48, lineHeight: 54 }}>
            350 m
          </Text>
          <Text variant="headline" tone="secondary">
            Av. das Palmeiras
          </Text>
        </View>
      </Material>
    </Appear>
  );
}

/** Mapa real: destino atual e o botão que abre o Google Maps já navegando, com voz. */
function LiveGuidance({
  to,
  status,
  onNavigate,
}: {
  to: string;
  status: string;
  onNavigate?: () => void;
}) {
  const phone = usePhone();
  const system = useSystemInsets();
  const c = useColors();
  return (
    <Appear
      delay={60}
      fade={false}
      style={phone ? [PHONE.top, { top: layout.gutter + system.top }] : styles.topLeft}
    >
      <Material style={[styles.guidance, { maxWidth: 820 }]}>
        <Icon name="navigate" size={56} color={c.accent} />
        <View style={{ flexShrink: 1 }}>
          <Text variant="title2" numberOfLines={1}>
            {to}
          </Text>
          <Text variant="headline" tone="secondary" numberOfLines={2}>
            {status}
          </Text>
        </View>
        {onNavigate && <Button label="Navegar" icon="navigate" size="md" onPress={onNavigate} />}
      </Material>
    </Appear>
  );
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

/** Cartão do cliente (referência: imagem 2) — flutua sobre o mapa com fundo desfocado. */
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
  onNext: () => void;
  onPrevious: () => void;
}) {
  const c = useColors();
  const router = useRouter();
  const active = client.status === 'Ativo';
  const tile = c.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#FFFFFF';

  return (
    <Material style={styles.card}>
      <Appear distance={10}>
        {stopLabel && (
          <Text variant="footnote" tone="secondary" style={{ marginBottom: spacing[3] }}>
            {stopLabel}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[5] }}>
          <View style={[styles.avatarTile, { backgroundColor: tile }]}>
            <Avatar name={client.name} size={84} square />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="title2" numberOfLines={2}>
              {client.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <View
                style={[styles.dot, { backgroundColor: active ? c.success : c.textTertiary }]}
              />
              <Text variant="headline">{client.status}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: spacing[8], gap: spacing[2] }}>
          <Text variant="title2">Pedido</Text>
          {client.order.map((line) => (
            <Text key={line} variant="body" numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>

        <View style={{ marginTop: spacing[8], gap: spacing[4] }}>
          <InfoLine
            icon="location"
            tile={tile}
            text={client.address}
            sub={client.district.split(' · ')[0]}
          />
          <InfoLine icon="call" tile={tile} text={client.phone.replace(/^\(/, '(+55) (')} />
        </View>
      </Appear>

      <View style={{ flex: 1, minHeight: spacing[6] }} />

      {mode === 'explore' ? (
        <Button
          label="IR"
          icon="navigate"
          onPress={() =>
            router.replace({ pathname: '/mapa', params: { rota: 'cliente', id: client.id } })
          }
        />
      ) : (
        <View style={styles.stepRow}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Cliente anterior"
            onPress={onPrevious}
            style={[styles.step, { backgroundColor: tile }]}
          >
            <Icon name="chevron-back" size={40} />
          </Touchable>
          <Touchable
            accessibilityRole="button"
            onPress={onNext}
            style={[styles.next, { flex: 1, backgroundColor: tile }]}
          >
            <Text variant="headline" numberOfLines={1} style={{ fontSize: 24, letterSpacing: 0.3 }}>
              PRÓXIMO CLIENTE
            </Text>
          </Touchable>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Próximo cliente"
            onPress={onNext}
            style={[styles.step, { backgroundColor: tile }]}
          >
            <Icon name="chevron-forward" size={40} />
          </Touchable>
        </View>
      )}
    </Material>
  );
}

/** Cartão inicial: nenhum cliente selecionado ainda. */
function WelcomeCard() {
  const router = useRouter();
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
          onPress={() => router.replace('/clientes')}
        />
        <Button
          label="Montar rota do dia"
          icon="trail-sign"
          variant="tinted"
          size="xl"
          style={styles.welcomeButton}
          onPress={() => router.replace('/rotas')}
        />
      </View>
    </Material>
  );
}

function InfoLine({
  icon,
  tile,
  text,
  sub,
}: {
  icon: IconName;
  tile: string;
  text: string;
  sub?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
      <View style={[styles.iconTile, { backgroundColor: tile }]}>
        <Icon name={icon} size={30} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" numberOfLines={1}>
          {text}
        </Text>
        {sub && (
          <Text variant="body" numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
}

/** Desloca a câmera para centralizar o conteúdo na área livre entre a barra lateral e o cartão. */
const FOCUS_SHIFT = 190;
const LEFT = layout.sidebarWidth + layout.gutter;

/** Celular em pé: busca/orientação no topo, cartão embaixo (acima das abas). */
const PHONE = StyleSheet.create({
  top: { position: 'absolute', top: layout.gutter, left: layout.gutter, right: layout.gutter },
  trip: { position: 'absolute', top: 150, left: layout.gutter, right: layout.gutter },
  card: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
    bottom: TAB_BAR_HEIGHT + layout.gutter,
  },
});

const styles = StyleSheet.create({
  topLeft: { position: 'absolute', top: layout.gutter, left: LEFT },
  bottomLeft: { position: 'absolute', bottom: layout.gutter, left: LEFT },
  cardSlot: {
    position: 'absolute',
    top: layout.gutter,
    right: layout.gutter,
    bottom: layout.gutter,
    width: 480,
  },
  search: {
    height: 80,
    width: 500,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
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
    borderRadius: layout.radius.xl,
  },
  card: { flex: 1, borderRadius: 40, padding: spacing[8] },
  welcome: {
    flex: 1,
    borderRadius: 40,
    padding: spacing[8],
    justifyContent: 'space-between',
  },
  welcomeButton: { height: 128, borderRadius: 28 },
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
  step: { width: 80, height: 96, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});

/** Índice circular (aceita negativos): anterior do primeiro volta para o último. */
function wrap(i: number, n: number): number {
  return ((i % n) + n) % n;
}
