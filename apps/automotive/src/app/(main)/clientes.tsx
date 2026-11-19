import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CLIENTS, type MockClient } from '../../mocks/data';
import { usePrototype } from '../../prototype/state';
import { Sheet, useSheetClose } from '../../shell/sheet';
import { layout, spacing, useColors } from '../../theme';
import { useEdgeFade } from '../../ui/edge-fade';
import { Appear } from '../../ui/motion';
import {
  Avatar,
  Group,
  Icon,
  IconButton,
  type IconName,
  PageHeader,
  Row,
  SearchField,
  SectionHeader,
  Text,
  Touchable,
} from '../../ui/primitives';

/** Página de Clientes: título, subtítulo, busca e lista. Toque abre a ficha do cliente. */
export default function ClientsScreen() {
  const { setOverlay } = usePrototype();
  const open = (client: MockClient) => setOverlay(<ClientDetails client={client} />);
  const fade = useEdgeFade();

  return (
    <View style={styles.page}>
      <PageHeader title="Clientes" subtitle={`${CLIENTS.length} clientes na sua carteira`} />
      <SearchField placeholder="Buscar por nome, loja ou cidade" />
      <View style={{ flex: 1 }}>
        <ScrollView
          {...fade.scrollProps}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing[10] }}
        >
          <Group inset={148}>
            {CLIENTS.map((client, i) => (
              <Appear key={client.id} delay={i * 35} distance={10}>
                <Row
                  leading={<Avatar name={client.name} size={92} />}
                  title={client.tradeName}
                  subtitle={`${client.name} · ${client.address}`}
                  value={client.region}
                  chevron
                  onPress={() => open(client)}
                />
              </Appear>
            ))}
          </Group>
        </ScrollView>
        {fade.edges}
      </View>
    </View>
  );
}

/** Ficha do cliente no estilo do app Contatos. */
function ClientDetails({ client }: { client: MockClient }) {
  const { setOverlay } = usePrototype();
  return (
    <Sheet onClose={() => setOverlay(null)} style={{ width: 1120, height: 800 }}>
      <ClientDetailsContent client={client} />
    </Sheet>
  );
}

function ClientDetailsContent({ client }: { client: MockClient }) {
  const c = useColors();
  const router = useRouter();
  const close = useSheetClose();
  // Fecha a ficha com a animação e só então abre o mapa com a rota.
  const go = () =>
    close(() => router.replace({ pathname: '/mapa', params: { rota: 'cliente', id: client.id } }));

  return (
    <>
      <View style={styles.sheetTop}>
        <View style={{ width: 76 }} />
        <View style={{ alignItems: 'center', gap: spacing[2] }}>
          <Avatar name={client.name} size={136} />
          <Text variant="title">{client.name}</Text>
          <Text variant="body" tone="secondary">
            {client.tradeName} · {client.region}
          </Text>
        </View>
        <IconButton
          icon="close"
          variant="gray"
          size={64}
          iconSize={30}
          accessibilityLabel="Fechar"
          onPress={() => close()}
        />
      </View>

      <View style={styles.actions}>
        <QuickAction icon="call" label="Ligar" />
        <QuickAction icon="logo-whatsapp" label="WhatsApp" />
        <QuickAction icon="mail" label="E-mail" />
        <Touchable
          accessibilityRole="button"
          onPress={go}
          style={[styles.go, { backgroundColor: c.accent }]}
        >
          <Icon name="navigate" size={36} color="#FFFFFF" />
          <Text variant="title2" color="#FFFFFF">
            IR
          </Text>
        </Touchable>
      </View>

      <View style={styles.sheetBody}>
        <View style={{ flex: 1 }}>
          <Group>
            <Row title="Endereço" subtitle={`${client.address} · ${client.district}`} />
            <Row title="Telefone" subtitle={client.phone} />
            <Row title="Última visita" subtitle={client.lastVisit} />
          </Group>
        </View>
        <View style={{ flex: 1 }}>
          <SectionHeader title="Últimas compras" />
          <Group>
            {client.purchases.map((p) => (
              <Row key={p.date} title={p.total} subtitle={p.items} value={p.date} />
            ))}
          </Group>
        </View>
      </View>
    </>
  );
}

function QuickAction({ icon, label }: { icon: IconName; label: string }) {
  const c = useColors();
  return (
    <Touchable accessibilityRole="button" style={[styles.quick, { backgroundColor: c.fill }]}>
      <Icon name={icon} size={34} color={c.accent} />
      <Text variant="subhead" tone="accent">
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 48, paddingTop: 36, gap: spacing[6] },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing[8],
    paddingBottom: spacing[4],
  },
  actions: { flexDirection: 'row', gap: spacing[4], paddingHorizontal: spacing[8] },
  quick: {
    flex: 1,
    height: 104,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  go: {
    flex: 1.4,
    height: 104,
    borderRadius: layout.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  sheetBody: { flex: 1, flexDirection: 'row', gap: spacing[6], padding: spacing[8] },
});
