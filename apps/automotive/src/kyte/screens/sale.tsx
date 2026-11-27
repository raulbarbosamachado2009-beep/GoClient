import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { callPhone, openWhatsApp } from '../../integrations/contact';
import { useTabBarSpace } from '../../layout/form-factor';
import { Swap } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import { Spinner } from '../../ui/spinner';
import { kyteAgent } from '../agent';
import { brl, fmtQty } from '../model';
import { ReceiptScreen } from '../sell/receipt';
import { saleToReceipt } from '../sell/receipt-data';
import { PREVIEW, patchSale, useKyteList, useKyteStore } from '../store';
import { Header, KIcon, KY, SmallButton, State, Tabs, Text, useKySize } from '../ui';
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
          <Swap id={tab} index={['itens', 'detalhes', 'cliente'].indexOf(tab)}>
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
          </Swap>
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
            width: s.phone ? 110 : 170,
            height: s.phone ? 96 : 128,
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
            height: s.phone ? 96 : 128,
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

/** Recibo de uma venda do Histórico: o mesmo recibo da venda nova (imprime pela impressora). */
export function Receipt({ id }: { id: string }) {
  const nav = useKyteNav();
  const { sale: v } = useSale(id);
  const store = useKyteStore();
  if (!v)
    return (
      <View style={{ flex: 1, backgroundColor: KY.bg }}>
        <Header title="Recibo" onBack={nav.back} />
        <State empty="Venda não encontrada." />
      </View>
    );
  return <ReceiptScreen data={saleToReceipt(v, store)} onClose={nav.back} />;
}
