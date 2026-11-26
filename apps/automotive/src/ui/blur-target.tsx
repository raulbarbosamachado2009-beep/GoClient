import { BlurTargetView } from 'expo-blur';
import {
  type ComponentRef,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
} from 'react';
import { Platform, type StyleProp, View, type ViewStyle } from 'react-native';

/**
 * Desfoque no Android (expo-blur): cada efeito de desfoque precisa apontar para a área que
 * fica atrás dele, marcada com um BlurTargetView. Sem isso o Android mostra só a cor por
 * cima (era o que acontecia). Na Web e no iOS o desfoque vem do sistema e isto não muda nada.
 *
 * Regra: um desfoque nunca pode estar DENTRO da área que ele desfoca. Por isso:
 * - a barra lateral desfoca a área do conteúdo (irmã dela);
 * - janelas e a Havena (camada por cima) desfocam o conteúdo + a barra lateral;
 * - os cartões do Mapa desfocam só o mapa;
 * - dentro das telas, sem uma área própria, o desfoque usa a cor de reserva do material.
 */
/**
 * Desfoque ao vivo no Android: desligado. Ele redesenha a área de trás (com o mapa e as
 * páginas, que são janelas web) a cada quadro e deixava o app travando em celulares comuns.
 * No Android os vidros viram uma cor quase opaca; na Web e no iOS nada muda.
 */
export const LIVE_BLUR = Platform.OS !== 'android';

export type BlurTargetRef = RefObject<ComponentRef<typeof View> | null>;

const BlurTargetContext = createContext<BlurTargetRef | null>(null);

/** Área que os efeitos de desfoque deste trecho da árvore vão desfocar. */
export const useBlurTarget = () => {
  const t = useContext(BlurTargetContext);
  return LIVE_BLUR ? t : null;
};

export function BlurTargetProvider({
  value,
  children,
}: {
  value: BlurTargetRef | null;
  children: ReactNode;
}) {
  return <BlurTargetContext.Provider value={value}>{children}</BlurTargetContext.Provider>;
}

/** Marca uma área como "o que fica atrás" para os desfoques que apontam para ela. */
export function BlurArea({
  targetRef,
  style,
  children,
}: {
  targetRef: BlurTargetRef;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (!LIVE_BLUR || Platform.OS !== 'android') {
    return (
      <View ref={targetRef} style={style}>
        {children}
      </View>
    );
  }
  return (
    <BlurTargetView ref={targetRef} style={style}>
      {children}
    </BlurTargetView>
  );
}
