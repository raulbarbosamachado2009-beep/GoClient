import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { kyteAgent } from '../kyte/agent';
import { customerAddress, findCustomer } from '../kyte/store';
import { CLIENTS, REGIONS } from '../mocks/data';
import { spacing, useColors } from '../theme';
import { Appear } from '../ui/motion';
import { Icon, Text, Touchable } from '../ui/primitives';
import { useMapNav } from './map-nav';
import { useKyteNames } from './phone-sheet';
import { useStops } from './stops';

const FILTERS = REGIONS.filter((r) => r !== 'Todas');
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Multimídia: escolher um cliente dentro do cartão do Mapa (o equivalente à lista da aba
 * puxável do celular). Busca, regiões, lista e "Ver mais" → Clientes do Kyte.
 * Com o Kyte logado no app, a lista vem do Kyte e o endereço é lido da ficha dele.
 */
export function ClientPicker({ onClose }: { onClose: () => void }) {
  const c = useColors();
  const router = useRouter();
  const mapNav = useMapNav();
  const stops = useStops();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const kyte = useKyteNames(query, true);
  const q = norm(query.trim());
  const sample = CLIENTS.filter(
    (x) =>
      (!region || x.region === region) &&
      (!q || norm(`${x.tradeName} ${x.name} ${x.address} ${x.district}`).includes(q)),
  );
  const pickKyte = (name: string) => {
    const known = findCustomer(name);
    if (known) {
      const address = customerAddress(known);
      if (!address) return setNotice(`${name} não tem endereço cadastrado no Kyte.`);
      stops.goNow({ name: known.name, address, phone: known.phone });
      return;
    }
    setNotice(`Buscando o endereço de ${name}…`);
    kyteAgent
      .openClient(name)
      .then(({ client }) => {
        if (!client?.address) return setNotice(`${name} não tem endereço cadastrado no Kyte.`);
        stops.goNow({ name: client.name || name, address: client.address, phone: client.phone });
      })
      .catch((e: Error) => setNotice(e.message));
  };

  return (
    <Appear distance={16} style={{ flex: 1, gap: spacing[4] }}>
      <View style={styles.head}>
        <Text variant="largeTitle" style={{ flex: 1, fontSize: 40, lineHeight: 48 }}>
          Clientes
        </Text>
        <Touchable
          accessibilityRole="link"
          onPress={() => router.replace({ pathname: '/kyte', params: { secao: 'clientes' } })}
          style={styles.more}
        >
          <Text variant="headline" tone="accent" style={{ fontSize: 28, lineHeight: 34 }}>
            Ver mais
          </Text>
          <Icon name="chevron-forward" size={32} color={c.accent} />
        </Touchable>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={[styles.close, { backgroundColor: c.fill }]}
        >
          <Icon name="close" size={36} color={c.textSecondary} />
        </Touchable>
      </View>
      <View style={[styles.search, { backgroundColor: c.fill }]}>
        <Icon name="search" size={36} color={c.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar cliente"
          placeholderTextColor={c.textSecondary}
          autoCorrect={false}
          style={[styles.input, { color: c.text }]}
        />
      </View>
      {!kyte.names && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: spacing[3] }}
        >
          {FILTERS.map((r) => (
            <Touchable
              key={r}
              accessibilityRole="button"
              onPress={() => setRegion(region === r ? null : r)}
              style={[styles.chip, { backgroundColor: region === r ? c.accent : c.fill }]}
            >
              <Text
                variant="headline"
                color={region === r ? '#FFFFFF' : c.text}
                style={{ fontSize: 28, lineHeight: 34 }}
              >
                {r}
              </Text>
            </Touchable>
          ))}
        </ScrollView>
      )}
      {notice && (
        <Text variant="callout" tone="secondary" style={{ fontSize: 24, lineHeight: 30 }}>
          {notice}
        </Text>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing[3], paddingBottom: spacing[2] }}
        keyboardShouldPersistTaps="handled"
      >
        {kyte.names
          ? kyte.names.map((name) => (
              <Row key={name} title={name} sub="Cliente do Kyte" onPress={() => pickKyte(name)} />
            ))
          : sample.map((x) => (
              <Row
                key={x.id}
                title={x.tradeName}
                sub={`${x.address} · ${x.district.split(' · ')[0]}`}
                onPress={() => mapNav({ rota: 'cliente', id: x.id })}
              />
            ))}
        {kyte.names?.length === 0 && (
          <Text variant="callout" tone="secondary" style={{ fontSize: 24, lineHeight: 30 }}>
            {kyte.loading ? 'Carregando os clientes do Kyte…' : 'Nenhum cliente encontrado.'}
          </Text>
        )}
      </ScrollView>
    </Appear>
  );
}

function Row({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Touchable
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.98}
      style={[styles.row, { backgroundColor: c.fill }]}
    >
      <View style={styles.pin}>
        <Icon name="storefront" size={40} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="headline" numberOfLines={1} style={{ fontSize: 30, lineHeight: 36 }}>
          {title}
        </Text>
        <Text
          variant="callout"
          tone="secondary"
          numberOfLines={1}
          style={{ fontSize: 24, lineHeight: 30 }}
        >
          {sub}
        </Text>
      </View>
      <Icon name="navigate" size={44} color={c.accent} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing[2] },
  close: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    height: 96,
    borderRadius: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
  },
  input: {
    flex: 1,
    fontSize: 30,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  chip: { height: 80, borderRadius: 40, justifyContent: 'center', paddingHorizontal: spacing[6] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    minHeight: 128,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    // Concêntrico com o cartão (48 de raio, 24 de margem).
    borderRadius: 24,
  },
  pin: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
