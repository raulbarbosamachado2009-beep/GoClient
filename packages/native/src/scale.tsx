import { automotive, mobile, type TypeStyle, typography } from '@goclient/design-tokens';
import { createContext, type ReactNode, useContext } from 'react';

/**
 * Escala visual por plataforma. Os mesmos componentes base renderizam com alvos de
 * toque e tipografia diferentes no Mobile e no Automotive, sem duplicar código.
 * As telas de cada app continuam próprias — o que é compartilhado é a base.
 */
export interface VisualScale {
  name: 'mobile' | 'automotive';
  minTouchTarget: number;
  type: { title: TypeStyle; headline: TypeStyle; body: TypeStyle; caption: TypeStyle };
}

export const mobileScale: VisualScale = {
  name: 'mobile',
  minTouchTarget: mobile.minTouchTarget,
  type: {
    title: typography.title,
    headline: typography.headline,
    body: typography.body,
    caption: typography.footnote,
  },
};

export const automotiveScale: VisualScale = {
  name: 'automotive',
  minTouchTarget: automotive.minTouchTarget,
  type: automotive.typography,
};

const ScaleContext = createContext<VisualScale>(mobileScale);

export function ScaleProvider({ scale, children }: { scale: VisualScale; children: ReactNode }) {
  return <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>;
}

export function useScale(): VisualScale {
  return useContext(ScaleContext);
}
