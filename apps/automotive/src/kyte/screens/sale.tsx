import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Image, Linking, Platform, ScrollView, Share, View } from 'react-native';
import { callPhone, openWhatsApp } from '../../integrations/contact';
import { useTabBarSpace } from '../../layout/form-factor';
import { Touchable } from '../../ui/primitives';
import { Spinner } from '../../ui/spinner';
import { kyteAgent } from '../agent';
import { brl, fmtQty, type KyteSale } from '../model';
import { type KyteStoreInfo, PREVIEW, patchSale, useKyteList, useKyteStore } from '../store';
import { Header, type IconName, KIcon, KY, SmallButton, State, Tabs, Text, useKySize } from '../ui';
import { payIcon } from './history';
import { useKyteNav } from './nav';

const dateTime = (ms: number | null) =>
  ms == null
    ? ''
    : `${new Date(ms).toLocaleDateString('pt-BR')} às ${new Date(ms).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

function useSale(id: string) {
  const data = useKyteList('sale');
  return { sale: (data.list ?? []).find((v) => v.id === id) ?? null, data };
}

/** Venda aberta (print 9): total, pagamento, abas Itens/Detalhes/Cliente, recibo e cancelar. */
export function SaleDetail({ id }: { id: string }) {
  const s = useKySize();
  const nav = useKyteNav();
  const { sale } = useSale(id);
  const store = useKyteStore();
  const [tab, setTab] = useState<'itens' | 'detalhes' | 'cliente'>('itens');
  const [confirm, setConfirm] = useState(false);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [localCancel, setLocalCancel] = useState(false);
  const tabSpace = useTabBarSpace();

  if (!sale)
    return (
      <View style={{ flex: 1, backgroundColor: KY.bg }}>
        <Header title="Venda" onBack={nav.back} />
        <State empty="Venda não encontrada." />
      </View>
    );
  const canceled = sale.canceled || localCancel;

  const cancel = async () => {
    setWorking(true);
    setMsg(null);
    try {
      if (PREVIEW) setLocalCancel(true);
      else {
        const r = await kyteAgent.cancelSale(sale.number);
        patchSale(sale.id, { canceled: true });
        setMsg(
          r.canceled ? 'Venda cancelada no Kyte.' : 'Pedido enviado ao Kyte. Confira no Histórico.',
        );
      }
      setConfirm(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Não consegui cancelar no Kyte.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header title={dateTime(sale.date)} onBack={nav.back} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: s.pad, gap: 16, paddingBottom: 20 }}>
        <View
          style={{
            backgroundColor: '#E1E6EC',
            borderRadius: 20,
            padding: 26,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text
              size={s.phone ? 56 : 78}
              weight="bold"
              style={canceled ? { textDecorationLine: 'line-through' } : undefined}
            >
              {brl(sale.total)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <KIcon name={payIcon(sale.payment)} size={s.icon} />
              <Text size={s.row} weight="medium">
                {sale.payment || 'Pagamento'}
              </Text>
              {canceled && (
                <Text size={s.sub} weight="bold" color={KY.red}>
                  · CANCELADA
                </Text>
              )}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {sale.number ? (
              <Text size={s.big} weight="bold">
                #{sale.number}
              </Text>
            ) : null}
            {store?.name ? (
              <Text size={s.sub} color={KY.sub}>
                {store.name}
              </Text>
            ) : null}
          </View>
        </View>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'itens', label: 'ITENS', icon: 'cube-outline' },
            { key: 'detalhes', label: 'DETALHES', icon: 'list-outline' },
            { key: 'cliente', label: 'CLIENTE', icon: 'person-outline' },
          ]}
        />
        <View
          style={{
            backgroundColor: KY.card,
            borderRadius: 18,
            paddingHorizontal: 26,
            paddingVertical: 8,
          }}
        >
          {tab === 'itens' &&
            (sale.items.length ? (
              sale.items.map((i, n) => (
                <View
                  // biome-ignore lint/suspicious/noArrayIndexKey: itens da venda não têm id
                  key={n}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 20,
                    borderTopWidth: n ? 1 : 0,
                    borderTopColor: KY.line,
                    gap: 20,
                  }}
                >
                  <Text size={s.big} color={KY.sub} style={{ width: s.phone ? 74 : 90 }}>
                    {fmtQty(i.qty)} x
                  </Text>
                  <Text size={s.big} weight="semibold" style={{ flex: 1 }}>
                    {i.name}
                  </Text>
                  <Text size={s.big}>{brl(i.total)}</Text>
                </View>
              ))
            ) : (
              <State empty="O Kyte não mandou os itens desta venda." />
            ))}
          {tab === 'detalhes' && (
            <View style={{ paddingVertical: 12, gap: 16 }}>
              <Pair label="Data" value={dateTime(sale.date)} />
              <Pair label="Número" value={sale.number ? `#${sale.number}` : '—'} />
              <Pair label="Pagamento" value={sale.payment || '—'} />
              <Pair label="Vendedor" value={sale.seller || '—'} />
              <Pair label="Situação" value={canceled ? 'Cancelada' : 'Concluída'} />
            </View>
          )}
          {tab === 'cliente' && (
            <View style={{ paddingVertical: 12, gap: 16 }}>
              <Pair label="Cliente" value={sale.customer?.name || 'Venda sem cliente'} />
              {sale.customer?.phone ? <Pair label="Celular" value={sale.customer.phone} /> : null}
              {sale.customer?.district ? (
                <Pair label="Bairro" value={sale.customer.district} />
              ) : null}
              {sale.customer?.phone ? (
                <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 8 }}>
                  <SmallButton
                    label="WhatsApp"
                    icon="logo-whatsapp"
                    onPress={() => openWhatsApp(sale.customer?.phone ?? '')}
                  />
                  <SmallButton
                    label="Ligar"
                    icon="call"
                    onPress={() => callPhone(sale.customer?.phone ?? '')}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>
        {msg && (
          <Text size={s.sub} color={KY.sub}>
            {msg}
          </Text>
        )}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          gap: 16,
          paddingHorizontal: s.pad,
          paddingTop: 8,
          paddingBottom: (s.phone ? tabSpace : 0) + 18,
        }}
      >
        <Touchable
          onPress={() => nav.open({ type: 'receipt', id: sale.id })}
          accessibilityLabel="Ver recibo"
          style={{
            width: s.phone ? 110 : 150,
            height: s.phone ? 96 : 110,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: '#C8CFD8',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: KY.card,
          }}
        >
          <KIcon name="receipt-outline" size={s.icon + 16} />
        </Touchable>
        <Touchable
          onPress={() => !canceled && setConfirm(true)}
          style={{
            flex: 1,
            height: s.phone ? 96 : 110,
            borderRadius: 18,
            backgroundColor: canceled ? '#9AA3AF' : KY.night,
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KIcon name="close-circle-outline" size={s.icon + 14} color="#FFFFFF" />
          <Text size={s.big} weight="semibold" color="#FFFFFF">
            {canceled ? 'Venda cancelada' : 'Cancelar venda'}
          </Text>
        </Touchable>
      </View>
      {confirm && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,.45)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 30,
          }}
        >
          <View
            style={{
              backgroundColor: KY.card,
              borderRadius: 24,
              padding: 34,
              gap: 20,
              maxWidth: 760,
              width: '100%',
            }}
          >
            <Text size={s.big} weight="bold">
              Cancelar a venda #{sale.number}?
            </Text>
            <Text size={s.body} color={KY.sub}>
              {brl(sale.total)}
              {sale.customer?.name ? ` de ${sale.customer.name}` : ''}. Isso cancela a venda no
              próprio Kyte.
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'flex-end' }}>
              {working ? (
                <Spinner size={36} color={KY.red} />
              ) : (
                <>
                  <SmallButton label="Voltar" onPress={() => setConfirm(false)} />
                  <SmallButton
                    label="Cancelar venda"
                    tone="danger"
                    icon="close-circle"
                    onPress={cancel}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  const s = useKySize();
  return (
    <View style={{ flexDirection: 'row', gap: 20 }}>
      <Text size={s.row} color={KY.sub} style={{ width: s.phone ? 170 : 220 }}>
        {label}
      </Text>
      <Text size={s.row} weight="medium" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

/* ------------------------------- Recibo ------------------------------- */

const esc = (t: string) =>
  t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);

function receiptText(v: KyteSale, store: KyteStoreInfo | null) {
  const lines = [
    store?.name?.toUpperCase(),
    store?.header,
    '',
    `RECIBO #${v.number}`,
    dateTime(v.date),
    v.customer?.name ? `Cliente: ${v.customer.name}` : '',
    '',
    ...v.items.map((i) => `${fmtQty(i.qty)}x ${i.name} — ${brl(i.total)}`),
    '',
    `Total: ${brl(v.total)}`,
    v.payment ? `${v.payment}: ${brl(v.total)}` : '',
    '',
    store?.footer,
  ];
  return lines
    .filter((l) => l !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function receiptHtml(v: KyteSale, store: KyteStoreInfo | null) {
  const items = v.items
    .map(
      (i) =>
        `<tr><td>${fmtQty(i.qty)}x</td><td><b>${esc(i.name)}</b>${i.unitPrice != null && i.qty !== 1 ? `<br><small>${brl(i.unitPrice)}</small>` : ''}</td><td class="r">${brl(i.total)}</td></tr>`,
    )
    .join('');
  return `<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#363F4D;padding:28px;max-width:640px;margin:auto}
h1{font-size:26px;text-align:right;margin:0}h2{font-size:18px;margin:18px 0 4px}
table{width:100%;border-collapse:collapse;margin-top:12px;border-top:3px solid #363F4D}
td{padding:10px 4px;border-bottom:1px solid #ddd;vertical-align:top}.r{text-align:right;white-space:nowrap}
small{color:#888}.tot{text-align:right;font-size:22px;font-weight:700;margin-top:16px}.foot{text-align:center;margin-top:26px;white-space:pre-line;font-weight:600}
</style></head><body>
${store?.logo ? `<img src="${store.logo}" style="height:70px">` : ''}
<h1>RECIBO #${esc(v.number)}</h1>
<h2>${esc(store?.name?.toUpperCase() ?? '')}</h2><div>${esc(store?.header ?? '')}</div>
<h2>${esc(v.customer?.name ?? '')}</h2><div>${esc([v.customer?.phone, v.customer?.district].filter(Boolean).join(' • '))}</div>
<p><b>${v.items.length} ${v.items.length === 1 ? 'item' : 'itens'} (Qtd.: ${fmtQty(v.items.reduce((a, i) => a + i.qty, 0))})</b></p>
<table>${items}</table>
<div class="tot">Total: ${brl(v.total)}</div>
<div style="text-align:right">${esc(v.payment || '')}${v.payment ? `: ${brl(v.total)}` : ''}</div>
<div class="foot">${esc(store?.footer ?? '')}</div>
<div class="foot" style="font-weight:400;color:#888">${esc(dateTime(v.date))}</div>
</body></html>`;
}

/** Recibo (prints 10 e 11), com PDF, e-mail, imprimir e compartilhar. */
export function Receipt({ id }: { id: string }) {
  const s = useKySize();
  const nav = useKyteNav();
  const { sale: v } = useSale(id);
  const store = useKyteStore();
  const tabSpace = useTabBarSpace();
  const [msg, setMsg] = useState<string | null>(null);
  if (!v)
    return (
      <View style={{ flex: 1, backgroundColor: KY.bg }}>
        <Header title="Recibo" onBack={nav.back} />
        <State empty="Venda não encontrada." />
      </View>
    );
  const qty = v.items.reduce((a, i) => a + i.qty, 0);
  const html = () => receiptHtml(v, store);
  const fail = (e: unknown) => setMsg(e instanceof Error ? e.message : 'Não foi possível agora.');

  const actions: { icon: IconName; label: string; run: () => void }[] = [
    {
      icon: 'document-text-outline',
      label: 'PDF',
      run: () => {
        if (Platform.OS === 'web') return void Print.printAsync({ html: html() }).catch(fail);
        Print.printToFileAsync({ html: html() })
          .then(({ uri }) =>
            Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: `Recibo #${v.number}`,
            }),
          )
          .catch(fail);
      },
    },
    {
      icon: 'send-outline',
      label: 'Email',
      run: () =>
        Linking.openURL(
          `mailto:?subject=${encodeURIComponent(`Recibo #${v.number}`)}&body=${encodeURIComponent(receiptText(v, store))}`,
        ).catch(fail),
    },
    {
      icon: 'print-outline',
      label: 'Imprimir',
      run: () => Print.printAsync({ html: html() }).catch(fail),
    },
    {
      icon: 'share-social-outline',
      label: 'Compartilhar',
      run: () => Share.share({ message: receiptText(v, store) }).catch(fail),
    },
  ];

  const storeCard = (
    <View
      style={{
        backgroundColor: KY.card,
        borderRadius: 18,
        padding: 26,
        gap: 10,
        alignItems: s.phone ? 'flex-start' : 'center',
      }}
    >
      {store?.logo ? (
        <Image
          source={{ uri: store.logo }}
          style={{ width: 200, height: 120, resizeMode: 'contain' }}
        />
      ) : null}
      {store?.name ? (
        <Text size={s.big} weight="bold" style={{ textAlign: s.phone ? 'left' : 'center' }}>
          {store.name.toUpperCase()}
        </Text>
      ) : null}
      {store?.header ? (
        <Text size={s.small} color={KY.sub} style={{ textAlign: s.phone ? 'left' : 'center' }}>
          {store.header}
        </Text>
      ) : null}
      {v.customer?.name ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
            marginTop: 12,
            alignSelf: 'stretch',
          }}
        >
          <KIcon name="person" size={s.icon} />
          <View style={{ flex: 1 }}>
            <Text size={s.row} weight="bold">
              {v.customer.name}
            </Text>
            {v.customer.phone || v.customer.district ? (
              <Text size={s.small} color={KY.sub}>
                {[v.customer.phone, v.customer.district].filter(Boolean).join(' • ')}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );

  const itemsCard = (
    <View
      style={{
        backgroundColor: KY.card,
        borderRadius: 18,
        padding: 26,
        gap: 8,
        flex: s.phone ? undefined : 1.6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text size={s.title} weight="bold">
          RECIBO #{v.number}
        </Text>
        <View
          style={{
            backgroundColor: '#D6E8FF',
            borderRadius: 999,
            paddingHorizontal: 20,
            paddingVertical: 8,
          }}
        >
          <Text size={s.small} weight="semibold">
            {v.items.length} {v.items.length === 1 ? 'item' : 'itens'} (Qtd.: {fmtQty(qty)})
          </Text>
        </View>
      </View>
      <View style={{ height: 2, backgroundColor: KY.line, marginVertical: 8 }} />
      {v.items.map((i, n) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: itens da venda não têm id
          key={n}
          style={{
            flexDirection: 'row',
            gap: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: KY.line,
          }}
        >
          <Text size={s.row} color={KY.sub} style={{ width: s.phone ? 64 : 80 }}>
            {fmtQty(i.qty)}x
          </Text>
          <View style={{ flex: 1 }}>
            <Text size={s.row} weight="bold">
              {i.name}
            </Text>
            {i.unitPrice != null && i.qty !== 1 ? (
              <Text size={s.sub} color={KY.sub}>
                {brl(i.unitPrice)}
              </Text>
            ) : null}
          </View>
          <Text size={s.row}>{brl(i.total)}</Text>
        </View>
      ))}
      <Text size={s.big} weight="bold" style={{ textAlign: 'right', marginTop: 10 }}>
        Total: {brl(v.total)}
      </Text>
      {v.payment ? (
        <Text size={s.sub} color={KY.sub} style={{ textAlign: 'right' }}>
          {v.payment}: {brl(v.total)}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <View style={{ backgroundColor: KY.night }}>
        <Header title="Recibo" dark onBack={nav.back} />
      </View>
      <ScrollView contentContainerStyle={{ padding: s.pad, gap: 16 }}>
        {s.phone ? (
          <>
            {storeCard}
            {itemsCard}
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>{storeCard}</View>
            {itemsCard}
          </View>
        )}
        {store?.footer ? (
          <View style={{ backgroundColor: KY.card, borderRadius: 18, padding: 22 }}>
            <Text size={s.sub} weight="semibold" style={{ textAlign: 'center' }}>
              {store.footer}
            </Text>
          </View>
        ) : null}
        {msg && (
          <Text size={s.sub} color={KY.red}>
            {msg}
          </Text>
        )}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          padding: 12,
          paddingBottom: (s.phone ? tabSpace : 0) + 12,
          backgroundColor: KY.navy,
        }}
      >
        {actions.map((a) => (
          <Touchable
            key={a.label}
            onPress={a.run}
            style={{
              flex: 1,
              height: s.phone ? 108 : 96,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,.08)',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: s.phone ? 'column' : 'row',
              gap: s.phone ? 6 : 16,
            }}
          >
            <KIcon name={a.icon} size={s.icon + 6} color="#FFFFFF" />
            <Text size={s.sub} weight="semibold" color="#FFFFFF">
              {a.label}
            </Text>
          </Touchable>
        ))}
      </View>
    </View>
  );
}
