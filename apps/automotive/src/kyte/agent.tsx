import { type ComponentRef, useMemo, useRef } from 'react';
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
let ready = false;
let logged = false;
const pending = new Map<number, Pending>();
let seq = 0;
// Uma ação por vez: a janela é uma só.
let queue: Promise<unknown> = Promise.resolve();

export const kyteAgentAvailable = () => Platform.OS === 'android' && send !== null;
export const kyteLogged = () => logged;

function run<T>(body: string, timeout = 25000): Promise<T> {
  const task = async (): Promise<T> => {
    if (!send) throw new Error('O Kyte só funciona no app instalado.');
    const started = Date.now();
    while (!ready && Date.now() - started < 15000) await new Promise((r) => setTimeout(r, 300));
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

/** Monta a janela invisível (uma vez, no layout principal do app). */
export function KyteAgentHost() {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  // Sem tema e no tamanho de computador: é a página "crua" do Kyte, ninguém a vê.
  const script = useMemo(() => kyteScript({ dark: false, phone: false, agent: true }), []);
  if (Platform.OS !== 'android') return null;
  send = (js) => web.current?.injectJavaScript(js);
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
            if (m.type === 'route') logged = !!m.logged;
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
  send?.('location.reload(); true;');
}

const styles = StyleSheet.create({
  // Fora da tela, com tamanho de computador (o Kyte Web precisa de largura para o menu).
  hidden: { position: 'absolute', left: -4000, top: 0, width: 1280, height: 860, opacity: 0 },
  web: { flex: 1 },
});
