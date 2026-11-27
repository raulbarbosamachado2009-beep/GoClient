import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Platform, ScrollView, TextInput, View } from 'react-native';
import { composeWhatsApp } from '../../integrations/contact';
import { FONT } from '../../theme';
import { Appear, Presence, Swap } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import { Spinner } from '../../ui/spinner';
import { kyteAgent, kyteAgentAvailable, kyteLogged } from '../agent';
import type { SalePlan } from '../agent-page';
import { brl, type KyteCustomer, type KyteProduct, type KyteSale, norm } from '../model';
import type { ReceiptData } from '../print/escpos';
import { useKyteNav } from '../screens/nav';
import { addLocalSale, nextSaleNumber, PREVIEW, useKyteList, useKyteStore } from '../store';
import { Header, type IconName, KIcon, KY, Text, Thumb, useKySize } from '../ui';
import {
  addProduct,
  amountCents,
  brlCents,
  type Cart,
  type CartLine,
  canPayWith,
  cartButtonLabel,
  changeCents,
  countItems,
  type Delivery,
  discountCents,
  emptyCart,
  lineCents,
  PAYMENT_METHODS,
  type PaymentMethod,
  popDigit,
  pushDigit,
  pushQtyDigit,
  removeLine,
  setLineDiscount,
  setQty,
  setUnitPrice,
  toCents,
  totalCents,
} from './cart';
import {
  BigAmount,
  Bottom,
  CustomerChip,
  KyteButton,
  MoreButton,
  Numpad,
  OptionLine,
  SheetCard,
  useRadius,
} from './parts';
import { ReceiptScreen } from './receipt';
import { saleToReceipt } from './receipt-data';

/**
 * Vender — o fluxo de vendas do Kyte inteiro dentro do GoClient, copiado do vídeo do usuário
 * (27/11/2026). Cada página entra deslizando da direita e volta deslizando para a direita,
 * como no Kyte:
 *
 *   Vender ─(+👤)→ Adicionar cliente
 *     └─(N itens = R$)→ Carrinho ─(toque no item)→ quantidade · valor unitário · desconto
 *          ├─(…)→ Mais opções: entrega · observação · desconto · esvaziar
 *          └─(N itens = R$)→ Pagamento ─(Dinheiro, Avançar)→ Pagamento: Dinheiro
 *                └─ Concluir → Venda Concluída → Recibo (PDF · Email · Imprimir · Compartilhar)
 *
 * Ao concluir, a janela invisível registra a venda no próprio Kyte (JOBS.registerSale). Se o
 * Kyte não deixar, o app oferece abrir o Kyte com o carrinho montado (`onOpenKyte`).
 */
type Page =
  | 'vender'
  | 'cliente'
  | 'carrinho'
  | 'qtd'
  | 'preco'
  | 'descItem'
  | 'desconto'
  | 'obs'
  | 'entrega'
  | 'pagamento'
  | 'dinheiro'
  | 'concluida'
  | 'recibo';

const DEPTH: Record<Page, number> = {
  vender: 0,
  cliente: 1,
  carrinho: 1,
  qtd: 2,
  preco: 2,
  descItem: 2,
  desconto: 2,
  obs: 2,
  entrega: 2,
  pagamento: 2,
  dinheiro: 3,
  concluida: 4,
  recibo: 5,
};

const MULT = [1, 2, 3, 5, 10];

/** Itens e cliente para pôr no carrinho do Kyte (quando a pessoa conclui na página dele). */
export interface SellPlan {
  items: { name: string; qty: number }[];
  customer: string | null;
}

interface Done {
  sale: KyteSale;
  receipt: ReceiptData;
  missing: string[];
  phone: string;
  changeCents: number;
  order: boolean;
}

const kept: { stack: Page[]; cart: Cart; method: PaymentMethod; done: Done | null } = {
  stack: ['vender'],
  cart: emptyCart(),
  method: 'Dinheiro',
  done: null,
};

export function SellFlow({ onOpenKyte }: { onOpenKyte: (p: SellPlan) => void }) {
  const s = useKySize();
  const nav = useKyteNav();
  const router = useRouter();
  const store = useKyteStore();
  // A venda em andamento sobrevive a sair e voltar (ex.: "+" de cadastrar cliente, outra aba).
  const [stack, setStack] = useState<Page[]>(() => kept.stack);
  const [cart, setCart] = useState<Cart>(() => kept.cart);
  const [focus, setFocus] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>(() => kept.method);
  const [received, setReceived] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [fail, setFail] = useState<{ message: string; plan: SalePlan } | null>(null);
  const [done, setDone] = useState<Done | null>(() => kept.done);
  kept.stack = stack;
  kept.cart = cart;
  kept.method = method;
  kept.done = done;
  const page = stack[stack.length - 1] ?? 'vender';
  const lastDepth = useRef(0);
  const dir: 1 | -1 = DEPTH[page] >= lastDepth.current ? 1 : -1;
  lastDepth.current = DEPTH[page];

  const push = (p: Page) => setStack((st) => [...st, p]);
  const pop = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const total = totalCents(cart);
  const line = cart.lines.find((l) => l.name === focus) ?? null;

  const restart = () => {
    setCart(emptyCart());
    setFocus(null);
    setMethod('Dinheiro');
    setDone(null);
    setStack(['vender']);
  };

  const conclude = async (
    mode: SalePlan['mode'],
    payment: PaymentMethod,
    receivedCents: number | null,
  ) => {
    const plan: SalePlan = {
      items: cart.lines.map((l) => ({
        name: l.name,
        qty: l.qty,
        unitCents:
          l.unitCents !== l.listCents || l.discountCents ? (lineCents(l) / l.qty) | 0 : null,
      })),
      customer: cart.customer?.name ?? null,
      payment,
      mode,
      receivedCents,
      discountCents: discountCents(cart),
      note: cart.note,
    };
    setFail(null);
    setBusy(mode === 'order' ? 'Salvando o pedido no Kyte…' : 'Registrando a venda no Kyte…');
    let number = nextSaleNumber();
    let missing: string[] = [];
    try {
      if (PREVIEW) await new Promise((r) => setTimeout(r, 900));
      else {
        if (!kyteAgentAvailable() || !kyteLogged())
          throw new Error('Entre no Kyte primeiro (aba Kyte) para registrar a venda.');
        const r = await kyteAgent.registerSale(plan);
        number = r.number || number;
        missing = r.missing ?? [];
      }
    } catch (e) {
      setBusy(null);
      setFail({ message: e instanceof Error ? e.message : 'O Kyte não respondeu.', plan });
      return;
    }
    const change = receivedCents ? changeCents(receivedCents, total) : 0;
    const label = mode === 'fiado' ? 'Fiado' : payment;
    const sale: KyteSale = {
      id: `gc-${Date.now()}`,
      number,
      date: Date.now(),
      total: total / 100,
      payment: mode === 'order' ? 'Pedido' : label,
      seller: '',
      canceled: false,
      customer: cart.customer
        ? { name: cart.customer.name, phone: cart.customer.phone, district: cart.customer.district }
        : null,
      items: cart.lines.map((l) => ({
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitCents / 100,
        total: lineCents(l) / 100,
      })),
    };
    if (mode !== 'order') addLocalSale(sale);
    setDone({
      sale,
      missing,
      phone: cart.customer?.phone ?? '',
      changeCents: change,
      order: mode === 'order',
      receipt: saleToReceipt(sale, store, {
        note: cart.noteOnReceipt ? cart.note : '',
        discountCents: discountCents(cart),
        receivedCents: receivedCents ?? undefined,
        changeCents: change || undefined,
      }),
    });
    setBusy(null);
    setStack(['concluida']);
  };

  let body: React.ReactNode;
  switch (page) {
    case 'cliente':
      body = (
        <CustomerPage
          current={cart.customer?.name ?? null}
          onBack={pop}
          onNew={() => nav.open({ type: 'newClient' })}
          onPick={(c) => {
            setCart((x) => ({
              ...x,
              customer: c
                ? {
                    name: c.name,
                    phone: c.phone,
                    district: c.district,
                    balanceCents: c.balance == null ? null : toCents(c.balance),
                  }
                : null,
            }));
            pop();
          }}
        />
      );
      break;
    case 'carrinho':
      body = (
        <CartPage
          cart={cart}
          focus={focus}
          onFocus={(n) => setFocus((f) => (f === n ? null : n))}
          onBack={() => {
            setFocus(null);
            pop();
          }}
          onCustomer={() => push('cliente')}
          onEdit={(what) => push(what)}
          onDiscount={() => push('desconto')}
          onMore={() => setMore(true)}
          onPay={() => {
            setFocus(null);
            push('pagamento');
          }}
        />
      );
      break;
    case 'qtd':
      body = line ? (
        <NumberPage
          title={line.name}
          label="Editar quantidade"
          initial={line.qty}
          format={(v) => String(v)}
          push={pushQtyDigit}
          extra={
            <Touchable
              onPress={() => {
                setCart((c) => removeLine(c, line.name));
                setFocus(null);
                pop();
              }}
            >
              <Text size={s.sub} weight="semibold" color={KY.red}>
                Remover do carrinho
              </Text>
            </Touchable>
          }
          onBack={pop}
          onSave={(v) => {
            setCart((c) => setQty(c, line.name, v));
            if (v <= 0) setFocus(null);
            pop();
          }}
        />
      ) : null;
      break;
    case 'preco':
      body = line ? (
        <NumberPage
          title={line.name}
          label="Editar valor unitário"
          hint="O valor deste produto será editado apenas para esta venda."
          initial={line.unitCents}
          money
          onBack={pop}
          onSave={(v) => {
            setCart((c) => setUnitPrice(c, line.name, v));
            pop();
          }}
        />
      ) : null;
      break;
    case 'descItem':
      body = line ? (
        <NumberPage
          title={line.name}
          label="Desconto no item"
          hint={`Total do item: ${brlCents(line.qty * line.unitCents)}`}
          initial={line.discountCents}
          money
          onBack={pop}
          onSave={(v) => {
            setCart((c) => setLineDiscount(c, line.name, v));
            pop();
          }}
        />
      ) : null;
      break;
    case 'desconto':
      body = (
        <DiscountPage
          cart={cart}
          onBack={pop}
          onSave={(d) => {
            setCart((c) => ({ ...c, discount: d }));
            pop();
          }}
        />
      );
      break;
    case 'obs':
      body = (
        <NotePage
          cart={cart}
          onBack={pop}
          onSave={(note, onReceipt) => {
            setCart((c) => ({ ...c, note, noteOnReceipt: onReceipt }));
            pop();
          }}
        />
      );
      break;
    case 'entrega':
      body = (
        <DeliveryPage
          value={cart.delivery}
          onBack={pop}
          onPick={(delivery) => {
            setCart((c) => ({ ...c, delivery }));
            pop();
          }}
        />
      );
      break;
    case 'pagamento':
      body = (
        <PaymentPage
          cart={cart}
          method={method}
          onMethod={setMethod}
          onBack={pop}
          onCustomer={() => push('cliente')}
          onFiado={() => void conclude('fiado', 'Fiado', null)}
          onSaveOrder={() => void conclude('order', method, null)}
          onNext={() => {
            if (method === 'Dinheiro') {
              setReceived(total);
              push('dinheiro');
            } else void conclude('sale', method, null);
          }}
        />
      );
      break;
    case 'dinheiro':
      body = (
        <CashPage
          total={total}
          value={received}
          onChange={setReceived}
          onBack={pop}
          onConclude={() => void conclude('sale', 'Dinheiro', received)}
        />
      );
      break;
    case 'concluida':
      body = done ? (
        <DonePage
          done={done}
          customer={cart.customer?.name ?? null}
          onMenu={nav.menu}
          onReceipt={() => push('recibo')}
          onTalk={() => {
            const c = cart.customer;
            if (!c?.phone) return;
            composeWhatsApp(
              {
                to: c.name.split(' ')[0] ?? c.name,
                phone: c.phone,
                text: `Oi! Obrigado pela compra. Segue o recibo #${done.sale.number}: total ${brlCents(total)}.`,
              },
              router,
            );
          }}
          onRestart={restart}
        />
      ) : null;
      break;
    case 'recibo':
      body = done ? <ReceiptScreen data={done.receipt} onClose={pop} /> : null;
      break;
    default:
      body = (
        <SellPage
          cart={cart}
          onAdd={(p, n) => setCart((c) => addProduct(c, p, n))}
          onMenu={nav.menu}
          onCustomer={() => push('cliente')}
          onCart={() => push('carrinho')}
        />
      );
  }

  return (
    <View style={{ flex: 1, backgroundColor: KY.card }}>
      <Swap
        id={page + (page === 'qtd' || page === 'preco' ? focus : '')}
        dir={dir}
        style={{ flex: 1 }}
      >
        {body}
      </Swap>
      <Presence show={more} distance={40} style={{ position: 'absolute', inset: 0 }}>
        <SheetCard onClose={() => setMore(false)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text size={s.big} weight="semibold" style={{ flex: 1 }}>
              Mais opções
            </Text>
            <Touchable onPress={() => setMore(false)} accessibilityLabel="Fechar">
              <KIcon name="close" size={s.icon + 6} />
            </Touchable>
          </View>
          {(
            [
              ['Opções de entrega', 'entrega'],
              ['Adicionar observação', 'obs'],
              ['Adicionar desconto', 'desconto'],
            ] as [string, Page][]
          ).map(([label, p]) => (
            <OptionLine
              key={p}
              label={label}
              onPress={() => {
                setMore(false);
                push(p);
              }}
            />
          ))}
          <OptionLine
            label="Esvaziar carrinho"
            danger
            onPress={() => {
              setMore(false);
              setCart((c) => ({ ...emptyCart(), customer: c.customer }));
              setFocus(null);
              setStack(['vender']);
            }}
          />
        </SheetCard>
      </Presence>
      <Presence show={!!busy} distance={0} style={{ position: 'absolute', inset: 0 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,.86)',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
          }}
        >
          <Spinner color={KY.green} size={s.phone ? 56 : 80} />
          <Text size={s.body} weight="medium" color={KY.sub}>
            {busy ?? ''}
          </Text>
        </View>
      </Presence>
      <Presence show={!!fail} distance={40} style={{ position: 'absolute', inset: 0 }}>
        <SheetCard onClose={() => setFail(null)}>
          <Text size={s.big} weight="bold">
            Não consegui registrar sozinho
          </Text>
          <Text size={s.body} color={KY.sub} style={{ marginBottom: 12 }}>
            {fail?.message} O carrinho continua aqui. Tente de novo ou abra o Kyte com os itens e o
            cliente já colocados para concluir lá.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <KyteButton
              label="Abrir no Kyte"
              outline
              flex
              onPress={() => {
                const p = fail?.plan;
                setFail(null);
                if (p)
                  onOpenKyte({
                    items: p.items.map((i) => ({ name: i.name, qty: i.qty })),
                    customer: p.customer,
                  });
              }}
            />
            <KyteButton
              label="Tentar de novo"
              flex
              onPress={() => {
                const p = fail?.plan;
                if (p)
                  void conclude(
                    p.mode,
                    p.mode === 'fiado' ? 'Fiado' : (p.payment as PaymentMethod),
                    p.receivedCents,
                  );
              }}
            />
          </View>
        </SheetCard>
      </Presence>
    </View>
  );
}

/* ─────────────────────────────── Vender ─────────────────────────────── */

function SellPage({
  cart,
  onAdd,
  onMenu,
  onCustomer,
  onCart,
}: {
  cart: Cart;
  onAdd: (p: KyteProduct, n: number) => void;
  onMenu: () => void;
  onCustomer: () => void;
  onCart: () => void;
}) {
  const s = useKySize();
  const data = useKyteList('product');
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [mult, setMult] = useState(1);
  const products = data.list ?? [];
  const cats = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );
  const list = useMemo(() => {
    const t = norm(q.trim());
    return [...products]
      .filter(
        (p) => (!cat || p.category === cat) && (!t || norm(`${p.name} ${p.code}`).includes(t)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [products, q, cat]);
  const qty = useMemo(() => new Map(cart.lines.map((l) => [l.name, l.qty])), [cart.lines]);
  const count = countItems(cart);
  const toolIcon = s.icon + 2;

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Vender"
        onMenu={onMenu}
        right={
          cart.customer ? (
            <CustomerChip name={cart.customer.name} onPress={onCustomer} />
          ) : (
            <Touchable
              onPress={onCustomer}
              accessibilityLabel="Adicionar cliente"
              style={{
                width: s.phone ? 72 : 100,
                height: s.phone ? 72 : 100,
                borderRadius: s.phone ? 16 : 24,
                backgroundColor: KY.green,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KIcon name="person-add-outline" size={s.icon + 4} color="#FFFFFF" />
            </Touchable>
          )
        }
      />
      {/* Barra de ferramentas: busca e "1X" (quantos itens cada toque põe). */}
      <View
        style={{
          height: s.phone ? 84 : 112,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: s.pad,
          gap: 16,
          borderBottomWidth: searching ? 1 : 0,
          borderBottomColor: KY.line,
        }}
      >
        {searching ? (
          <>
            <Touchable
              onPress={() => {
                setSearching(false);
                setQ('');
              }}
              accessibilityLabel="Fechar busca"
            >
              <KIcon name="close" size={toolIcon} />
            </Touchable>
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder="Item ou código"
              placeholderTextColor={KY.faint}
              autoCorrect={false}
              style={{
                flex: 1,
                fontFamily: FONT.textRegular,
                fontSize: s.body,
                color: KY.ink,
                paddingVertical: 0,
                ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
              }}
            />
          </>
        ) : (
          <>
            <Touchable onPress={() => setSearching(true)} accessibilityLabel="Buscar produto">
              <KIcon name="search" size={toolIcon} />
            </Touchable>
            <View style={{ flex: 1 }} />
            <Touchable
              onPress={() => setMult((m) => MULT[(MULT.indexOf(m) + 1) % MULT.length] ?? 1)}
              accessibilityLabel={`Cada toque põe ${mult}`}
              style={{
                borderWidth: 2,
                borderColor: KY.ink,
                borderRadius: 8,
                paddingHorizontal: 12,
                height: s.phone ? 44 : 64,
                minWidth: s.phone ? 60 : 84,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text size={s.sub} weight="semibold">
                {mult}X
              </Text>
            </Touchable>
          </>
        )}
      </View>
      {!searching && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            flexGrow: 0,
            height: s.phone ? 64 : 88,
            borderBottomWidth: 1,
            borderBottomColor: KY.line,
          }}
        >
          {[null, ...cats].map((c) => {
            const on = cat === c;
            return (
              <Touchable
                key={c ?? '*'}
                onPress={() => setCat(c)}
                scaleTo={0.98}
                style={{
                  minWidth: s.phone ? 200 : 260,
                  paddingHorizontal: 24,
                  height: s.phone ? 64 : 88,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottomWidth: 4,
                  borderBottomColor: on ? KY.green : 'transparent',
                }}
              >
                <Text size={s.sub} weight="semibold" color={on ? KY.greenInk : KY.faint}>
                  {(c ?? 'Tudo').toUpperCase()}
                </Text>
              </Touchable>
            );
          })}
        </ScrollView>
      )}
      <FlatList
        data={list}
        keyExtractor={(p) => p.id || p.name}
        initialNumToRender={12}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            {data.loading ? (
              <Spinner color={KY.green} />
            ) : (
              <Text size={s.body} color={KY.sub} style={{ textAlign: 'center' }}>
                {data.error ?? 'Nenhum produto encontrado.'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const n = qty.get(item.name) ?? 0;
          return (
            <Touchable
              onPress={() => onAdd(item, mult)}
              scaleTo={0.985}
              accessibilityLabel={`${item.name}, ${brl(item.price)}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: s.phone ? 18 : 26,
                height: s.rowH,
                paddingHorizontal: s.pad,
                borderBottomWidth: 1,
                borderBottomColor: KY.line,
              }}
            >
              <View>
                <Thumb
                  image={item.image}
                  name={item.name}
                  size={s.thumb}
                  radius={s.phone ? 10 : 16}
                />
                {n > 0 ? (
                  <Appear distance={6} style={{ position: 'absolute', top: -6, right: -6 }}>
                    <View
                      style={{
                        minWidth: s.phone ? 36 : 52,
                        height: s.phone ? 36 : 52,
                        borderRadius: s.phone ? 8 : 12,
                        backgroundColor: KY.green,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 6,
                      }}
                    >
                      <Text size={s.small} weight="bold" color="#FFFFFF">
                        {n}
                      </Text>
                    </View>
                  </Appear>
                ) : null}
              </View>
              <Text size={s.row} weight="medium" lines={1} style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Text size={s.row}>{brl(item.price)}</Text>
            </Touchable>
          );
        }}
      />
      <Bottom>
        <KyteButton
          label={cartButtonLabel(cart)}
          outline={!count}
          greenOutline
          chevron={count > 0}
          onPress={() => count && onCart()}
        />
      </Bottom>
    </View>
  );
}

/* ─────────────────────────── Adicionar cliente ─────────────────────────── */

function CustomerPage({
  current,
  onBack,
  onNew,
  onPick,
}: {
  current: string | null;
  onBack: () => void;
  onNew: () => void;
  onPick: (c: KyteCustomer | null) => void;
}) {
  const s = useKySize();
  const data = useKyteList('customer');
  const sales = useKyteList('sale');
  const [q, setQ] = useState('');
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
    const t = norm(q.trim());
    return [...(data.list ?? [])]
      .filter(
        (c) =>
          !t ||
          norm(`${c.name} ${c.email}`).includes(t) ||
          (t.replace(/\D/g, '') && c.phone.replace(/\D/g, '').includes(t.replace(/\D/g, ''))),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [data.list, q]);

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Adicionar cliente"
        onBack={onBack}
        right={
          <Touchable
            onPress={onNew}
            accessibilityLabel="Cadastrar cliente"
            style={{
              width: s.phone ? 72 : 100,
              height: s.phone ? 72 : 100,
              borderRadius: s.phone ? 16 : 24,
              backgroundColor: KY.green,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KIcon name="add" size={s.icon + 12} color="#FFFFFF" />
          </Touchable>
        }
      />
      <View
        style={{
          height: s.phone ? 84 : 112,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          paddingHorizontal: s.pad,
          backgroundColor: '#F4F6F8',
        }}
      >
        <Touchable onPress={() => setQ('')} accessibilityLabel="Limpar busca">
          <KIcon name={q ? 'close' : 'search'} size={s.icon} />
        </Touchable>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Digite aqui"
          placeholderTextColor={KY.faint}
          autoCorrect={false}
          style={{
            flex: 1,
            fontFamily: FONT.textRegular,
            fontSize: s.body,
            color: KY.ink,
            paddingVertical: 0,
            ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
          }}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id || c.name}
        initialNumToRender={12}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            {data.loading ? (
              <Spinner color={KY.green} />
            ) : (
              <Text size={s.body} color={KY.sub}>
                {data.error ?? 'Nenhum cliente encontrado.'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const l = last.get(norm(item.name));
          const on = current === item.name;
          return (
            <Touchable
              onPress={() => onPick(item)}
              scaleTo={0.99}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                minHeight: s.phone ? 104 : 136,
                paddingLeft: s.pad,
                paddingRight: s.pad - 8,
                borderBottomWidth: 1,
                borderBottomColor: KY.line,
                backgroundColor: on ? '#E6FAF4' : KY.card,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text size={s.row} weight="semibold" lines={1}>
                  {item.name}
                </Text>
                {l ? (
                  <Text size={s.small} color={KY.faint} lines={1}>
                    Última compra: {new Date(l.date).toLocaleDateString('pt-BR')} - {brl(l.total)}
                  </Text>
                ) : null}
              </View>
              <KIcon
                name="logo-whatsapp"
                size={s.icon + 2}
                color={item.phone ? KY.wa : '#C9CFD6'}
              />
              <KIcon name="chevron-forward" size={s.icon - 6} color={KY.sub} />
            </Touchable>
          );
        }}
      />
      {current ? (
        <Bottom>
          <KyteButton label="Desvincular cliente" outline onPress={() => onPick(null)} />
        </Bottom>
      ) : null}
    </View>
  );
}

/* ─────────────────────────────── Carrinho ─────────────────────────────── */

function CartPage({
  cart,
  focus,
  onFocus,
  onBack,
  onCustomer,
  onEdit,
  onDiscount,
  onMore,
  onPay,
}: {
  cart: Cart;
  focus: string | null;
  onFocus: (name: string) => void;
  onBack: () => void;
  onCustomer: () => void;
  onEdit: (what: 'qtd' | 'preco' | 'descItem') => void;
  onDiscount: () => void;
  onMore: () => void;
  onPay: () => void;
}) {
  const s = useKySize();
  const d = discountCents(cart);
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Carrinho"
        onBack={onBack}
        right={
          cart.customer ? <CustomerChip name={cart.customer.name} onPress={onCustomer} /> : null
        }
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#EEF1F4' }}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* O item tocado vai para o topo (como no Kyte) e mostra quantidade, valor e desconto. */}
        {[...cart.lines]
          .sort((a, b) => (a.name === focus ? -1 : b.name === focus ? 1 : 0))
          .map((l) => (
            <CartRow
              key={l.name}
              line={l}
              open={focus === l.name}
              dim={!!focus && focus !== l.name}
              onPress={() => onFocus(l.name)}
              onEdit={onEdit}
            />
          ))}
        <View style={{ alignItems: 'flex-end', paddingHorizontal: s.pad, paddingTop: 18, gap: 10 }}>
          <Touchable onPress={onDiscount}>
            <Text size={s.body} weight="medium" color={KY.greenInk}>
              {d ? `Desconto: − ${brlCents(d)}` : 'Dar desconto'}
            </Text>
          </Touchable>
          {cart.note ? (
            <Text size={s.small} color={KY.sub} lines={1}>
              Obs.: {cart.note}
            </Text>
          ) : null}
          {cart.delivery === 'entrega' ? (
            <Text size={s.small} color={KY.sub}>
              Entrega
            </Text>
          ) : null}
          <Text size={s.body} weight="semibold">
            TOTAL: {brlCents(totalCents(cart))}
          </Text>
        </View>
      </ScrollView>
      <Bottom>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <MoreButton onPress={onMore} />
          <View style={{ flex: 1 }}>
            <KyteButton label={cartButtonLabel(cart)} chevron onPress={onPay} />
          </View>
        </View>
      </Bottom>
    </View>
  );
}

function CartRow({
  line: l,
  open,
  dim,
  onPress,
  onEdit,
}: {
  line: CartLine;
  open: boolean;
  dim: boolean;
  onPress: () => void;
  onEdit: (what: 'qtd' | 'preco' | 'descItem') => void;
}) {
  const s = useKySize();
  const edited = l.unitCents !== l.listCents;
  const cell = (
    icon: IconName,
    top: string,
    bottom: string | null,
    what: 'qtd' | 'preco' | 'descItem',
    red?: boolean,
  ) => (
    <Touchable
      onPress={() => onEdit(what)}
      scaleTo={0.97}
      style={{
        flex: 1,
        height: s.phone ? 104 : 140,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderLeftWidth: what === 'qtd' ? 0 : 1,
        borderLeftColor: KY.line,
      }}
    >
      <KIcon name={icon} size={s.icon - 2} color={red ? KY.red : KY.ink} />
      <Text size={s.small} weight={red ? 'semibold' : 'medium'} color={red ? KY.red : KY.ink}>
        {top}
      </Text>
      {bottom ? (
        <Text size={s.small - 3} color={KY.sub}>
          {bottom}
        </Text>
      ) : null}
    </Touchable>
  );
  return (
    <View
      style={{
        backgroundColor: open ? KY.card : dim ? '#F7F8FA' : KY.card,
        opacity: dim ? 0.55 : 1,
        borderBottomWidth: 1,
        borderBottomColor: KY.line,
      }}
    >
      <Touchable
        onPress={onPress}
        scaleTo={0.99}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: s.phone ? 96 : 128,
          paddingHorizontal: s.pad,
        }}
      >
        <Text size={s.body} weight="medium" style={{ minWidth: s.phone ? 48 : 70 }}>
          {l.qty}
          <Text size={s.small} color={KY.faint}>
            {' '}
            x
          </Text>
        </Text>
        <View style={{ flex: 1 }}>
          <Text size={s.body} lines={1}>
            {l.name}
          </Text>
          <Text size={s.small} color={KY.faint}>
            {edited ? (
              <Text size={s.small} color={KY.faint} style={{ textDecorationLine: 'line-through' }}>
                {brlCents(l.listCents)}
              </Text>
            ) : null}
            {edited ? ' ' : ''}
            {brlCents(l.unitCents)}
            {l.discountCents ? `  · − ${brlCents(l.discountCents)}` : ''}
          </Text>
        </View>
        <Text size={s.body} weight="semibold">
          {brlCents(lineCents(l))}
        </Text>
      </Touchable>
      {open ? (
        <Appear
          distance={8}
          style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: KY.line }}
        >
          {cell('archive-outline', `${l.qty} ${l.qty === 1 ? 'item' : 'itens'}`, null, 'qtd')}
          {cell('logo-usd', brlCents(l.unitCents), 'unidade', 'preco')}
          {cell(
            'pricetag-outline',
            l.discountCents ? `− ${brlCents(l.discountCents)}` : 'DESCONTO',
            null,
            'descItem',
            true,
          )}
        </Appear>
      ) : null}
    </View>
  );
}

/* ─────────────────────── Teclados (valor, quantidade) ─────────────────────── */

function NumberPage({
  title,
  label,
  hint,
  initial,
  money,
  format,
  push: pushFn,
  extra,
  onBack,
  onSave,
}: {
  title: string;
  label: string;
  hint?: string;
  initial: number;
  money?: boolean;
  format?: (v: number) => string;
  push?: (v: number, d: number) => number;
  extra?: React.ReactNode;
  onBack: () => void;
  onSave: (v: number) => void;
}) {
  const s = useKySize();
  const [v, setV] = useState(initial);
  // Primeiro dígito substitui o valor (como no Kyte); depois vai somando à direita.
  const fresh = useRef(true);
  const digit = (d: number) => {
    const base = fresh.current ? 0 : v;
    fresh.current = false;
    setV((pushFn ?? pushDigit)(base, d));
  };
  const shown = money ? `R$ ${amountCents(v)}` : (format ?? String)(v);
  const display = (
    <View
      style={{
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: s.pad,
        paddingVertical: s.phone ? 40 : 20,
      }}
    >
      <Text size={s.sub} weight="medium" color={KY.ink}>
        {label}
      </Text>
      <View
        style={{
          borderBottomWidth: 3,
          borderBottomColor: KY.green,
          paddingHorizontal: 30,
          paddingBottom: 6,
        }}
      >
        <Text size={s.phone ? 64 : 88} color={KY.sub} style={{ fontFamily: FONT.displayLight }}>
          {shown}
        </Text>
      </View>
      {hint ? (
        <Text size={s.small} color={KY.faint} style={{ textAlign: 'center', maxWidth: 520 }}>
          {hint}
        </Text>
      ) : null}
      {extra}
    </View>
  );
  const pad = (
    <Numpad
      onDigit={digit}
      onBack={() => {
        fresh.current = false;
        setV((x) => (money ? popDigit(x) : Math.floor(x / 10)));
      }}
      onOk={() => onSave(v)}
    />
  );
  return (
    <View style={{ flex: 1 }}>
      <Header title={title} onBack={onBack} />
      {s.phone ? (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {display}
          <Bottom>{pad}</Bottom>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>{display}</View>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 20 }}>{pad}</View>
        </View>
      )}
    </View>
  );
}

function DiscountPage({
  cart,
  onBack,
  onSave,
}: {
  cart: Cart;
  onBack: () => void;
  onSave: (d: Cart['discount']) => void;
}) {
  const s = useKySize();
  const r = useRadius();
  const [kind, setKind] = useState<'value' | 'percent'>(cart.discount?.kind ?? 'value');
  const [v, setV] = useState(cart.discount?.amount ?? 0);
  const sub = cart.lines.reduce((a, l) => a + lineCents(l), 0);
  const shown = kind === 'value' ? `R$ ${amountCents(v)}` : `${v}%`;
  const seg = (k: 'value' | 'percent', label: string) => (
    <Touchable
      key={k}
      onPress={() => {
        setKind(k);
        setV(0);
      }}
      style={{
        flex: 1,
        height: s.phone ? 60 : 84,
        borderRadius: r - 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: kind === k ? KY.card : 'transparent',
      }}
    >
      <Text size={s.sub} weight={kind === k ? 'semibold' : 'regular'}>
        {label}
      </Text>
    </Touchable>
  );
  const display = (
    <View style={{ alignItems: 'center', gap: 18, padding: s.pad }}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#E9ECF0',
          borderRadius: r,
          padding: 4,
          width: s.phone ? 360 : 480,
        }}
      >
        {seg('value', 'R$')}
        {seg('percent', '%')}
      </View>
      <View
        style={{
          borderBottomWidth: 3,
          borderBottomColor: KY.green,
          paddingHorizontal: 30,
          paddingBottom: 6,
        }}
      >
        <Text size={s.phone ? 64 : 88} color={KY.sub} style={{ fontFamily: FONT.displayLight }}>
          {shown}
        </Text>
      </View>
      <Text size={s.small} color={KY.faint}>
        Subtotal {brlCents(sub)} · Total com desconto{' '}
        {brlCents(totalCents({ ...cart, discount: { kind, amount: v } }))}
      </Text>
      {cart.discount ? (
        <Touchable onPress={() => onSave(null)}>
          <Text size={s.sub} weight="semibold" color={KY.red}>
            Tirar desconto
          </Text>
        </Touchable>
      ) : null}
    </View>
  );
  const pad = (
    <Numpad
      onDigit={(d) => setV((x) => (kind === 'value' ? pushDigit(x, d) : Math.min(100, x * 10 + d)))}
      onBack={() => setV((x) => Math.floor(x / 10))}
      onOk={() => onSave(v > 0 ? { kind, amount: v } : null)}
    />
  );
  return (
    <View style={{ flex: 1 }}>
      <Header title="Dar desconto" onBack={onBack} />
      {s.phone ? (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {display}
          <Bottom>{pad}</Bottom>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>{display}</View>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 20 }}>{pad}</View>
        </View>
      )}
    </View>
  );
}

/* ─────────────────────── Observação e entrega ─────────────────────── */

function NotePage({
  cart,
  onBack,
  onSave,
}: {
  cart: Cart;
  onBack: () => void;
  onSave: (note: string, onReceipt: boolean) => void;
}) {
  const s = useKySize();
  const [t, setT] = useState(cart.note);
  const [show, setShow] = useState(cart.noteOnReceipt);
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Adicionar observação"
        onBack={onBack}
        right={
          <Touchable onPress={() => setT('')}>
            <Text size={s.sub} weight="semibold" color={KY.greenInk}>
              Limpar
            </Text>
          </Touchable>
        }
      />
      <TextInput
        value={t}
        onChangeText={setT}
        multiline
        autoFocus
        placeholder="Escreva a observação"
        placeholderTextColor={KY.faint}
        style={{
          flex: 1,
          textAlignVertical: 'top',
          fontFamily: FONT.textRegular,
          fontSize: s.body,
          color: KY.ink,
          paddingHorizontal: s.pad,
          paddingTop: 12,
          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
        }}
      />
      <View style={{ backgroundColor: '#F4F6F8' }}>
        <Touchable
          onPress={() => setShow((x) => !x)}
          scaleTo={0.99}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            height: s.phone ? 84 : 112,
          }}
        >
          <KIcon
            name={show ? 'checkbox' : 'square-outline'}
            size={s.icon}
            color={show ? KY.green : KY.sub}
          />
          <Text size={s.sub} color={KY.sub}>
            Exibir esta observação no recibo
          </Text>
        </Touchable>
        <Bottom>
          <KyteButton label="Salvar" onPress={() => onSave(t.trim(), show)} />
        </Bottom>
      </View>
    </View>
  );
}

function DeliveryPage({
  value,
  onBack,
  onPick,
}: {
  value: Delivery;
  onBack: () => void;
  onPick: (d: Delivery) => void;
}) {
  const s = useKySize();
  const opt = (d: Delivery, label: string, sub: string) => (
    <OptionLine
      key={d}
      label={label}
      onPress={() => onPick(d)}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text size={s.small} color={KY.sub}>
            {sub}
          </Text>
          <KIcon
            name={value === d ? 'radio-button-on' : 'radio-button-off'}
            size={s.icon}
            color={value === d ? KY.green : KY.faint}
          />
        </View>
      }
    />
  );
  return (
    <View style={{ flex: 1 }}>
      <Header title="Opções de entrega" onBack={onBack} />
      <View style={{ paddingHorizontal: s.pad }}>
        {opt('retirada', 'Retirada', 'o cliente leva na hora')}
        {opt('entrega', 'Entrega', 'levamos até o cliente')}
      </View>
    </View>
  );
}

/* ─────────────────────────────── Pagamento ─────────────────────────────── */

const PAY_ICON: Record<Exclude<PaymentMethod, 'Fiado'>, IconName> = {
  Dinheiro: 'cash-outline',
  'Cartão de Débito': 'card-outline',
  'Cartão de Crédito': 'card-outline',
  'Saldo Cliente': 'person-circle-outline',
  'Link de Pagamento': 'link-outline',
  Outros: 'ellipsis-horizontal-circle-outline',
  Pix: 'diamond-outline',
};

function PaymentPage({
  cart,
  method,
  onMethod,
  onBack,
  onCustomer,
  onFiado,
  onSaveOrder,
  onNext,
}: {
  cart: Cart;
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  onBack: () => void;
  onCustomer: () => void;
  onFiado: () => void;
  onSaveOrder: () => void;
  onNext: () => void;
}) {
  const s = useKySize();
  const total = totalCents(cart);
  const fiado = canPayWith(cart, 'Fiado');
  const amount = (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        paddingVertical: s.phone ? 44 : 0,
        flex: s.phone ? undefined : 1,
      }}
    >
      <BigAmount value={amountCents(total)} />
      <Touchable
        onPress={fiado ? onFiado : onCustomer}
        style={{
          borderWidth: 2,
          borderColor: KY.navy,
          borderRadius: s.phone ? 10 : 14,
          paddingHorizontal: 18,
          height: s.phone ? 56 : 80,
          justifyContent: 'center',
        }}
      >
        <Text size={s.sub} weight="medium">
          Venda Fiado
        </Text>
      </Touchable>
      {!fiado ? (
        <Text size={s.small} color={KY.faint}>
          Para vender fiado, escolha o cliente.
        </Text>
      ) : null}
    </View>
  );
  const grid = (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: KY.line }}
    >
      {PAYMENT_METHODS.map((m, i) => {
        const on = method === m;
        const ok = canPayWith(cart, m);
        const balance = m === 'Saldo Cliente' ? brlCents(cart.customer?.balanceCents ?? 0) : null;
        return (
          <Touchable
            key={m}
            disabled={!ok}
            onPress={() => onMethod(m)}
            scaleTo={0.96}
            style={{
              width: '33.333%',
              height: s.phone ? 136 : 150,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRightWidth: i % 3 === 2 ? 0 : 1,
              borderBottomWidth: 1,
              borderColor: KY.line,
              backgroundColor: on ? '#E6FAF4' : KY.card,
              opacity: ok ? 1 : 0.35,
            }}
          >
            <KIcon name={PAY_ICON[m]} size={s.icon + 6} color={on ? KY.greenInk : KY.ink} />
            <Text
              size={s.small}
              weight={on ? 'semibold' : 'medium'}
              color={on ? KY.greenInk : KY.ink}
              style={{ textAlign: 'center' }}
            >
              {m}
            </Text>
            {balance ? (
              <Text size={s.small - 3} color={KY.faint}>
                {balance}
              </Text>
            ) : null}
          </Touchable>
        );
      })}
    </View>
  );
  const buttons = (
    <>
      <KyteButton label="Salvar pedido" outline onPress={onSaveOrder} />
      <KyteButton label="Avançar" chevron onPress={onNext} />
    </>
  );
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Pagamento"
        onBack={onBack}
        right={
          cart.customer ? <CustomerChip name={cart.customer.name} onPress={onCustomer} /> : null
        }
      />
      {s.phone ? (
        <>
          <ScrollView style={{ flex: 1 }}>
            {amount}
            {grid}
          </ScrollView>
          <Bottom>{buttons}</Bottom>
        </>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {amount}
          <View style={{ flex: 1.2, justifyContent: 'space-between' }}>
            {grid}
            <Bottom>{buttons}</Bottom>
          </View>
        </View>
      )}
    </View>
  );
}

function CashPage({
  total,
  value,
  onChange,
  onBack,
  onConclude,
}: {
  total: number;
  value: number;
  onChange: (v: number) => void;
  onBack: () => void;
  onConclude: () => void;
}) {
  const s = useKySize();
  const fresh = useRef(true);
  const change = changeCents(value, total);
  const short = value < total;
  const display = (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: s.phone ? 44 : 0 }}>
      <Text size={s.small} color={KY.sub} weight="medium">
        VALOR RECEBIDO
      </Text>
      <BigAmount value={amountCents(value)} color={KY.green} cursor />
      <Text size={s.sub} color={short ? KY.red : KY.sub} weight="medium">
        {short
          ? `Falta ${brlCents(total - value)}`
          : change
            ? `Troco: ${brlCents(change)}`
            : 'Sem troco'}
      </Text>
    </View>
  );
  const pad = (
    <Numpad
      onDigit={(d) => {
        const base = fresh.current ? 0 : value;
        fresh.current = false;
        onChange(pushDigit(base, d));
      }}
      onBack={() => {
        fresh.current = false;
        onChange(popDigit(value));
      }}
    />
  );
  const button = (
    <KyteButton label={`Concluir ${brlCents(total)}`} disabled={short} onPress={onConclude} />
  );
  return (
    <View style={{ flex: 1 }}>
      <Header title="Pagamento: Dinheiro" onBack={onBack} />
      {s.phone ? (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {display}
          <Bottom>
            {pad}
            {button}
          </Bottom>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>{display}</View>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {pad}
            <Bottom>{button}</Bottom>
          </View>
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────── Venda Concluída ─────────────────────────── */

function DonePage({
  done,
  customer,
  onMenu,
  onReceipt,
  onTalk,
  onRestart,
}: {
  done: Done;
  customer: string | null;
  onMenu: () => void;
  onReceipt: () => void;
  onTalk: () => void;
  onRestart: () => void;
}) {
  const s = useKySize();
  const title = done.order ? 'Pedido Salvo' : 'Venda Concluída';
  return (
    <View style={{ flex: 1 }}>
      <Header
        title={title}
        onMenu={onMenu}
        right={customer ? <CustomerChip name={customer} onPress={() => {}} /> : null}
      />
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: s.pad }}
      >
        <Appear distance={20}>
          <KIcon name="checkmark" size={s.phone ? 200 : 220} color={KY.green} />
        </Appear>
        <Text size={s.phone ? 34 : 48} weight="semibold" color={KY.sub}>
          {title}
        </Text>
        <Text size={s.phone ? 44 : 60} color={KY.sub} style={{ fontFamily: FONT.displayLight }}>
          {brl(done.sale.total)}
        </Text>
        {done.changeCents ? (
          <Text size={s.body} weight="medium" color={KY.greenInk}>
            Troco: {brlCents(done.changeCents)}
          </Text>
        ) : null}
        {done.missing.length ? (
          <Text
            size={s.small}
            color={KY.red}
            style={{ textAlign: 'center', maxWidth: 760, marginTop: 10 }}
          >
            Confira no Kyte: não consegui aplicar {done.missing.join(', ')}.
          </Text>
        ) : null}
      </View>
      {done.phone ? (
        <Touchable
          onPress={onTalk}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            paddingVertical: 14,
          }}
        >
          <KIcon name="logo-whatsapp" size={s.icon} color={KY.green} />
          <Text size={s.body} weight="medium" color={KY.greenInk}>
            Falar com cliente
          </Text>
        </Touchable>
      ) : null}
      <Bottom>
        {done.order ? null : (
          <KyteButton label="Recibo" icon="receipt-outline" outline onPress={onReceipt} />
        )}
        <KyteButton label="Iniciar outra venda" onPress={onRestart} />
      </Bottom>
    </View>
  );
}
