import { type ComponentProps, createContext, useContext } from 'react';
import { Touchable } from '../ui/primitives';

/** Diz se o último gesto na aba foi um arrasto (aí o toque nos botões é ignorado). */
export const DraggedContext = createContext<{ current: boolean }>({ current: false });

/** Botão da aba: ignora o toque quando o gesto foi um arrasto da aba. */
export function Tap({ onPress, ...rest }: ComponentProps<typeof Touchable>) {
  const dragged = useContext(DraggedContext);
  return (
    <Touchable
      {...rest}
      onPress={onPress ? (e) => (dragged.current ? undefined : onPress(e)) : undefined}
    />
  );
}

/**
 * Trava a aba enquanto um item da lista é arrastado (lista "Rota"): a aba não sobe/desce e o
 * conteúdo não rola, para o dedo mover só o item.
 */
export const SheetLock = createContext<(locked: boolean) => void>(() => {});

/** Atributo que marca a alça de arrastar (o navegador não passa esse gesto para a aba). */
export const REORDER_HANDLE = 'data-reorder-handle';
