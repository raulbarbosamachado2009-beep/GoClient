import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { openWhatsApp } from '../../integrations/contact';
import { useTabBarSpace } from '../../layout/form-factor';
import { Touchable } from '../../ui/primitives';
import { brl, fmtQty, type KyteCustomer, type KyteProduct, norm } from '../model';
import { useKyteList } from '../store';
import {
  GreenButton,
  Header,
  IconButton,
  KIcon,
  KY,
  SearchField,
  SmallButton,
  State,
  Text,
  Thumb,
  useKySize,
} from '../ui';
import { useKyteNav } from './nav';

/** Venda montada no GoClient e finalizada (pagamento) na página do próprio Kyte. */
export interface SellPlan {
  items: { name: string; qty: number }[];
  customer: string | null;
}

const MULT = [1, 2, 3, 5, 10];

/**
 * Vender (prints 7 e 9): produtos com busca e categorias, toque soma ao carrinho, cliente da
 * venda e o total embaixo. "Finalizar" abre o Kyte com o carrinho e o cliente já postos,
 * para a pessoa escolher o pagamento e concluir lá (a gravação é do próprio Kyte).
 */
export function SellScreen({ onFinish }: { onFinish: (p: SellPlan) => void }) {
  const s = useKySize();
  const nav = useKyteNav();
  const data = useKyteList('product');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [mult, setMult] = useState(1);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [review, setReview] = useState(false);
  const tab = useTabBarSpace();

  const products = data.list ?? [];
  const cats = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );
  const list = useMemo(() => {
    const t = norm(q);
    return [...products]
      .filter(
        (p) => (!cat || p.category === cat) && (!t || norm(`${p.name} ${p.code}`).includes(t)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [products, q, cat]);

  const byName = useMemo(() => new Map(products.map((p) => [p.name, p])), [products]);
  const lines = Object.entries(cart).filter(([, n]) => n > 0);
  const count = lines.reduce((a, [, n]) => a + n, 0);
  const total = lines.reduce((a, [name, n]) => a + (byName.get(name)?.price ?? 0) * n, 0);
  const add = (p: KyteProduct, n = mult) =>
    setCart((c) => ({ ...c, [p.name]: Math.max(0, (c[p.name] ?? 0) + n) }));

  if (picking)
    return (
      <CustomerPicker
        onBack={() => setPicking(false)}
        onPick={(name) => {
          setCustomer(name);
          setPicking(false);
        }}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header
        title="Vender"
        onMenu={nav.menu}
        right={
          <>
            <Touchable
              onPress={() => setMult((m) => MULT[(MULT.indexOf(m) + 1) % MULT.length] ?? 1)}
              accessibilityLabel="Quantidade por toque"
              style={{
                borderWidth: 3,
                borderColor: KY.ink,
                borderRadius: 10,
                paddingHorizontal: 12,
                height: 52,
                justifyContent: 'center',
              }}
            >
              <Text size={s.sub} weight="semibold">
                {mult}X
              </Text>
            </Touchable>
            <Touchable
              onPress={() => setPicking(true)}
              accessibilityLabel="Selecionar cliente"
              style={{
                width: s.phone ? 72 : 76,
                height: s.phone ? 72 : 76,
                borderRadius: 16,
                backgroundColor: KY.green,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KIcon name="person-add-outline" size={s.icon + 6} color="#FFFFFF" />
            </Touchable>
          </>
        }
      />
      <View style={{ paddingHorizontal: s.pad, gap: 12, paddingBottom: 12 }}>
        {cats.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {[null, ...cats].map((c) => (
              <Touchable
                key={c ?? '*'}
                onPress={() => setCat(c)}
                style={{
                  paddingHorizontal: 26,
                  height: 64,
                  justifyContent: 'center',
                  borderBottomWidth: 4,
                  borderBottomColor: cat === c ? KY.green : 'transparent',
                }}
              >
                <Text size={s.sub} weight="semibold" color={cat === c ? KY.greenInk : KY.faint}>
                  {(c ?? 'Tudo').toUpperCase()}
                </Text>
              </Touchable>
            ))}
          </ScrollView>
        )}
        <SearchField value={q} onChange={setQ} placeholder="Buscar produto…" />
        {customer && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <KIcon name="person" size={s.icon - 4} color={KY.greenInk} />
            <Text size={s.sub} weight="semibold" color={KY.greenInk} style={{ flex: 1 }} lines={1}>
              {customer}
            </Text>
            <Touchable onPress={() => setCustomer(null)} accessibilityLabel="Tirar cliente">
              <KIcon name="close-circle" size={s.icon - 2} color={KY.faint} />
            </Touchable>
          </View>
        )}
      </View>
      {!data.list ? (
        <State loading={data.loading} error={data.error} onRetry={data.refresh} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id || p.name}
          initialNumToRender={12}
          windowSize={7}
          contentContainerStyle={{ paddingHorizontal: s.pad, gap: 8, paddingBottom: 16 }}
          renderItem={({ item }) => {
            const n = cart[item.name] ?? 0;
            return (
              <Touchable
                onPress={() => add(item)}
                scaleTo={0.98}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 22,
                  backgroundColor: KY.card,
                  borderRadius: 14,
                  paddingHorizontal: 20,
                  height: s.rowH,
                  borderWidth: 2,
                  borderColor: n ? KY.green : 'transparent',
                }}
              >
                <Thumb image={item.image} name={item.name} size={s.phone ? 70 : 62} />
                <Text size={s.row} weight="medium" lines={1} style={{ flex: 1 }}>
                  {item.name}
                </Text>
                {n > 0 && (
                  <View
                    style={{
                      backgroundColor: KY.green,
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 4,
                    }}
                  >
                    <Text size={s.sub} weight="bold" color="#FFFFFF">
                      {fmtQty(n)}
                    </Text>
                  </View>
                )}
                <Text size={s.row}>{brl(item.price)}</Text>
              </Touchable>
            );
          }}
        />
      )}
      <View
        style={{ paddingHorizontal: s.pad, paddingBottom: s.phone ? tab + 12 : 18, paddingTop: 6 }}
      >
        <Touchable
          onPress={() => count && setReview(true)}
          style={{
            height: s.phone ? 96 : 88,
            borderRadius: 18,
            borderWidth: 3,
            borderColor: KY.green,
            backgroundColor: count ? KY.green : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
          }}
        >
          <Text
            size={s.big + 4}
            weight="semibold"
            color={count ? '#FFFFFF' : KY.green}
            style={{ flex: count ? 1 : undefined, textAlign: 'center' }}
          >
            {count
              ? `${fmtQty(count)} ${count === 1 ? 'item' : 'itens'} = ${brl(total)}`
              : 'Nenhum item'}
          </Text>
          {count > 0 && <KIcon name="chevron-forward" size={s.icon} color="#FFFFFF" />}
        </Touchable>
      </View>
      {review && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,.4)',
            justifyContent: 'flex-end',
          }}
        >
          <Touchable scaleTo={1} onPress={() => setReview(false)} style={{ flex: 1 }}>
            <View />
          </Touchable>
          <View
            style={{
              backgroundColor: KY.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: s.pad + 6,
              paddingBottom: s.phone ? tab + 20 : 30,
              gap: 14,
              maxHeight: '85%',
            }}
          >
            <Text size={s.title} weight="bold">
              Carrinho
            </Text>
            <ScrollView style={{ flexGrow: 0 }}>
              {lines.map(([name, n]) => {
                const p = byName.get(name);
                return (
                  <View
                    key={name}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: KY.line,
                    }}
                  >
                    {p && (
                      <IconButton
                        icon="remove-circle-outline"
                        label="Menos um"
                        onPress={() => add(p, -1)}
                      />
                    )}
                    <Text size={s.row} weight="bold" style={{ width: 60, textAlign: 'center' }}>
                      {fmtQty(n)}
                    </Text>
                    {p && (
                      <IconButton
                        icon="add-circle-outline"
                        label="Mais um"
                        onPress={() => add(p, 1)}
                      />
                    )}
                    <Text size={s.row} style={{ flex: 1 }} lines={2}>
                      {name}
                    </Text>
                    <Text size={s.row}>{brl((p?.price ?? 0) * n)}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <Text size={s.sub} color={KY.sub}>
              Cliente: {customer ?? 'nenhum'} · Total {brl(total)}
            </Text>
            <Text size={s.small} color={KY.sub}>
              O Kyte abre com estes itens e o cliente já colocados; lá você escolhe o pagamento e
              conclui a venda.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SmallButton
                label="Limpar"
                icon="trash-outline"
                onPress={() => {
                  setCart({});
                  setReview(false);
                }}
              />
              <GreenButton
                label="Finalizar no Kyte"
                icon="checkmark-circle-outline"
                style={{ flex: 1 }}
                height={s.phone ? 80 : 76}
                onPress={() => {
                  setReview(false);
                  onFinish({ items: lines.map(([name, qty]) => ({ name, qty })), customer });
                }}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/** "Adicionar cliente" (prints 8 e 10): busca, última compra e WhatsApp. */
export function CustomerPicker({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (name: string) => void;
}) {
  const s = useKySize();
  const data = useKyteList('customer');
  const sales = useKyteList('sale');
  const [q, setQ] = useState('');
  const tab = useTabBarSpace();
  const last = useMemo(() => {
    const m = new Map<string, { date: number; total: number | null }>();
    for (const v of sales.list ?? []) {
      if (!v.customer?.name || v.date == null || v.canceled) continue;
      const k = norm(v.customer.name);
      const cur = m.get(k);
      if (!cur || v.date > cur.date) m.set(k, { date: v.date, total: v.total });
    }
    return m;
  }, [sales.list]);
  const list = useMemo(() => {
    const t = norm(q);
    return (data.list ?? []).filter(
      (c) =>
        !t || norm(`${c.name} ${c.email}`).includes(t) || c.phone.replace(/\D/g, '').includes(t),
    );
  }, [data.list, q]);

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header title="Adicionar cliente" onBack={onBack} />
      <View style={{ paddingHorizontal: s.pad, paddingBottom: 12 }}>
        <SearchField value={q} onChange={setQ} placeholder="Procure por nome, email ou telefone" />
      </View>
      {!data.list ? (
        <State loading={data.loading} error={data.error} onRetry={data.refresh} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c: KyteCustomer) => c.id || c.name}
          initialNumToRender={12}
          contentContainerStyle={{
            paddingHorizontal: s.pad,
            gap: 8,
            paddingBottom: s.phone ? tab + 12 : 20,
          }}
          renderItem={({ item }) => {
            const l = last.get(norm(item.name));
            return (
              <Touchable
                onPress={() => onPick(item.name)}
                scaleTo={0.99}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  backgroundColor: KY.card,
                  borderRadius: 14,
                  paddingLeft: 26,
                  paddingRight: 14,
                  minHeight: s.rowH,
                  paddingVertical: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text size={s.row} weight="semibold" lines={1}>
                    {item.name}
                  </Text>
                  {l ? (
                    <Text size={s.sub} color={KY.faint}>
                      Última compra: {new Date(l.date).toLocaleDateString('pt-BR')} - {brl(l.total)}
                    </Text>
                  ) : null}
                </View>
                <Touchable
                  onPress={() => item.phone && openWhatsApp(item.phone)}
                  style={{ padding: 10 }}
                >
                  <KIcon
                    name="logo-whatsapp"
                    size={s.icon + 4}
                    color={item.phone ? KY.wa : KY.faint}
                  />
                </Touchable>
                <KIcon name="chevron-forward" size={s.icon - 4} />
              </Touchable>
            );
          }}
        />
      )}
    </View>
  );
}
