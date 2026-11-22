import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { AGENT_HELPERS, JOBS } from './agent-page';
import { KYTE_HOME, kyteScript } from './bridge';
import { DESKTOP_USER_AGENT } from './config';

/**
 * Janela **invisível** do Kyte, só da Havena: ela abre telas, busca clientes e lê endereços
 * por trás, sem trocar a tela da pessoa (que continua no Mapa, por exemplo). Usa o mesmo
 * login do Kyte (os cookies do aparelho são compartilhados entre as janelas).
 *
 * Para não pesar o aparelho, ela só existe enquanto a Havena precisa: abre no primeiro pedido
 * e fecha sozinha depois de {@link IDLE_MS} sem uso.
 *
 * Só no app Android. No Preview (web) o Kyte não abre dentro de outra página; ali a Havena
 * usa os clientes de exemplo.
 */

export interface KyteClient {
  name: string;
  phone: string;
  address: string;
}

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let send: ((js: string) => void) | null = null;
/** O layout montou o host (a janela em si só abre quando há pedido). */
let hosted = false;
let setOpen: ((open: boolean) => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_MS = 90_000;

function wake() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  setOpen?.(true);
}

function sleepLater() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (pending.size === 0) setOpen?.(false);
  }, IDLE_MS);
}
let ready = false;
let logged = false;
/** Recebeu da janela invisível se está logada (desde que ela abriu). */
let routeSeen = false;
const LOGGED_KEY = 'kyte.logged';
// Lembra entre aberturas do app se a pessoa entrou no Kyte (a janela invisível só abre
// quando a Havena precisa, então não dá para perguntar a ela antes).
let remembered = false;
if (Platform.OS === 'android') {
  SecureStore.getItemAsync(LOGGED_KEY)
    .then((v) => {
      remembered = v === '1';
    })
    .catch(() => {});
}

/** A aba Kyte avisa quando a pessoa entra ou sai da conta. */
export function noteKyteLogged(v: boolean) {
  if (v === remembered) return;
  remembered = v;
  SecureStore.setItemAsync(LOGGED_KEY, v ? '1' : '0').catch(() => {});
}
const pending = new Map<number, Pending>();
let seq = 0;
// Uma ação por vez: a janela é uma só.
let queue: Promise<unknown> = Promise.resolve();

export const kyteAgentAvailable = () => Platform.OS === 'android' && hosted;
export const kyteLogged = () => logged || remembered;

function run<T>(body: string, timeout = 25000): Promise<T> {
  const task = async (): Promise<T> => {
    if (!hosted) throw new Error('O Kyte só funciona no app instalado.');
    wake();
    const started = Date.now();
    while ((!ready || !send || !routeSeen) && Date.now() - started < 20000)
      await new Promise((r) => setTimeout(r, 300));
    if (!logged) throw new Error('Entre no Kyte primeiro (aba Kyte).');
    const id = ++seq;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('O Kyte demorou demais para responder.'));
      }, timeout);
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      send?.(`${AGENT_HELPERS}
window.__gcA.job(${id}, async function(){ var A = window.__gcA; ${body} }); true;`);
    });
  };
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  next.finally(sleepLater).catch(() => {});
  return next;
}

/** Ações da Havena no Kyte (cada uma devolve dados simples ou lança um erro claro). */
export const kyteAgent = {
  findClient: (name: string) =>
    run<{ matches?: string[]; client?: KyteClient }>(JOBS.findClient(name)),
  openClient: (name: string) => run<{ client: KyteClient | null }>(JOBS.openClient(name)),
  listClients: (query = '') => run<{ names: string[] }>(JOBS.listClients(query)),
  salesSummary: () =>
    run<{
      today: { count: number; total: string } | null;
      yesterday: { count: number; total: string } | null;
      week: { count: number; total: string } | null;
      month: { count: number; total: string } | null;
    }>(JOBS.salesSummary()),
  createClient: (c: { name: string; phone?: string; address?: string }) =>
    run<{ saved: boolean }>(JOBS.createClient(c), 30000),
  createProduct: (p: { name: string; price: string }) =>
    run<{ saved: boolean }>(JOBS.createProduct(p), 30000),
  logout: () => run<{ ok: boolean }>(JOBS.logout()),
};

/** Monta o lugar da janela invisível (uma vez, no layout principal do app). */
export function KyteAgentHost() {
  const [open, setOpenState] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    hosted = true;
    setOpen = setOpenState;
    return () => {
      hosted = false;
      setOpen = null;
    };
  }, []);
  if (Platform.OS !== 'android' || !open) return null;
  return <AgentWindow />;
}

function AgentWindow() {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  // Sem tema e no tamanho de computador: é a página "crua" do Kyte, ninguém a vê.
  const script = useMemo(() => kyteScript({ dark: false, phone: false, agent: true }), []);
  useEffect(() => {
    send = (js) => web.current?.injectJavaScript(js);
    return () => {
      send = null;
      ready = false;
      routeSeen = false;
    };
  }, []);
  return (
    <View pointerEvents="none" style={styles.hidden}>
      <WebView
        ref={web}
        source={{ uri: KYTE_HOME }}
        userAgent={DESKTOP_USER_AGENT}
        domStorageEnabled
        javaScriptEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        injectedJavaScript={script}
        onLoadEnd={() => {
          ready = true;
        }}
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data) as {
              type: string;
              id?: number;
              ok?: boolean;
              data?: unknown;
              error?: string;
              logged?: boolean;
            };
            if (m.type === 'route') {
              logged = !!m.logged;
              routeSeen = true;
              noteKyteLogged(logged);
            }
            if (m.type === 'job' && m.id != null) {
              const p = pending.get(m.id);
              if (!p) return;
              clearTimeout(p.timer);
              pending.delete(m.id);
              if (m.ok) p.resolve(m.data);
              else p.reject(new Error(m.error ?? 'Falha no Kyte'));
            }
          } catch {
            // Mensagem que não é do GoClient.
          }
        }}
        style={styles.web}
      />
    </View>
  );
}

/** Recarrega a janela invisível (ex.: depois de entrar ou sair do Kyte). */
export function reloadKyteAgent() {
  logged = false;
  ready = false;
  routeSeen = false;
  send?.('location.reload(); true;');
}

const styles = StyleSheet.create({
  // Fora da tela, com tamanho de computador (o Kyte Web precisa de largura para o menu).
  hidden: { position: 'absolute', left: -4000, top: 0, width: 1280, height: 860, opacity: 0 },
  web: { flex: 1 },
});
