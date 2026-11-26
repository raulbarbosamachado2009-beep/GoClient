import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

/** Estado da interface: o que está aberto por cima das telas. */
interface PrototypeState {
  /** Janela do Kyte aberta (o login em si fica salvo nos cookies da janela). */
  kyteOpen: boolean;
  setKyteOpen: (v: boolean) => void;
  overlay: ReactNode;
  setOverlay: (node: ReactNode) => void;
}

const Ctx = createContext<PrototypeState | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [kyteOpen, setKyteOpen] = useState(false);
  const [overlay, setOverlay] = useState<ReactNode>(null);
  const value = useMemo<PrototypeState>(
    () => ({ kyteOpen, setKyteOpen, overlay, setOverlay }),
    [kyteOpen, overlay],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototype(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype fora do PrototypeProvider');
  return ctx;
}
