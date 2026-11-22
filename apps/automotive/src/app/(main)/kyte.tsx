import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { kyteAgent, noteKyteLogged, reloadKyteAgent } from '../../kyte/agent';
import { KYTE_SECTIONS, type KyteMessage, type KyteSectionKey } from '../../kyte/bridge';
import { KyteConnect } from '../../kyte/connect';
import { KyteWindow, type KyteWindowHandle } from '../../kyte/window';
import { usePhone } from '../../layout/form-factor';
import { useStops } from '../../map/stops';
import { usePrototype } from '../../prototype/state';
import { useColors } from '../../theme';
import { Appear } from '../../ui/motion';

/**
 * Kyte: a página do próprio Kyte Web, ocupando a área toda, sem nada do GoClient por fora.
 * O menu (Início · Vender · Produtos · Clientes · Histórico), o Início e os botões de rota da
 * ficha do cliente são postos dentro da página (ver kyte/bridge.ts).
 * `?secao=clientes` abre direto numa seção (usado pelo Mapa: "Ver mais", "Ficha").
 */
export default function KyteScreen() {
  const c = useColors();
  const phone = usePhone();
  const stops = useStops();
  const { secao } = useLocalSearchParams<{ secao?: string }>();
  const { kyteOpen, setKyteOpen } = usePrototype();
  const win = useRef<KyteWindowHandle>(null);
  const logged = useRef(false);
  const wanted = useRef<KyteSectionKey | undefined>(undefined);

  // Atalho vindo de fora (ex.: Mapa → Ver mais) abre a seção pedida.
  useEffect(() => {
    const key = KYTE_SECTIONS.find((s) => s.key === secao)?.key;
    if (!key) return;
    wanted.current = key;
    setKyteOpen(true);
    if (logged.current) win.current?.select(key);
  }, [secao, setKyteOpen]);

  if (!kyteOpen) return <KyteConnect onOpen={() => setKyteOpen(true)} />;

  const onMessage = (m: KyteMessage) => {
    if (m.type === 'route') {
      const was = logged.current;
      logged.current = m.logged;
      noteKyteLogged(m.logged);
      // Acabou de entrar: a janela invisível da Havena passa a usar o mesmo login.
      if (!was && m.logged) reloadKyteAgent();
      if (m.logged && wanted.current) {
        const k = wanted.current;
        wanted.current = undefined;
        setTimeout(() => win.current?.select(k), 600);
      }
    } else if (m.type === 'home') {
      kyteAgent
        .salesSummary()
        .then((d) => win.current?.home(d))
        .catch((e: Error) =>
          win.current?.home({
            today: null,
            yesterday: null,
            week: null,
            month: null,
            error: e.message,
          }),
        );
    } else if (m.type === 'client-route') {
      const s = { name: m.client.name, address: m.client.address, phone: m.client.phone };
      if (m.now) stops.goNow(s);
      else stops.add(s);
    }
  };

  return (
    <Appear distance={8} style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flex: 1 }}>
        <KyteWindow ref={win} dark={c.mode === 'dark'} phone={phone} onMessage={onMessage} />
      </View>
    </Appear>
  );
}
