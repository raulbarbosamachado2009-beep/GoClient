import { useGlobalSearchParams } from 'expo-router';
import {
  type ComponentRef,
  type ComponentType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import KyteScreen from '../screens/kyte';
import MapScreen from '../screens/mapa';
import WhatsAppScreen from '../screens/whatsapp';
import { KeptContext, type Params } from './kept-context';

/**
 * Telas que ficam **sempre abertas** por trás: Mapa, Kyte e WhatsApp. São páginas pesadas
 * (o mapa, o Kyte Web e o WhatsApp Web carregam dentro de janelas web); antes, cada troca de
 * aba fechava a tela e a página recarregava do zero (segundos). Agora a tela é montada uma vez
 * e trocar de aba só a mostra ou esconde (instantâneo).
 *
 * A rota de cada uma (`app/(main)/mapa.tsx` etc.) não desenha nada: o layout principal
 * desenha estas telas e mostra a da seção atual.
 *
 * Abertura antecipada: depois que o app abre, o Kyte e o WhatsApp são montados escondidos,
 * um de cada vez, para já estarem prontos quando a pessoa tocar na aba.
 */
export const KEPT = ['mapa', 'kyte', 'whatsapp'] as const;
export type KeptSection = (typeof KEPT)[number];

const SCREENS: Record<KeptSection, ComponentType> = {
  mapa: MapScreen,
  kyte: KyteScreen,
  whatsapp: WhatsAppScreen,
};

/** Quando cada tela é aberta escondida (ms depois de o painel abrir). */
const PREWARM: Record<KeptSection, number> = { mapa: 0, kyte: 1500, whatsapp: 4000 };

export const isKept = (s: string): s is KeptSection => (KEPT as readonly string[]).includes(s);

export function KeptScreens({
  section,
  frame,
  nodeRef,
}: {
  section: string;
  frame: (s: KeptSection) => ViewStyle;
  /** Recebe a moldura de cada tela (o fundo desfocado da multimídia fotografa a aberta). */
  nodeRef?: (s: KeptSection, node: ComponentRef<typeof View> | null) => void;
}) {
  const [mounted, setMounted] = useState<Set<KeptSection>>(
    () => new Set(isKept(section) ? [section] : []),
  );
  // Abriu uma aba mantida ainda não montada: monta já.
  useEffect(() => {
    if (isKept(section) && !mounted.has(section))
      setMounted((m) => new Set(m).add(section as KeptSection));
  }, [section, mounted]);
  // Abertura antecipada das outras (uma de cada vez, para não pesar a abertura do app).
  useEffect(() => {
    const timers = KEPT.map((s) =>
      setTimeout(() => setMounted((m) => (m.has(s) ? m : new Set(m).add(s))), PREWARM[s]),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  const global = useGlobalSearchParams() as Params;
  const last = useRef<Record<KeptSection, Params>>({ mapa: {}, kyte: {}, whatsapp: {} });
  if (isKept(section)) last.current[section] = global;

  return (
    <>
      {KEPT.filter((s) => mounted.has(s)).map((s) => (
        <Kept
          key={s}
          active={s === section}
          params={last.current[s]}
          style={frame(s)}
          nodeRef={(n) => nodeRef?.(s, n)}
        >
          {(() => {
            const Screen = SCREENS[s];
            return <Screen />;
          })()}
        </Kept>
      ))}
    </>
  );
}

function Kept({
  active,
  params,
  style,
  nodeRef,
  children,
}: {
  active: boolean;
  params: Params;
  style: ViewStyle;
  nodeRef: (node: ComponentRef<typeof View> | null) => void;
  children: ReactNode;
}) {
  // Parâmetros estáveis enquanto escondida (evita refazer a tela por mudança de outra aba).
  const value = useRef({ active, params });
  if (value.current.active !== active || (active && !sameParams(value.current.params, params)))
    value.current = { active, params };
  return (
    <View
      ref={nodeRef}
      collapsable={false}
      style={[StyleSheet.absoluteFill, style, active ? styles.on : styles.off]}
      pointerEvents={active ? 'box-none' : 'none'}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!active}
      aria-hidden={!active}
    >
      <KeptContext.Provider value={value.current}>{children}</KeptContext.Provider>
    </View>
  );
}

function sameParams(a: Params, b: Params) {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

const styles = StyleSheet.create({
  on: { opacity: 1, zIndex: 1 },
  // Escondida continua com o tamanho certo (o mapa não precisa se redesenhar ao voltar).
  off: {
    opacity: 0,
    zIndex: 0,
    ...(Platform.OS === 'web' ? ({ visibility: 'hidden' } as object) : null),
  },
});
