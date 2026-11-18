import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PannableMap } from '../../map/pannable-map';
import { CLIENT_FOCUS, DAY_FOCUS, type MapMode, USER } from '../../map/world';
import { CLIENTS, type MockClient, TODAY_ROUTE } from '../../mocks/data';
import { layout, spacing, useColors } from '../../theme';
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
  const { rota, id } = useLocalSearchParams<{ rota?: string; id?: string }>();
  const mode: MapMode = rota === 'dia' ? 'day' : rota === 'cliente' ? 'client' : 'explore';
  const [stop, setStop] = useState(0);
  const target = mode === 'explore' ? USER : mode === 'day' ? DAY_FOCUS : CLIENT_FOCUS;

  const routeClients = TODAY_ROUTE.map((cid) => CLIENTS.find((c) => c.id === cid) as MockClient);
  const client =
    mode === 'day'
      ? (routeClients[stop % routeClients.length] as MockClient)
      : (CLIENTS.find((c) => c.id === id) ?? (CLIENTS[6] as MockClient));

  return (
    <View style={{ flex: 1 }}>
      {/* O foco é deslocado para a direita para que o conteúdo fique centrado na área livre à esquerda do cartão. */}
      <PannableMap mode={mode} focus={{ x: target.x + FOCUS_SHIFT, y: target.y }} />

      {mode === 'explore' ? <SearchPill /> : <Guidance />}
      {mode !== 'explore' && <TripBar mode={mode} />}

      <Appear axis="x" distance={40} delay={120} style={styles.cardSlot}>
        <ClientCard
          key={client.id}
          client={client}
          mode={mode}
          stopLabel={
            mode === 'day'
              ? `Parada ${(stop % routeClients.length) + 1} de ${routeClients.length}`
              : undefined
          }
          onNext={() => setStop((s) => s + 1)}
        />
      </Appear>
    </View>
  );
}

function SearchPill() {
  const c = useColors();
  return (
    <Appear delay={60} style={styles.topLeft}>
      <Material style={styles.search}>
        <Icon name="search" size={28} color={c.textSecondary} />
        <Text variant="body" tone="secondary">
          Buscar cliente ou endereço
        </Text>
      </Material>
    </Appear>
  );
}

function Guidance() {
  const c = useColors();
  return (
    <Appear delay={60} style={styles.topLeft}>
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

function TripBar({ mode }: { mode: MapMode }) {
  const router = useRouter();
  return (
    <Appear delay={160} style={styles.bottomLeft}>
      <Material style={styles.trip}>
        <View style={{ flexDirection: 'row', gap: spacing[8] }}>
          <Stat value={mode === 'day' ? '11:58' : '09:59'} label="chegada" />
          <Stat value={mode === 'day' ? '1:12' : '18'} label={mode === 'day' ? 'hrs' : 'min'} />
          <Stat value={mode === 'day' ? '24,6' : '7,4'} label="km" />
        </View>
        <Button
          label="Encerrar"
          variant="destructive"
          size="md"
          onPress={() => router.replace('/mapa')}
        />
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
}: {
  client: MockClient;
  mode: MapMode;
  stopLabel?: string;
  onNext: () => void;
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
        <Touchable
          accessibilityRole="button"
          onPress={onNext}
          style={[styles.next, { backgroundColor: tile }]}
        >
          <Text variant="title2" style={{ letterSpacing: 0.5 }}>
            PRÓXIMO CLIENTE
          </Text>
        </Touchable>
      )}
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
    paddingLeft: spacing[8],
    paddingRight: spacing[4],
    borderRadius: layout.radius.xl,
  },
  card: { flex: 1, borderRadius: 40, padding: spacing[8] },
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
});
