import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Switch, View } from 'react-native';
import type { PairedDevice } from '../../../modules/bt-printer';
import { useSystemInsets, useTabBarSpace } from '../../layout/form-factor';
import { Swap } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import { Spinner } from '../../ui/spinner';
import { dateText, type ReceiptData, receiptPlainText } from '../print/escpos';
import { receiptHtml } from '../print/html';
import {
  bluetoothPrinting,
  pairedPrinters,
  printReceipt,
  printTest,
  setPrinter,
  usePrinter,
} from '../print/printer';
import { Header, type IconName, KIcon, KY, Text, useKySize } from '../ui';
import { KyteButton, OptionLine } from './parts';
import { ReceiptShare } from './receipt-share';

const money = (c: number | null) =>
  c == null
    ? '—'
    : `R$ ${(c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qtyText = (q: number) =>
  Number.isInteger(q) ? String(q) : q.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

/**
 * Recibo (vídeo do usuário): faixa "Configurar recibos" em cima, "×" para fechar, o recibo
 * como papel e a barra escura com PDF, Email, Imprimir e Compartilhar. "Imprimir" manda a
 * comanda direto para a impressora Bluetooth escolhida em "Configurar recibos".
 */
export function ReceiptScreen({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const [settings, setSettings] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(false);
  return (
    <Swap id={settings ? 'settings' : 'receipt'} dir={settings ? 1 : -1} style={{ flex: 1 }}>
      {settings ? (
        <PrinterSettings
          onBack={() => setSettings(false)}
          printAfterChoose={pendingPrint ? data : null}
          onChosen={() => setPendingPrint(false)}
        />
      ) : (
        <ReceiptView
          data={data}
          onClose={onClose}
          onSettings={(print) => {
            setPendingPrint(print);
            setSettings(true);
          }}
        />
      )}
    </Swap>
  );
}

function ReceiptView({
  data: r,
  onClose,
  onSettings,
}: {
  data: ReceiptData;
  onClose: () => void;
  onSettings: (printAfter: boolean) => void;
}) {
  const s = useKySize();
  const tab = useTabBarSpace();
  const top = useSystemInsets().top;
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [share, setShare] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const fail = (e: unknown) =>
    setMsg({ text: e instanceof Error ? e.message : 'Não foi possível agora.', ok: false });
  const qty = r.lines.reduce((a, l) => a + l.qty, 0);
  const f = s.phone ? 1.5 : 1.45;

  const actions: { icon: IconName; label: string; run: () => void }[] = [
    {
      icon: 'document-outline',
      label: 'PDF',
      run: () => {
        const html = receiptHtml(r);
        if (Platform.OS === 'web') return void Print.printAsync({ html }).catch(fail);
        Print.printToFileAsync({ html })
          .then(({ uri }) =>
            Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: `Recibo #${r.number}`,
            }),
          )
          .catch(fail);
      },
    },
    {
      icon: 'paper-plane-outline',
      label: 'Email',
      run: () =>
        Linking.openURL(
          `mailto:?subject=${encodeURIComponent(`Recibo #${r.number}`)}&body=${encodeURIComponent(receiptPlainText(r))}`,
        ).catch(fail),
    },
    {
      icon: 'print-outline',
      label: 'Imprimir',
      run: () => {
        setMsg(null);
        setPrinting(true);
        printReceipt(r)
          .then((how) => {
            if (how === 'choose') onSettings(true);
            else if (how === 'printed')
              setMsg({ text: 'Comanda enviada para a impressora.', ok: true });
          })
          .catch(fail)
          .finally(() => setPrinting(false));
      },
    },
    {
      icon: 'share-social-outline',
      label: 'Compartilhar',
      // Abre o "Enviar para" do WhatsApp (pedido de 27/11/2026), subindo de baixo.
      run: () => setShare(true),
    },
  ];

  const small = 15 * f;
  const body = 17 * f;

  return (
    <View style={{ flex: 1, backgroundColor: KY.card }}>
      <Touchable
        scaleTo={0.99}
        onPress={() => onSettings(false)}
        style={{
          backgroundColor: '#E7EAEE',
          paddingTop: s.phone ? top : 0,
          height: (s.phone ? 72 : 88) + (s.phone ? top : 0),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <KIcon name="pencil-outline" size={s.sub + 2} />
        <Text size={s.sub} weight="medium">
          Configurar recibos
        </Text>
      </Touchable>
      <View
        style={{
          height: s.phone ? 90 : 104,
          justifyContent: 'center',
          paddingHorizontal: s.pad - 6,
        }}
      >
        <Touchable
          onPress={onClose}
          accessibilityLabel="Fechar recibo"
          style={{
            width: s.phone ? 72 : 96,
            height: s.phone ? 72 : 96,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KIcon name="close" size={s.icon + 8} />
        </Touchable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View
          style={{
            width: '100%',
            maxWidth: s.phone ? undefined : 1000,
            alignSelf: 'center',
            paddingHorizontal: s.pad,
          }}
        >
          <Text size={26 * f} weight="bold" style={{ textAlign: 'right', marginBottom: 14 }}>
            RECIBO #{r.number}
          </Text>
          {r.store ? (
            <View style={{ gap: 2, marginBottom: 14 }}>
              <Text size={body} weight="bold">
                {r.store.name.toUpperCase()}
              </Text>
              {r.store.header ? (
                <Text size={small} color={KY.sub}>
                  {r.store.header}
                </Text>
              ) : null}
            </View>
          ) : null}
          {r.customer?.name ? (
            <View
              style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}
            >
              <KIcon name="person" size={body} />
              <View style={{ flex: 1 }}>
                <Text size={body} weight="bold">
                  {r.customer.name}
                </Text>
                {r.customer.district || r.customer.phone ? (
                  <Text size={small} color={KY.sub}>
                    {[r.customer.phone, r.customer.district].filter(Boolean).join(' • ')}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
          {r.note.trim() ? (
            <View
              style={{
                borderWidth: 2,
                borderColor: KY.navy,
                borderRadius: 12 * f,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 18,
              }}
            >
              <Text size={small} weight="semibold">
                {r.note.trim()}
              </Text>
            </View>
          ) : null}
          <Text size={body} weight="bold" style={{ marginBottom: 10 }}>
            {r.lines.length} {r.lines.length === 1 ? 'item' : 'itens'} (Qtd.: {qtyText(qty)})
          </Text>
          <View style={{ height: 3, backgroundColor: KY.navy }} />
          {r.lines.map((l, i) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: linhas do recibo não têm id
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12 * f,
                borderBottomWidth: 1,
                borderBottomColor: KY.line,
              }}
            >
              <Text size={small} color={KY.sub} style={{ width: 34 * f }}>
                {qtyText(l.qty)}x
              </Text>
              <View style={{ flex: 1 }}>
                <Text size={body} weight="semibold">
                  {l.name}
                </Text>
                {l.qty !== 1 && l.unitCents != null ? (
                  <Text size={small} color={KY.faint}>
                    {money(l.unitCents)}
                  </Text>
                ) : null}
              </View>
              <Text size={body}>{money(l.totalCents)}</Text>
            </View>
          ))}
          <View style={{ alignItems: 'flex-end', gap: 4, paddingVertical: 16 }}>
            {r.discountCents > 0 ? (
              <Text size={small} color={KY.sub}>
                Desconto: − {money(r.discountCents)}
              </Text>
            ) : null}
            <Text size={22 * f} weight="bold">
              Total: {money(r.totalCents)}
            </Text>
            {r.payment ? (
              <Text size={small} color={KY.sub}>
                {r.payment}: {money(r.receivedCents ?? r.totalCents)}
              </Text>
            ) : null}
            {r.changeCents ? (
              <Text size={small} color={KY.sub}>
                Troco: {money(r.changeCents)}
              </Text>
            ) : null}
          </View>
          <View style={{ height: 3, backgroundColor: KY.navy }} />
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: 18 }}>
            {r.store?.footer ? (
              <Text size={body} weight="bold" style={{ textAlign: 'center' }}>
                {r.store.footer}
              </Text>
            ) : null}
            <Text size={small} color={KY.sub}>
              {dateText(r.date)}
            </Text>
          </View>
          {msg ? (
            <Text
              size={s.sub}
              color={msg.ok ? KY.greenInk : KY.red}
              style={{ textAlign: 'center' }}
            >
              {msg.text}
            </Text>
          ) : null}
        </View>
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: KY.navy,
          paddingBottom: s.phone ? tab : 0,
        }}
      >
        {actions.map((a) => (
          <Touchable
            key={a.label}
            onPress={a.run}
            scaleTo={0.94}
            style={{
              flex: 1,
              height: s.phone ? 130 : 140,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderLeftWidth: 1,
              borderLeftColor: 'rgba(255,255,255,.08)',
            }}
          >
            {a.label === 'Imprimir' && printing ? (
              <Spinner size={s.icon} color="#FFFFFF" />
            ) : (
              <KIcon name={a.icon} size={s.icon + 4} color="#FFFFFF" />
            )}
            <Text size={s.sub} weight="semibold" color="#FFFFFF">
              {a.label}
            </Text>
          </Touchable>
        ))}
      </View>
      {toast ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: (s.phone ? 130 + tab : 140) + 20,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: KY.navy,
              borderRadius: 999,
              paddingHorizontal: 28,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <KIcon name="checkmark-circle" size={s.sub + 4} color="#25D366" />
            <Text size={s.sub} weight="semibold" color="#FFFFFF">
              {toast}
            </Text>
          </View>
        </View>
      ) : null}
      {share ? (
        <ReceiptShare
          data={r}
          onClose={() => setShare(false)}
          onSent={setToast}
          onFail={fail}
          router={router}
        />
      ) : null}
    </View>
  );
}

/**
 * "Configurar recibos": a impressora Bluetooth da comanda. Pareia-se a impressora uma vez no
 * Bluetooth da multimídia; aqui ela é escolhida (fica salva) e testada.
 */
function PrinterSettings({
  onBack,
  printAfterChoose,
  onChosen,
}: {
  onBack: () => void;
  /** Veio do "Imprimir" sem impressora: depois de escolher, já imprime. */
  printAfterChoose: ReceiptData | null;
  onChosen: () => void;
}) {
  const s = useKySize();
  const tab = useTabBarSpace();
  const printer = usePrinter();
  const [devices, setDevices] = useState<PairedDevice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const native = bluetoothPrinting();
  const fail = (e: unknown) =>
    setMsg({ text: e instanceof Error ? e.message : 'Não foi possível agora.', ok: false });

  const search = () => {
    setMsg(null);
    setBusy(true);
    pairedPrinters()
      .then((d) => {
        setDevices(d);
        if (!d.length)
          setMsg({
            text: 'Nenhum aparelho pareado. Pareie a impressora no Bluetooth da multimídia e toque em procurar de novo.',
            ok: false,
          });
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };

  const choose = (d: PairedDevice) => {
    const p = {
      address: d.address,
      name: d.name,
      paper: printer?.paper ?? 58,
      accents: printer?.accents ?? true,
    } as const;
    setPrinter(p);
    setDevices(null);
    if (printAfterChoose) {
      setBusy(true);
      printReceipt(printAfterChoose)
        .then(() => {
          setMsg({ text: `Comanda enviada para ${d.name}.`, ok: true });
          onChosen();
        })
        .catch(fail)
        .finally(() => setBusy(false));
    } else setMsg({ text: `${d.name} escolhida. O "Imprimir" já manda para ela.`, ok: true });
  };

  const seg = (v: 58 | 80) => {
    const on = (printer?.paper ?? 58) === v;
    return (
      <Touchable
        key={v}
        onPress={() => printer && setPrinter({ ...printer, paper: v })}
        style={{
          flex: 1,
          height: s.phone ? 72 : 88,
          borderRadius: s.phone ? 13 : 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? KY.card : 'transparent',
        }}
      >
        <Text size={s.sub} weight={on ? 'semibold' : 'regular'}>
          {v} mm
        </Text>
      </Touchable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: KY.card }}>
      <Header title="Configurar recibos" onBack={onBack} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: s.pad,
          paddingBottom: (s.phone ? tab : 0) + 30,
          gap: 18,
          width: '100%',
          maxWidth: s.phone ? undefined : 1000,
          alignSelf: 'center',
        }}
      >
        <Text size={s.big} weight="bold">
          Impressora Bluetooth
        </Text>
        <Text size={s.sub} color={KY.sub}>
          {native
            ? 'Ligue o Bluetooth da multimídia e pareie a impressora uma vez (Configurações → Bluetooth). Depois escolha ela aqui: o Imprimir manda a comanda direto para ela.'
            : 'No Preview a impressão abre a do navegador. No app instalado na multimídia, a impressora Bluetooth pareada aparece aqui.'}
        </Text>
        {printer ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              backgroundColor: '#E6FAF4',
              borderRadius: s.phone ? 20 : 26,
              padding: s.phone ? 20 : 24,
            }}
          >
            <KIcon name="print" size={s.icon + 6} color={KY.greenInk} />
            <View style={{ flex: 1 }}>
              <Text size={s.row} weight="semibold">
                {printer.name}
              </Text>
              <Text size={s.small} color={KY.sub}>
                {printer.address}
              </Text>
            </View>
            <Touchable onPress={() => setPrinter(null)} accessibilityLabel="Esquecer impressora">
              <KIcon name="close-circle" size={s.icon} color={KY.faint} />
            </Touchable>
          </View>
        ) : null}
        {native ? (
          <KyteButton
            label={printer ? 'Trocar impressora' : 'Procurar impressoras pareadas'}
            icon="bluetooth"
            outline={!!printer}
            onPress={search}
          />
        ) : null}
        {busy ? <Spinner color={KY.green} /> : null}
        {devices?.length ? (
          <View>
            {devices.map((d) => (
              <OptionLine
                key={d.address}
                label={`${d.name}${d.printer ? '  · impressora' : ''}`}
                onPress={() => choose(d)}
              />
            ))}
          </View>
        ) : null}
        {printer ? (
          <>
            <Text size={s.row} weight="semibold" style={{ marginTop: 8 }}>
              Largura do papel
            </Text>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#E9ECF0',
                borderRadius: s.phone ? 18 : 24,
                padding: 4,
                gap: 4,
              }}
            >
              {seg(58)}
              {seg(80)}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text size={s.row} weight="semibold">
                  Acentos
                </Text>
                <Text size={s.small} color={KY.sub}>
                  Desligue se a impressora trocar ã, ç e é por símbolos.
                </Text>
              </View>
              <Switch
                value={printer.accents}
                onValueChange={(v) => setPrinter({ ...printer, accents: v })}
                trackColor={{ true: KY.green, false: KY.line }}
              />
            </View>
            <KyteButton
              label="Imprimir teste"
              icon="print-outline"
              outline
              onPress={() => {
                setMsg(null);
                setBusy(true);
                printTest(printer)
                  .then(() => setMsg({ text: 'Teste enviado para a impressora.', ok: true }))
                  .catch(fail)
                  .finally(() => setBusy(false));
              }}
            />
          </>
        ) : null}
        {msg ? (
          <Text size={s.sub} color={msg.ok ? KY.greenInk : KY.red}>
            {msg.text}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
