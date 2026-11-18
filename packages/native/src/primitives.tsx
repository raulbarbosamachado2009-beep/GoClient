import { colors, radius, spacing } from '@goclient/design-tokens';
import type { ReactNode } from 'react';
import {
  Text as RNText,
  type TextProps as RNTextProps,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { useScale } from './scale';

type Variant = 'title' | 'headline' | 'body' | 'caption';
type Tone = 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger';

const toneColor: Record<Tone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  success: colors.success,
  danger: colors.danger,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
}

/** Texto com a escala tipográfica da plataforma atual. */
export function Text({ variant = 'body', tone = 'primary', style, ...rest }: TextProps) {
  const scale = useScale();
  return <RNText style={[scale.type[variant], { color: toneColor[tone] }, style]} {...rest} />;
}

/** Superfície elevada (cartões, painéis). Profundidade por contraste e borda, sem sombra forte. */
export function Surface({ style, ...rest }: ViewProps) {
  return <View style={[styles.surface, style]} {...rest} />;
}

/** Contêiner de tela com fundo e espaçamento padrão. */
export function Screen({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  const scale = useScale();
  const padding = scale.name === 'automotive' ? spacing[10] : spacing[5];
  return (
    <View style={[styles.screen, { padding }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
});
