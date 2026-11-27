import { type ReactNode, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useTabBarSpace } from '../../layout/form-factor';
import { concentric, FONT } from '../../theme';
import { Touchable } from '../../ui/primitives';
import { type IconName, KIcon, KY, Text, useKySize } from '../ui';

/**
 * Peças das telas de venda, no desenho do Kyte (vídeo do usuário, 27/11): fundo branco,
 * linhas finas, verde do Kyte nos botões principais. Bordas concêntricas onde uma peça fica
 * dentro de outra, SF Pro e alvos grandes na multimídia.
 */

/** Raio dos botões grandes do rodapé (e as peças de dentro seguem o concêntrico). */
export function useRadius() {
  const s = useKySize();
  return s.phone ? 20 : 26;
}

/** Cliente da venda no canto do cabeçalho ("Danilo DR… 👤"), como no Kyte. */
export function CustomerChip({ name, onPress }: { name: string; onPress: () => void }) {
  const s = useKySize();
  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={`Cliente da venda: ${name}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: KY.navy,
        borderRadius: s.phone ? 10 : 14,
        paddingHorizontal: s.phone ? 13 : 18,
        height: s.phone ? 58 : 76,
        maxWidth: s.phone ? 230 : 380,
      }}
    >
      <Text size={s.sub} weight="medium" lines={1} style={{ flexShrink: 1 }}>
        {name}
      </Text>
      <KIcon name="person-outline" size={s.sub + 4} />
    </Touchable>
  );
}

/** Botão verde do Kyte ("8 itens = R$ 358,00 ›", "Avançar ›", "Concluir R$ ..."). */
export function KyteButton({
  label,
  onPress,
  outline,
  chevron,
  icon,
  disabled,
  flex,
  tone = 'green',
  greenOutline,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  chevron?: boolean;
  icon?: IconName;
  disabled?: boolean;
  flex?: boolean;
  tone?: 'green' | 'red';
  /** Contorno verde com texto verde ("Nenhum item" do Kyte). */
  greenOutline?: boolean;
}) {
  const s = useKySize();
  const r = useRadius();
  const color = tone === 'red' ? KY.red : KY.green;
  const ink = outline ? (greenOutline ? KY.greenInk : tone === 'red' ? KY.red : KY.ink) : '#FFFFFF';
  return (
    <Touchable
      onPress={disabled ? undefined : onPress}
      sound={!outline && !disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={{
        flex: flex ? 1 : undefined,
        height: s.phone ? 99 : 128,
        borderRadius: r,
        backgroundColor: outline ? KY.card : color,
        borderWidth: outline ? 2 : 0,
        borderColor: outline ? (greenOutline ? KY.green : '#C9CFD6') : 'transparent',
        opacity: disabled ? 0.45 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: s.phone ? 27 : 36,
        gap: 14,
      }}
    >
      {icon ? <KIcon name={icon} size={s.icon} color={ink} /> : null}
      <Text
        size={s.phone ? 31 : 40}
        weight="semibold"
        color={ink}
        lines={1}
        style={{ flex: chevron ? 1 : undefined, textAlign: 'center' }}
      >
        {label}
      </Text>
      {chevron ? <KIcon name="chevron-forward" size={s.icon} color={ink} /> : null}
    </Touchable>
  );
}

/** Rodapé fixo das telas de venda (fica acima da barra de abas no celular). */
export function Bottom({ children }: { children: ReactNode }) {
  const s = useKySize();
  const tab = useTabBarSpace();
  return (
    <View
      style={{
        paddingHorizontal: s.phone ? 18 : s.pad,
        paddingTop: 10,
        paddingBottom: s.phone ? tab + 12 : 20,
        gap: 12,
        backgroundColor: KY.card,
      }}
    >
      {children}
    </View>
  );
}

/** Botão quadrado "…" (Mais opções) ao lado do total do carrinho. */
export function MoreButton({ onPress }: { onPress: () => void }) {
  const s = useKySize();
  const r = useRadius();
  const box = s.phone ? 99 : 128;
  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel="Mais opções"
      style={{
        width: box,
        height: box,
        borderRadius: r,
        backgroundColor: '#EEF1F4',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <KIcon name="ellipsis-horizontal" size={s.icon} color={KY.sub} />
    </Touchable>
  );
}

/**
 * Teclado numérico do Kyte (valor unitário, quantidade, desconto, valor recebido). No
 * celular fica embaixo do valor; na multimídia, ao lado (a tela é deitada).
 */
export function Numpad({
  onDigit,
  onBack,
  onOk,
  okDisabled,
}: {
  onDigit: (d: number) => void;
  onBack: () => void;
  /** "✓" no canto (como no Kyte); sem ele, a tecla fica vazia. */
  onOk?: () => void;
  okDisabled?: boolean;
}) {
  const s = useKySize();
  // Preview no computador: o teclado físico também digita (números, apagar e Enter).
  const latest = useRef({ onDigit, onBack, onOk, okDisabled });
  latest.current = { onDigit, onBack, onOk, okDisabled };
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const l = latest.current;
      if (/^[0-9]$/.test(e.key)) l.onDigit(Number(e.key));
      else if (e.key === 'Backspace') l.onBack();
      else if (e.key === 'Enter' && l.onOk && !l.okDisabled) l.onOk();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const keys: (number | 'back' | 'ok' | null)[] = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    'back',
    0,
    onOk ? 'ok' : null,
  ];
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: KY.line }}
    >
      {keys.map((k, i) => (
        <Touchable
          // biome-ignore lint/suspicious/noArrayIndexKey: posições fixas do teclado
          key={i}
          scaleTo={0.94}
          disabled={k === null || (k === 'ok' && okDisabled)}
          onPress={() => {
            if (k === 'back') onBack();
            else if (k === 'ok') onOk?.();
            else if (typeof k === 'number') onDigit(k);
          }}
          accessibilityLabel={
            k === 'back' ? 'Apagar' : k === 'ok' ? 'Confirmar' : k === null ? undefined : String(k)
          }
          style={{
            width: '33.333%',
            height: s.phone ? 125 : 150,
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: i < 9 ? 1 : 0,
            borderBottomColor: KY.line,
            ...(Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : null),
          }}
        >
          {k === 'back' ? (
            <KIcon name="backspace-outline" size={s.icon + 4} color={KY.ink} />
          ) : k === 'ok' ? (
            <KIcon name="checkmark" size={s.icon + 8} color={okDisabled ? KY.faint : KY.greenInk} />
          ) : k === null ? null : (
            <Text size={s.phone ? 45 : 56} weight="regular">
              {k}
            </Text>
          )}
        </Touchable>
      ))}
    </View>
  );
}

/** Valor grande do Kyte: "R$" pequeno e o número grande e fino ("R$ 358,00"). */
export function BigAmount({
  value,
  color = KY.ink,
  size,
  cursor,
}: {
  value: string;
  color?: string;
  size?: number;
  cursor?: boolean;
}) {
  const s = useKySize();
  const big = size ?? (s.phone ? 108 : 128);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Text size={big * 0.3} color={color}>
        R$
      </Text>
      <Text size={big} color={color} style={{ fontFamily: FONT.displayLight, letterSpacing: -1 }}>
        {value}
      </Text>
      {cursor ? (
        <View style={{ width: 3, height: big * 0.8, backgroundColor: color, opacity: 0.6 }} />
      ) : null}
    </View>
  );
}

/** Linha de opção de lista ("Opções de entrega ›"). */
export function OptionLine({
  label,
  onPress,
  danger,
  right,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  right?: ReactNode;
}) {
  const s = useKySize();
  return (
    <Touchable
      onPress={onPress}
      scaleTo={0.99}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: s.phone ? 94 : 116,
        borderBottomWidth: 1,
        borderBottomColor: KY.line,
        paddingHorizontal: 4,
        gap: 12,
      }}
    >
      <Text size={s.row} weight="medium" color={danger ? KY.red : KY.ink} style={{ flex: 1 }}>
        {label}
      </Text>
      {right ?? (danger ? null : <KIcon name="chevron-forward" size={s.icon - 4} color={KY.sub} />)}
    </Touchable>
  );
}

/** Cartão branco por cima do conteúdo (folha "Mais opções", avisos). */
export function SheetCard({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const s = useKySize();
  const tab = useTabBarSpace();
  const R = s.phone ? 40 : 44;
  const pad = s.phone ? 25 : 32;
  return (
    <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end' }}>
      <Touchable
        scaleTo={1}
        onPress={onClose}
        accessibilityLabel="Fechar"
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(28,36,48,.55)' }}
      >
        <View />
      </Touchable>
      <View
        style={{
          backgroundColor: KY.card,
          borderTopLeftRadius: R,
          borderTopRightRadius: R,
          padding: pad,
          paddingBottom: (s.phone ? tab : 0) + pad,
          gap: 8,
          width: '100%',
          maxWidth: s.phone ? undefined : 900,
          alignSelf: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Raio de dentro de uma peça com `outer` de raio e `pad` de espaço (bordas concêntricas). */
export const inner = (outer: number, pad: number) => concentric(outer, pad);
