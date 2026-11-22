import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { callPhone, openWhatsApp } from '../../integrations/contact';
import { useTabBarSpace } from '../../layout/form-factor';
import { useStops } from '../../map/stops';
import { Touchable } from '../../ui/primitives';
import { brl, dayLabel, hhmm, type KyteCustomer, norm } from '../model';
import { useKyteList } from '../store';
import {
  FooterBar,
  Header,
  KIcon,
  KY,
  PlusButton,
  SearchField,
  SmallButton,
  State,
  Text,
  useKySize,
} from '../ui';
import { useKyteNav } from './nav';

type Filter = 'todos' | 'primeira' | 'negativo' | 'positivo';

/** Clientes (prints 3 e 7): busca, filtros de saldo, WhatsApp e totais de débito/crédito. */
export function ClientsScreen() {
  const s = useKySize();
  const nav = useKyteNav();
  const data = useKyteList('customer');
  const sales = useKyteList('sale');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const tabSpace = useTabBarSpace();

  // Primeira compra: clientes com uma única venda entre as lidas do Histórico.
  const buys = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of sales.list ?? [])
      if (v.customer?.name && !v.canceled) {
        const k = norm(v.customer.name);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    return m;
  }, [sales.list]);

  const list = useMemo(() => {
    const t = norm(q);
    return (data.list ?? []).filter((c) => {
      if (
        t &&
        !norm(`${c.name} ${c.email} ${c.phone}`).includes(t) &&
        !c.phone.replace(/\D/g, '').includes(t)
      )
        return false;
      if (filter === 'negativo') return (c.balance ?? 0) < 0;
      if (filter === 'positivo') return (c.balance ?? 0) > 0;
      if (filter === 'primeira') return buys.get(norm(c.name)) === 1;
      return true;
    });
  }, [data.list, q, filter, buys]);

  const debit = (data.list ?? []).reduce((a, c) => a + Math.min(0, c.balance ?? 0), 0);
  const credit = (data.list ?? []).reduce((a, c) => a + Math.max(0, c.balance ?? 0), 0);
  const hasBalance = (data.list ?? []).some((c) => c.balance != null);

  const chip = (k: Filter, label: string) => (
    <Touchable
      key={k}
      onPress={() => setFilter((f) => (f === k ? 'todos' : k))}
      style={{
        height: s.phone ? 56 : 54,
        paddingHorizontal: 24,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: KY.ink,
        backgroundColor: filter === k ? KY.ink : 'transparent',
        justifyContent: 'center',
      }}
    >
      <Text size={s.small} weight="semibold" color={filter === k ? '#FFFFFF' : KY.ink}>
        {label}
      </Text>
    </Touchable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header
        title={`Clientes${data.list ? ` (${data.list.length})` : ''}`}
        onMenu={nav.menu}
        right={<PlusButton label="Cadastrar cliente com a Havena" onPress={nav.havena} />}
      />
      <View style={{ paddingHorizontal: s.pad, gap: 14, paddingBottom: 14 }}>
        <SearchField value={q} onChange={setQ} placeholder="Procure por nome, email ou telefone" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {chip('primeira', '🤩 PRIMEIRA COMPRA')}
          {chip('negativo', 'SALDO NEGATIVO')}
          {chip('positivo', 'SALDO POSITIVO')}
        </ScrollView>
      </View>
      {!data.list ? (
        <State loading={data.loading} error={data.error} onRetry={data.refresh} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c) => c.id || c.name}
          initialNumToRender={14}
          windowSize={7}
          onRefresh={data.refresh}
          refreshing={data.busy}
          contentContainerStyle={{ paddingHorizontal: s.pad, paddingBottom: 18, gap: 8 }}
          ListEmptyComponent={<State empty="Nenhum cliente encontrado." />}
          renderItem={({ item }) => (
            <ClientRow
              c={item}
              onOpen={() => nav.open({ type: 'client', id: item.id || item.name })}
            />
          )}
        />
      )}
      {hasBalance && (
        <View style={{ marginBottom: s.phone ? tabSpace : 0 }}>
          <FooterBar>
            <KIcon name="wallet-outline" size={s.icon + 6} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text size={s.sub} weight="semibold" color="#FFFFFF">
                Total em débito
              </Text>
              <Text size={s.big} weight="bold" color={KY.red}>
                {debit < 0 ? `-${brl(-debit)}` : brl(0)}
              </Text>
            </View>
            <View
              style={{ width: 2, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,.2)' }}
            />
            <KIcon name="card-outline" size={s.icon + 6} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text size={s.sub} weight="semibold" color="#FFFFFF">
                Total em crédito
              </Text>
              <Text size={s.big} weight="bold" color={KY.green}>
                {brl(credit)}
              </Text>
            </View>
          </FooterBar>
        </View>
      )}
    </View>
  );
}

function ClientRow({ c, onOpen }: { c: KyteCustomer; onOpen: () => void }) {
  const s = useKySize();
  const has = !!c.phone;
  return (
    <Touchable
      onPress={onOpen}
      scaleTo={0.99}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        backgroundColor: KY.card,
        borderRadius: 14,
        paddingLeft: 26,
        paddingRight: 14,
        height: s.rowH,
      }}
    >
      <Text size={s.row} weight="semibold" lines={1} style={{ flex: 1 }}>
        {c.name}
      </Text>
      <Touchable
        onPress={() => has && openWhatsApp(c.phone)}
        accessibilityLabel={`WhatsApp de ${c.name}`}
        style={{ padding: 10 }}
      >
        <KIcon name="logo-whatsapp" size={s.icon + 4} color={has ? KY.wa : KY.faint} />
      </Touchable>
      <KIcon name="chevron-forward" size={s.icon - 4} color={KY.ink} />
    </Touchable>
  );
}

/** Ficha do cliente: dados do Kyte, contato, rota e as últimas compras. */
export function ClientDetail({ id }: { id: string }) {
  const s = useKySize();
  const nav = useKyteNav();
  const stops = useStops();
  const router = useRouter();
  const data = useKyteList('customer');
  const sales = useKyteList('sale');
  const c = (data.list ?? []).find((x) => (x.id || x.name) === id);
  const [msg, setMsg] = useState<string | null>(null);
  const tabSpace = useTabBarSpace();

  if (!c)
    return (
      <View style={{ flex: 1, backgroundColor: KY.bg }}>
        <Header title="Cliente" onBack={nav.back} />
        <State empty="Cliente não encontrado." />
      </View>
    );

  const address = [c.address, c.complement, c.district, c.city].filter(Boolean).join(', ');
  const stop = { name: c.name, address, phone: c.phone };
  const mine = (sales.list ?? []).filter(
    (v) => v.customer && norm(v.customer.name) === norm(c.name),
  );

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header title={c.name} onBack={nav.back} />
      <ScrollView
        contentContainerStyle={{
          padding: s.pad,
          paddingTop: 0,
          gap: 16,
          paddingBottom: tabSpace + 30,
        }}
      >
        <View style={{ backgroundColor: KY.card, borderRadius: 18, padding: 26, gap: 18 }}>
          <Info icon="call-outline" label="Celular" value={c.phone || 'Sem telefone'} />
          <Info
            icon="location-outline"
            label="Endereço"
            value={address || 'Sem endereço no Kyte'}
          />
          {c.email ? <Info icon="mail-outline" label="E-mail" value={c.email} /> : null}
          {c.balance != null && (
            <Info
              icon="wallet-outline"
              label="Saldo"
              value={brl(c.balance)}
              color={c.balance < 0 ? KY.red : c.balance > 0 ? KY.greenInk : KY.ink}
            />
          )}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <SmallButton
            label="Ir agora"
            icon="navigate"
            tone="green"
            onPress={() => {
              if (!address) return setMsg('Cadastre o endereço deste cliente no Kyte primeiro.');
              stops.goNow(stop);
              router.replace('/mapa');
            }}
          />
          <SmallButton
            label="Colocar na rota"
            icon="add-circle-outline"
            onPress={() => {
              if (!address) return setMsg('Cadastre o endereço deste cliente no Kyte primeiro.');
              stops.add(stop);
              setMsg(`${c.name} está na rota do dia.`);
            }}
          />
          <SmallButton
            label="WhatsApp"
            icon="logo-whatsapp"
            onPress={() =>
              openWhatsApp(c.phone) ? null : setMsg('Este cliente não tem celular válido no Kyte.')
            }
          />
          <SmallButton
            label="Ligar"
            icon="call"
            onPress={() =>
              callPhone(c.phone) ? null : setMsg('Este cliente não tem telefone válido no Kyte.')
            }
          />
        </View>
        {msg && (
          <Text size={s.sub} color={KY.sub}>
            {msg}
          </Text>
        )}
        {mine.length > 0 && (
          <View style={{ backgroundColor: KY.card, borderRadius: 18, padding: 26, gap: 4 }}>
            <Text size={s.big} weight="semibold" style={{ marginBottom: 8 }}>
              Últimas compras
            </Text>
            {mine.slice(0, 8).map((v) => (
              <Touchable
                key={v.id}
                onPress={() => nav.open({ type: 'sale', id: v.id })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: KY.line,
                  gap: 16,
                }}
              >
                <Text size={s.row} weight="semibold" style={{ flex: 1 }}>
                  {brl(v.total)}
                </Text>
                <Text size={s.small} color={KY.sub}>
                  {v.date ? `${dayLabel(v.date)} · ${hhmm(v.date)}` : ''}
                </Text>
                <KIcon name="chevron-forward" size={s.icon - 6} color={KY.sub} />
              </Touchable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Info({
  icon,
  label,
  value,
  color = KY.ink,
}: {
  icon: 'call-outline' | 'location-outline' | 'mail-outline' | 'wallet-outline';
  label: string;
  value: string;
  color?: string;
}) {
  const s = useKySize();
  return (
    <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
      <KIcon name={icon} size={s.icon} color={KY.sub} />
      <View style={{ flex: 1 }}>
        <Text size={s.small} color={KY.sub}>
          {label}
        </Text>
        <Text size={s.row} weight="medium" color={color}>
          {value}
        </Text>
      </View>
    </View>
  );
}
