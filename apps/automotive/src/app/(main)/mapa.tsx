import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { type MapMode, StylizedMap } from '../../map/stylized-map';
import { CLIENTS, type MockClient, TODAY_ROUTE } from '../../mocks/data';
import { colors, layout, radius, spacing } from '../../theme';
import {
  Avatar,
  Button,
  Card,
  Divider,
  Icon,
  IconButton,
  Tag,
  Text,
  Touchable,
} from '../../ui/primitives';

/**
 * Tela inicial: mapa no centro e painel do cliente à direita (referência: imagem 1).
 * `?rota=cliente&id=c1` mostra a rota até um cliente; `?rota=dia` mostra a rota do dia.
 */
export default function MapScreen() {
  const { rota, id } = useLocalSearchParams<{ rota?: string; id?: string }>();
  const mode: MapMode = rota === 'dia' ? 'day' : rota === 'cliente' ? 'client' : 'explore';
  const client = CLIENTS.find((c) => c.id === id) ?? (CLIENTS[6] as MockClient);

  return (
    <View style={styles.page}>
      <View style={styles.mapPanel}>
        <StylizedMap mode={mode} />
        <MapOverlay mode={mode} client={client} />
      </View>
      <View style={styles.side}>
        {mode === 'day' ? (
          <DayRoutePanel />
        ) : (
          <ClientPanel client={client} navigating={mode === 'client'} />
        )}
      </View>
    </View>
  );
}

function MapOverlay({ mode, client }: { mode: MapMode; client: MockClient }) {
  const router = useRouter();
  return (
    <>
      {mode === 'explore' ? (
        <Touchable style={[styles.floating, styles.searchPill]} accessibilityRole="search">
          <Icon name="search" size={30} color={colors.textSecondary} />
          <Text variant="body" tone="tertiary">
            Buscar cliente ou endereço
          </Text>
        </Touchable>
      ) : (
        <View style={[styles.floating, styles.maneuver]}>
          <View style={styles.maneuverIcon}>
            <Icon name="return-up-forward" size={52} color="#FFFFFF" />
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="display" style={{ fontSize: 48, lineHeight: 54 }}>
              350 m
            </Text>
            <Text variant="headline" tone="secondary">
              Vire à direita na Av. das Palmeiras
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.controls]}>
        <IconButton
          icon="add"
          variant="filled"
          style={styles.controlBtn}
          accessibilityLabel="Aproximar"
        />
        <IconButton
          icon="remove"
          variant="filled"
          style={styles.controlBtn}
          accessibilityLabel="Afastar"
        />
        <IconButton
          icon="locate"
          variant="filled"
          style={styles.controlBtn}
          accessibilityLabel="Centralizar"
        />
      </View>

      {mode !== 'explore' && (
        <View style={[styles.floating, styles.trip]}>
          <View>
            <Text variant="title" tone="success">
              {mode === 'day' ? '1 h 12 min' : '18 min'}
            </Text>
            <Text variant="callout" tone="secondary">
              {mode === 'day'
                ? '24,6 km · 5 paradas · término 11:58'
                : `7,4 km · chegada 09:59 · ${client.tradeName}`}
            </Text>
          </View>
          <Button
            label="Encerrar"
            variant="danger"
            size="md"
            onPress={() => router.replace('/mapa')}
          />
        </View>
      )}
    </>
  );
}

function ClientPanel({ client, navigating }: { client: MockClient; navigating: boolean }) {
  const router = useRouter();
  return (
    <>
      <Card style={styles.clientCard}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text variant="label" tone={navigating ? 'accent' : 'tertiary'}>
            {navigating ? 'A CAMINHO' : 'PRÓXIMA VISITA · 10:30'}
          </Text>
          <Tag label={client.region} icon="location-outline" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
          <Avatar name={client.name} size={88} />
          <View style={{ flex: 1 }}>
            <Text variant="headline" numberOfLines={1}>
              {client.tradeName}
            </Text>
            <Text variant="callout" tone="secondary" numberOfLines={1}>
              {client.name}
            </Text>
          </View>
        </View>
        <View style={{ gap: spacing[2] }}>
          <InfoRow icon="location-outline" text={client.address} sub={client.district} />
          <InfoRow icon="time-outline" text={`Última visita ${client.lastVisit}`} />
          <InfoRow icon="receipt-outline" text={`Última compra ${client.lastPurchaseTotal}`} />
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          {[
            ['Ticket médio', 'R$ 5.140'],
            ['Pedidos no ano', '14'],
          ].map(([label, value]) => (
            <View key={label} style={styles.stat}>
              <Text variant="caption" tone="tertiary">
                {label}
              </Text>
              <Text variant="headline">{value}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          {navigating ? (
            <Button label="Cheguei" icon="flag" style={{ flex: 1 }} />
          ) : (
            <Button
              label="IR"
              icon="navigate"
              style={{ flex: 1 }}
              onPress={() =>
                router.replace({ pathname: '/mapa', params: { rota: 'cliente', id: client.id } })
              }
            />
          )}
          <IconButton
            icon="logo-whatsapp"
            size={88}
            iconSize={40}
            color={colors.success}
            accessibilityLabel="WhatsApp"
          />
        </View>
      </Card>

      <Card style={{ padding: spacing[5], gap: spacing[3] }}>
        <Text variant="label" tone="tertiary">
          AGENDA DE HOJE
        </Text>
        {[
          ['10:30', 'Rocha Concept Store'],
          ['11:40', 'Boutique Albuquerque'],
          ['14:00', 'Santana Calçados & Cia'],
        ].map(([time, name], i) => (
          <View key={name}>
            {i > 0 && <Divider />}
            <View style={{ flexDirection: 'row', gap: spacing[4], paddingVertical: spacing[2] }}>
              <Text variant="bodyStrong" tone="accent" style={{ width: 80 }}>
                {time}
              </Text>
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {name}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

function DayRoutePanel() {
  const stops = TODAY_ROUTE.map((id) => CLIENTS.find((c) => c.id === id) as MockClient);
  const etas = ['09:58', '10:34', '11:02', '11:31', '11:58'];
  return (
    <Card style={{ flex: 1, padding: spacing[6], gap: spacing[4] }}>
      <View>
        <Text variant="label" tone="accent">
          ROTA DE HOJE
        </Text>
        <Text variant="headline">5 paradas · 24,6 km</Text>
      </View>
      <ScrollView contentContainerStyle={{ gap: spacing[1] }} showsVerticalScrollIndicator={false}>
        {stops.map((c, i) => (
          <View key={c.id} style={[styles.stop, i === 0 && { backgroundColor: colors.panelHigh }]}>
            <View style={[styles.stopNumber, i === 0 && { backgroundColor: colors.accent }]}>
              <Text variant="bodyStrong" color={i === 0 ? '#FFFFFF' : colors.text}>
                {i + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {c.tradeName}
              </Text>
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {c.address}
              </Text>
            </View>
            <Text variant="callout" tone={i === 0 ? 'accent' : 'secondary'}>
              {etas[i]}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

function InfoRow({
  icon,
  text,
  sub,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  text: string;
  sub?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing[3] }}>
      <Icon name={icon} size={26} color={colors.textTertiary} />
      <View style={{ flex: 1 }}>
        <Text variant="callout" numberOfLines={1}>
          {text}
        </Text>
        {sub && (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', padding: layout.gutter, gap: layout.gutter },
  mapPanel: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  side: { width: 470, gap: layout.gutter },
  floating: {
    position: 'absolute',
    backgroundColor: 'rgba(20,20,22,0.94)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPill: {
    top: 24,
    left: 24,
    height: 84,
    width: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  maneuver: {
    top: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    padding: spacing[5],
    paddingRight: spacing[8],
  },
  maneuverIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: { position: 'absolute', right: 24, top: '50%', marginTop: -126, gap: spacing[3] },
  controlBtn: {
    backgroundColor: 'rgba(31,31,34,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  trip: {
    left: 24,
    right: 24,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  },
  clientCard: { flex: 1, padding: spacing[6], gap: spacing[5] },
  stat: {
    flex: 1,
    padding: spacing[4],
    borderRadius: 20,
    backgroundColor: colors.panelHigh,
    gap: 2,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[3],
    borderRadius: 20,
  },
  stopNumber: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
