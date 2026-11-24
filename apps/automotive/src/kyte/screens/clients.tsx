import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { callPhone, openWhatsApp } from '../../integrations/contact';
import { useTabBarSpace } from '../../layout/form-factor';
import { useMapNav } from '../../map/map-nav';
import { useStops } from '../../map/stops';
import { Swap } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import { brl, type KyteCustomer, norm } from '../model';
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
  Tabs,
  Text,
  useKySize,
} from '../ui';
import { useCanCreate } from './create';
import { SaleRow } from './history';
import { useKyteNav } from './nav';

type Filter = 'todos' | 'primeira' | 'negativo' | 'positivo';

/** Clientes (prints 3 e 7): busca, filtros de saldo, WhatsApp e totais de débito/crédito. */
export function ClientsScreen() {
  const s = useKySize();
  const nav = useKyteNav();
  const canCreate = useCanCreate('customer');
  const data = useKyteList('customer');
  const sales = useKyteList('sale');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');

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
        height: s.phone ? 56 : 80,
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
        right={
          // Abre o cadastro (celular e multimídia); sem permissão, o Lucas faz com confirmação.
          canCreate ? (
            <PlusButton label="Novo cliente" onPress={() => nav.open({ type: 'newClient' })} />
          ) : (
            <PlusButton label="Cadastrar cliente com o Lucas" onPress={nav.havena} />
          )
        }
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
        <View>
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
        borderRadius: s.radius,
        paddingLeft: s.pad,
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

/** Ficha do cliente (prints 11 a 14): Dados, Vendas, Pedidos e Conta — só consulta. */
export function ClientDetail({ id }: { id: string }) {
  const s = useKySize();
  const nav = useKyteNav();
  const stops = useStops();
  const _router = useRouter();
  const mapNav = useMapNav();
  const data = useKyteList('customer');
  const sales = useKyteList('sale');
  const [tab, setTab] = useState<'dados' | 'vendas' | 'pedidos' | 'conta'>('dados');
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
  const mine = (sales.list ?? [])
    .filter((v) => v.customer && norm(v.customer.name) === norm(c.name))
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
  const field = (label: string, value: string) => (
    <View
      style={{
        backgroundColor: KY.card,
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 16,
        flex: 1,
      }}
    >
      <Text size={s.small} weight="semibold" color={KY.faint}>
        {label}
      </Text>
      <Text size={s.row}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header title={c.name} onBack={nav.back} />
      <View style={{ paddingHorizontal: s.pad, paddingBottom: 12 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'dados', label: 'DADOS', icon: 'person-outline' },
            { key: 'vendas', label: 'VENDAS', icon: 'receipt-outline' },
            { key: 'pedidos', label: 'PEDIDOS', icon: 'document-text-outline' },
            { key: 'conta', label: 'CONTA', icon: 'wallet-outline' },
          ]}
        />
      </View>
      <Swap
        id={tab}
        index={['dados', 'vendas', 'pedidos', 'conta'].indexOf(tab)}
        style={{ flex: 1 }}
      >
        {tab === 'vendas' ? (
          <FlatList
            data={mine}
            keyExtractor={(v) => v.id || v.number}
            contentContainerStyle={{
              paddingHorizontal: s.pad,
              gap: 8,
              paddingBottom: tabSpace + 30,
            }}
            ListEmptyComponent={
              <State empty="Nenhuma venda deste cliente nas vendas lidas do Kyte." />
            }
            renderItem={({ item }) => (
              <SaleRow v={item} onOpen={() => nav.open({ type: 'sale', id: item.id })} />
            )}
            ListFooterComponent={
              mine.length ? (
                <View
                  style={{
                    backgroundColor: '#DDF5EC',
                    borderRadius: 16,
                    padding: 22,
                    marginTop: 6,
                  }}
                >
                  <Text size={s.row} weight="bold" color={KY.greenInk}>
                    {brl(mine.reduce((a, v) => a + (v.canceled ? 0 : (v.total ?? 0)), 0))} em{' '}
                    {mine.length} {mine.length === 1 ? 'venda' : 'vendas'}
                  </Text>
                </View>
              ) : undefined
            }
          />
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: s.pad,
              gap: 14,
              paddingBottom: tabSpace + 30,
            }}
          >
            {tab === 'dados' && (
              <>
                <View
                  style={{
                    backgroundColor: '#E4E8ED',
                    borderRadius: 18,
                    padding: 24,
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 130,
                      height: 130,
                      borderRadius: 65,
                      backgroundColor: '#D3D9E0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <KIcon name="image-outline" size={52} color={KY.ink} />
                  </View>
                  <Touchable
                    onPress={() => c.phone && openWhatsApp(c.phone)}
                    style={{ marginTop: -26, marginLeft: 90 }}
                  >
                    <KIcon name="logo-whatsapp" size={44} color={c.phone ? KY.wa : KY.ink} />
                  </Touchable>
                </View>
                <View style={{ flexDirection: s.phone ? 'column' : 'row', gap: 14 }}>
                  {field('Nome', c.name)}
                  {field('Celular/WhatsApp', c.phone || '—')}
                </View>
                {field('Endereço', address || 'Sem endereço no Kyte')}
                {c.email ? field('E-mail', c.email) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <SmallButton
                    label="Ir agora"
                    icon="navigate"
                    tone="green"
                    onPress={() => {
                      if (!address)
                        return setMsg('Cadastre o endereço deste cliente no Kyte primeiro.');
                      stops.goNow(stop);
                      mapNav();
                    }}
                  />
                  <SmallButton
                    label="Colocar na rota"
                    icon="add-circle-outline"
                    onPress={() => {
                      if (!address)
                        return setMsg('Cadastre o endereço deste cliente no Kyte primeiro.');
                      stops.add(stop);
                      setMsg(`${c.name} está na rota do dia.`);
                    }}
                  />
                  <SmallButton
                    label="Ligar"
                    icon="call"
                    onPress={() =>
                      callPhone(c.phone)
                        ? null
                        : setMsg('Este cliente não tem telefone válido no Kyte.')
                    }
                  />
                </View>
                {msg && (
                  <Text size={s.sub} color={KY.sub}>
                    {msg}
                  </Text>
                )}
              </>
            )}
            {tab === 'pedidos' && <State empty="Nenhum pedido em aberto deste cliente." />}
            {tab === 'conta' && (
              <View style={{ gap: 14 }}>
                {field('Saldo', c.balance == null ? '—' : brl(c.balance))}
                <Text size={s.small} color={KY.sub}>
                  Saldo negativo = o cliente deve; positivo = crédito com a loja.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </Swap>
    </View>
  );
}
