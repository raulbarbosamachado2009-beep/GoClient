import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { kyteAgent } from '../kyte/agent';
import { CLIENTS, REGIONS } from '../mocks/data';
import { spacing, useColors } from '../theme';
import { Appear } from '../ui/motion';
import { Icon, Text, Touchable } from '../ui/primitives';
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
        <Text variant="title2" style={{ flex: 1 }}>
          Clientes
        </Text>
        <Touchable
          accessibilityRole="link"
          onPress={() => router.replace({ pathname: '/kyte', params: { secao: 'clientes' } })}
          style={styles.more}
        >
          <Text variant="headline" tone="accent">
            Ver mais
          </Text>
          <Icon name="chevron-forward" size={26} color={c.accent} />
        </Touchable>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={[styles.close, { backgroundColor: c.fill }]}
        >
          <Icon name="close" size={30} color={c.textSecondary} />
        </Touchable>
      </View>
      <View style={[styles.search, { backgroundColor: c.fill }]}>
        <Icon name="search" size={30} color={c.textSecondary} />
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
              <Text variant="headline" color={region === r ? '#FFFFFF' : c.text}>
                {r}
              </Text>
            </Touchable>
          ))}
        </ScrollView>
      )}
      {notice && (
        <Text variant="callout" tone="secondary">
          {notice}
        </Text>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing[2] }}
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
                onPress={() =>
                  router.replace({ pathname: '/mapa', params: { rota: 'cliente', id: x.id } })
                }
              />
            ))}
        {kyte.names?.length === 0 && (
          <Text variant="callout" tone="secondary">
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
        <Icon name="storefront" size={30} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="callout" tone="secondary" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Icon name="navigate" size={30} color={c.accent} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing[2] },
  close: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    height: 76,
    borderRadius: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
  },
  input: {
    flex: 1,
    fontSize: 26,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  chip: { height: 60, borderRadius: 30, justifyContent: 'center', paddingHorizontal: spacing[5] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: 24,
  },
  pin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
