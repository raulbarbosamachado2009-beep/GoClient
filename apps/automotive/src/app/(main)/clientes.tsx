import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { CLIENTS, type MockClient } from '../../mocks/data';
import { usePrototype } from '../../prototype/state';
import { Sheet } from '../../shell/sheet';
import { colors, spacing } from '../../theme';
import {
  Avatar,
  Button,
  Divider,
  Icon,
  IconButton,
  PageHeader,
  SearchField,
  Tag,
  Text,
  Touchable,
} from '../../ui/primitives';

/** Página de Clientes: título, subtítulo, busca e lista. Toque abre os detalhes. */
export default function ClientsScreen() {
  const { setOverlay } = usePrototype();

  const open = (client: MockClient) => setOverlay(<ClientDetails client={client} />);

  return (
    <View style={styles.page}>
      <PageHeader
        title="Clientes"
        subtitle={`${CLIENTS.length} clientes na sua carteira · 5 regiões`}
      />
      <SearchField placeholder="Buscar por nome, loja ou cidade" />

      <View style={styles.listHead}>
        <Text variant="label" tone="tertiary" style={{ flex: 1, paddingLeft: 104 }}>
          CLIENTE
        </Text>
        <Text variant="label" tone="tertiary" style={styles.colRegion}>
          REGIÃO
        </Text>
        <Text variant="label" tone="tertiary" style={styles.colVisit}>
          ÚLTIMA VISITA
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={CLIENTS}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <Divider inset={104} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Touchable accessibilityRole="button" onPress={() => open(item)} style={styles.row}>
            <Avatar name={item.name} size={76} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.tradeName}
              </Text>
              <Text variant="callout" tone="secondary" numberOfLines={1}>
                {item.name} · {item.address}
              </Text>
            </View>
            <View style={styles.colRegion}>
              <Tag label={item.region} />
            </View>
            <Text variant="callout" tone="secondary" style={styles.colVisit}>
              {item.lastVisit}
            </Text>
            <Icon name="chevron-forward" size={30} color={colors.textTertiary} />
          </Touchable>
        )}
      />
    </View>
  );
}

function ClientDetails({ client }: { client: MockClient }) {
  const { setOverlay } = usePrototype();
  const router = useRouter();
  const close = () => setOverlay(null);

  return (
    <Sheet onClose={close} style={{ width: 1180, height: 780 }}>
      <View style={styles.sheetHeader}>
        <Avatar name={client.name} size={128} />
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Text variant="title">{client.tradeName}</Text>
          <Text variant="body" tone="secondary">
            {client.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <Tag label={client.region} icon="location-outline" />
            <Tag label={`Visitado ${client.lastVisit}`} icon="time-outline" />
          </View>
        </View>
        <IconButton icon="close" accessibilityLabel="Fechar" onPress={close} />
      </View>

      <View style={styles.sheetBody}>
        <View style={{ flex: 1, gap: spacing[5] }}>
          <Section title="ENDEREÇO">
            <Text variant="bodyStrong">{client.address}</Text>
            <Text variant="callout" tone="secondary">
              {client.district}
            </Text>
          </Section>
          <Section title="CONTATO">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <Icon name="call-outline" size={26} color={colors.textSecondary} />
              <Text variant="bodyStrong">{client.phone}</Text>
            </View>
          </Section>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <Button
              label="IR"
              icon="navigate"
              style={{ flex: 1 }}
              onPress={() => {
                close();
                router.replace({ pathname: '/mapa', params: { rota: 'cliente', id: client.id } });
              }}
            />
            <Button
              label="WhatsApp"
              icon="logo-whatsapp"
              variant="secondary"
              style={{ width: 260 }}
            />
          </View>
        </View>

        <View style={styles.purchases}>
          <Text variant="label" tone="tertiary">
            ÚLTIMAS COMPRAS
          </Text>
          {client.purchases.map((p, i) => (
            <View key={p.date}>
              {i > 0 && <Divider />}
              <View style={styles.purchase}>
                <View style={styles.purchaseDate}>
                  <Text variant="bodyStrong">{p.date.split(' ')[0]}</Text>
                  <Text variant="label" tone="tertiary">
                    {p.date.split(' ')[1]?.toUpperCase()}
                  </Text>
                </View>
                <Text variant="callout" tone="secondary" style={{ flex: 1 }} numberOfLines={2}>
                  {p.items}
                </Text>
                <Text variant="bodyStrong">{p.total}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing[2] }}>
      <Text variant="label" tone="tertiary">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 48, paddingTop: 40, gap: spacing[6] },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    marginBottom: -spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    minHeight: 108,
    paddingVertical: spacing[3],
  },
  colRegion: { width: 200 },
  colVisit: { width: 200 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    padding: spacing[10],
    paddingBottom: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetBody: { flex: 1, flexDirection: 'row', gap: spacing[10], padding: spacing[10] },
  purchases: {
    width: 520,
    padding: spacing[6],
    borderRadius: 28,
    backgroundColor: colors.panelHigh,
    gap: spacing[3],
  },
  purchase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[3],
  },
  purchaseDate: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
