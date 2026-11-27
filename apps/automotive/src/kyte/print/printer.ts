import * as Print from 'expo-print';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { BtPrinter, type PairedDevice } from '../../../modules/bt-printer';
import { type ReceiptData, receiptBytes, toBase64 } from './escpos';
import { receiptHtml } from './html';
import { allowBluetooth as allow } from './permission';

/**
 * Impressora da comanda. Igual ao Kyte no celular: a impressora térmica é pareada no
 * Bluetooth do Android (multimídia) e escolhida uma vez em "Configurar recibos"; depois,
 * "Imprimir" manda a comanda direto para ela, sem perguntar nada.
 */
export interface PrinterSettings {
  address: string;
  name: string;
  /** 58 mm (32 colunas) ou 80 mm (48 colunas). */
  paper: 58 | 80;
  accents: boolean;
}

const KEY = 'kyte.printer';
let settings: PrinterSettings | null = null;
const listeners = new Set<() => void>();

if (Platform.OS !== 'web')
  SecureStore.getItemAsync(KEY)
    .then((v) => {
      if (v) setPrinter(JSON.parse(v) as PrinterSettings, false);
    })
    .catch(() => {});

export function setPrinter(p: PrinterSettings | null, save = true) {
  settings = p;
  if (save && Platform.OS !== 'web') {
    if (p) SecureStore.setItemAsync(KEY, JSON.stringify(p)).catch(() => {});
    else SecureStore.deleteItemAsync(KEY).catch(() => {});
  }
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const usePrinter = () => useSyncExternalStore(subscribe, () => settings);
export const getPrinter = () => settings;

/** O app instalado tem o módulo de Bluetooth? (No Preview, não.) */
export const bluetoothPrinting = () => Platform.OS === 'android' && !!BtPrinter;

/** Aparelhos pareados, com as impressoras primeiro. */
export async function pairedPrinters(): Promise<PairedDevice[]> {
  if (!BtPrinter)
    throw new Error('A impressora Bluetooth funciona no app instalado na multimídia.');
  await allow();
  const list = await BtPrinter.pairedDevices();
  return [...list].sort((a, b) => Number(b.printer) - Number(a.printer));
}

/** Imprime uma linha de teste na impressora escolhida. */
export async function printTest(p: PrinterSettings) {
  await send(p, {
    number: 'TESTE',
    date: Date.now(),
    store: { name: 'GoClient', header: 'Impressora conectada', footer: 'Tudo certo!' },
    customer: null,
    note: 'Acentuação: ação, café, você, pão',
    lines: [{ qty: 1, name: 'Teste de impressão', unitCents: 0, totalCents: 0 }],
    discountCents: 0,
    totalCents: 0,
    payment: '',
  });
}

async function send(p: PrinterSettings, r: ReceiptData) {
  if (!BtPrinter)
    throw new Error('A impressora Bluetooth funciona no app instalado na multimídia.');
  await allow();
  const bytes = receiptBytes(r, { columns: p.paper === 80 ? 48 : 32, accents: p.accents });
  await BtPrinter.print(p.address, toBase64(bytes));
}

/**
 * "Imprimir": com impressora escolhida, vai direto para ela (Bluetooth). Sem impressora,
 * devolve 'choose' para a tela abrir "Configurar recibos". No Preview (navegador), abre a
 * impressão do navegador com o mesmo recibo.
 */
export async function printReceipt(r: ReceiptData): Promise<'printed' | 'choose' | 'browser'> {
  if (!bluetoothPrinting()) {
    await Print.printAsync({ html: receiptHtml(r) });
    return 'browser';
  }
  const p = settings;
  if (!p) return 'choose';
  await send(p, r);
  return 'printed';
}
