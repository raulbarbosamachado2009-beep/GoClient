import { createContext, useContext } from 'react';
import { layout } from '../theme';

/**
 * Formato da interface:
 * - `car`: multimídia (e celular deitado) — tela de referência 1600×900, barra lateral;
 * - `phone`: celular em pé — largura de referência 720, barra de abas embaixo.
 *
 * Os componentes continuam medidos nas mesmas unidades; no celular a tela de 720 de
 * largura é reduzida para a largura real do aparelho (≈0,55×), o que deixa o texto do
 * tamanho usual de apps de celular.
 */
export type FormFactor = 'car' | 'phone';

/** Largura de referência do celular em pé. */
export const PHONE_WIDTH = 720;
/** Altura da barra de abas do celular (sem a área de gestos do sistema). */
export const TAB_BAR_HEIGHT = 132;
/**
 * Espaço livre no fim das listas das telas que vão até o rodapé (atrás da barra flutuante e
 * do player minimizado), para o último item ainda poder ser rolado até ficar visível.
 */
export const PHONE_SCROLL_END = TAB_BAR_HEIGHT + 96 + 72;

const FormFactorContext = createContext<FormFactor>('car');
export const FormFactorProvider = FormFactorContext.Provider;
export const useFormFactor = () => useContext(FormFactorContext);
export const usePhone = () => useContext(FormFactorContext) === 'phone';

/** Quanto os fundos das telas avançam por baixo da barra lateral (0 no celular). */
export function useBleed() {
  return usePhone() ? 0 : layout.sidebarWidth;
}

/**
 * Anula um `flex: 1` herdado ao empilhar em coluna no celular. Não usar `flex: 0`: na web ele
 * mantém a base 0% e o bloco some (altura zero).
 */
export const NO_FLEX = { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' } as const;
