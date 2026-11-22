import { useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { HavenaPanel } from '../../havena/panel';
import { kyteLogged, noteKyteLogged, reloadKyteAgent } from '../../kyte/agent';
import { AGENT_HELPERS, JOBS } from '../../kyte/agent-page';
import type { KyteMessage } from '../../kyte/bridge';
import { KyteConnect } from '../../kyte/connect';
import { ClientDetail, ClientsScreen } from '../../kyte/screens/clients';
import { DiagnosticScreen } from '../../kyte/screens/diagnostic';
import { HistoryScreen } from '../../kyte/screens/history';
import { HomeScreen } from '../../kyte/screens/home';
import {
  type Detail,
  type KyteNav,
  KyteNavContext,
  SECTIONS,
  type Section,
  useKyteNav as useContextNav,
} from '../../kyte/screens/nav';
import { ProductDetail, ProductsScreen } from '../../kyte/screens/products';
import { Receipt, SaleDetail } from '../../kyte/screens/sale';
import { type SellPlan, SellScreen } from '../../kyte/screens/sell';
import { Header, type IconName, KIcon, KY, Text, useKySize } from '../../kyte/ui';
import { KyteWindow, type KyteWindowHandle } from '../../kyte/window';
import { usePhone } from '../../layout/form-factor';
import { usePrototype } from '../../prototype/state';
import { Appear } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';

/**
 * Kyte no GoClient: telas próprias (Início, Produtos, Clientes, Histórico, venda e recibo)
 * com os dados lidos do Kyte por trás (kyte/store.ts). A página real do Kyte aparece só para
 * entrar na conta e para Vender (registrar venda), como combinado.
 * `?secao=clientes` (ou outra) abre direto numa seção; `?secao=diagnostico` abre o diagnóstico.
 */
export default function KyteScreen() {
  const phone = usePhone();
  const { secao } = useLocalSearchParams<{ secao?: string }>();
  const { kyteOpen, setKyteOpen, setOverlay } = usePrototype();
  const [section, setSection] = useState<Section>('inicio');
  const [stack, setStack] = useState<Detail[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  // Android: sabe se há login no Kyte (lembrado); se não houver, mostra a página de login.
  const [logged, setLogged] = useState(() => Platform.OS === 'web' || kyteLogged());
  const win = useRef<KyteWindowHandle>(null);
  // Venda montada no GoClient, esperando para ir ao carrinho do Kyte (página real).
  const [sell, setSell] = useState<SellPlan | null>(null);
  const [sellMsg, setSellMsg] = useState<string | null>(null);
  const filled = useRef(false);

  useEffect(() => {
    if (!secao) return;
    setKyteOpen(true);
    if (secao === 'diagnostico') setStack([{ type: 'diagnostico' }]);
    else if (SECTIONS.some((x) => x.key === secao)) {
      setSection(secao as Section);
      setStack([]);
    }
  }, [secao, setKyteOpen]);

  const havena = useCallback(
    () => setOverlay(<HavenaPanel onClose={() => setOverlay(null)} />),
    [setOverlay],
  );

  const nav = useMemo<KyteNav>(
    () => ({
      section,
      go: (s) => {
        setSell(null);
        setSection(s);
        setStack([]);
        setMenuOpen(false);
      },
      open: (d) => setStack((st) => [...st, d]),
      back: () => setStack((st) => st.slice(0, -1)),
      menu: () => setMenuOpen((m) => !m),
      havena,
    }),
    [section, havena],
  );

  if (!kyteOpen) return <KyteConnect onOpen={() => setKyteOpen(true)} />;

  const fill = () => {
    if (!sell || filled.current) return;
    filled.current = true;
    setSellMsg('Colocando os itens no carrinho do Kyte…');
    setTimeout(
      () =>
        win.current?.run(
          `${AGENT_HELPERS}\nwindow.__gcA.job(-1, async function(){ var A = window.__gcA; ${JOBS.fillSale(sell)} });`,
        ),
      1800,
    );
  };

  const onMessage = (
    m: KyteMessage | { type: 'job'; ok: boolean; data?: { missing?: string[] }; error?: string },
  ) => {
    if (m.type === 'job') {
      const miss = m.data?.missing ?? [];
      setSellMsg(
        !m.ok
          ? `Não consegui montar o carrinho (${m.error}). Adicione os itens aqui no Kyte.`
          : miss.length
            ? `Faltou pôr: ${miss.join(', ')}. Confira e conclua a venda.`
            : 'Itens e cliente no carrinho. Escolha o pagamento e conclua a venda.',
      );
      return;
    }
    if (m.type !== 'route') return;
    if (m.logged) fill();
    noteKyteLogged(m.logged);
    if (m.logged && !logged) {
      // Acabou de entrar: a janela invisível passa a usar o mesmo login.
      reloadKyteAgent();
      setLogged(true);
    } else if (!m.logged && logged && Platform.OS !== 'web') setLogged(false);
  };

  // Página real: login (sem conta) ou para concluir a venda montada aqui.
  const web = !logged || !!sell;
  const top = stack[stack.length - 1];
  const key = web ? 'web' : top ? `${top.type}:${'id' in top ? top.id : ''}` : section;

  let body: ReactNode;
  if (web)
    body = (
      <View style={{ flex: 1, backgroundColor: KY.card }}>
        {logged && (
          <Header
            title="Concluir venda"
            onBack={() => {
              setSell(null);
              setSellMsg(null);
              filled.current = false;
            }}
          />
        )}
        {sellMsg && (
          <View style={{ backgroundColor: '#E6FAF4', paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text size={phone ? 18 : 20} weight="medium" color={KY.greenInk}>
              {sellMsg}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <KyteWindow
            ref={win}
            dark={false}
            phone={phone}
            minimal
            onMessage={(m) => onMessage(m as Parameters<typeof onMessage>[0])}
          />
        </View>
      </View>
    );
  else if (top?.type === 'client') body = <ClientDetail id={top.id} />;
  else if (top?.type === 'sale') body = <SaleDetail id={top.id} />;
  else if (top?.type === 'receipt') body = <Receipt id={top.id} />;
  else if (top?.type === 'diagnostico') body = <DiagnosticScreen />;
  else if (top?.type === 'product') body = <ProductDetail id={top.id} />;
  else if (section === 'vender')
    body = (
      <SellScreen
        onFinish={(p) => {
          filled.current = false;
          setSellMsg(null);
          setSell(p);
        }}
      />
    );
  else if (section === 'produtos') body = <ProductsScreen />;
  else if (section === 'clientes') body = <ClientsScreen />;
  else if (section === 'historico') body = <HistoryScreen />;
  else body = <HomeScreen />;

  return (
    <KyteNavContext.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: KY.bg }}>
        <Appear key={key} distance={10} style={{ flex: 1 }}>
          {body}
        </Appear>
        {menuOpen && logged && <SectionMenu onClose={() => setMenuOpen(false)} />}
      </View>
    </KyteNavContext.Provider>
  );
}

/** Menu ☰: as seções do Kyte no GoClient. */
function SectionMenu({ onClose }: { onClose: () => void }) {
  const s = useKySize();
  const nav = useContextNav();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Touchable
        scaleTo={1}
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,.35)' }]}
      >
        <View />
      </Touchable>
      <Appear
        distance={12}
        style={{
          position: 'absolute',
          top: 96,
          left: s.pad,
          width: s.phone ? 420 : 440,
          backgroundColor: KY.card,
          borderRadius: 22,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        {SECTIONS.map((x) => {
          const on = nav.section === x.key;
          return (
            <Touchable
              key={x.key}
              onPress={() => nav.go(x.key)}
              scaleTo={0.98}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 20,
                paddingHorizontal: 26,
                height: s.phone ? 86 : 80,
                backgroundColor: on ? '#E6FAF4' : 'transparent',
              }}
            >
              <KIcon name={x.icon as IconName} size={s.icon} color={on ? KY.greenInk : KY.ink} />
              <Text
                size={s.row}
                weight={on ? 'semibold' : 'regular'}
                color={on ? KY.greenInk : KY.ink}
              >
                {x.label}
              </Text>
            </Touchable>
          );
        })}
      </Appear>
    </View>
  );
}
