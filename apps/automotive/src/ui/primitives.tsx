import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  Text as RNText,
  type TextProps as RNTextProps,
  type StyleProp,
  StyleSheet,
  TextInput,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { colors, layout, radius, spacing, swatchFor, type TypeVariant, type } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  size = 32,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'danger' | 'inverse';
const toneColor: Record<Tone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  accent: colors.accent,
  success: colors.success,
  danger: colors.danger,
  inverse: '#000000',
};

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: Tone;
  color?: string;
}

export function Text({ variant = 'body', tone = 'primary', color, style, ...rest }: TextProps) {
  return <RNText style={[type[variant], { color: color ?? toneColor[tone] }, style]} {...rest} />;
}

/**
 * Área tocável com resposta visual discreta (opacidade + leve redução). Usada por todos
 * os controles para manter o mesmo comportamento em toda a interface.
 */
export function Touchable({
  style,
  children,
  pressedOpacity = 0.72,
  ...rest
}: PressableProps & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  pressedOpacity?: number;
}) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        style,
        pressed && { opacity: pressedOpacity, transform: [{ scale: 0.985 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'music';

const buttonStyles: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.accent, fg: colors.onAccent },
  secondary: { bg: colors.panelHigh, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.text },
  danger: { bg: 'rgba(255,69,58,0.14)', fg: colors.danger },
  music: { bg: colors.music.accent, fg: colors.music.onAccent },
};

export function Button({
  label,
  icon,
  variant = 'primary',
  size = 'lg',
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  icon?: IconName;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const s = buttonStyles[variant];
  const height = size === 'lg' ? 88 : layout.touch;
  return (
    <Touchable
      accessibilityRole="button"
      {...rest}
      style={[
        styles.button,
        {
          height,
          backgroundColor: s.bg,
          borderColor: s.border ?? 'transparent',
          borderWidth: s.border ? 1 : 0,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 34 : 30} color={s.fg} />}
      <Text variant={size === 'lg' ? 'headline' : 'bodyStrong'} color={s.fg}>
        {label}
      </Text>
    </Touchable>
  );
}

export function IconButton({
  icon,
  size = layout.touch,
  iconSize = 32,
  variant = 'filled',
  color,
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  icon: IconName;
  size?: number;
  iconSize?: number;
  variant?: 'filled' | 'plain' | 'inverse';
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'filled' ? colors.panelHigh : variant === 'inverse' ? colors.text : 'transparent';
  const fg = color ?? (variant === 'inverse' ? '#000' : colors.text);
  return (
    <Touchable
      accessibilityRole="button"
      {...rest}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        styles.center,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={fg} />
    </Touchable>
  );
}

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

export function Chip({
  label,
  icon,
  selected = false,
  accent = colors.text,
  onAccent = '#000',
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected?: boolean;
  accent?: string;
  onAccent?: string;
  onPress?: () => void;
}) {
  const fg = selected ? onAccent : colors.text;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? accent : colors.panelHigh,
          borderColor: selected ? accent : colors.border,
        },
      ]}
    >
      {icon && <Icon name={icon} size={28} color={fg} />}
      <Text variant="bodyStrong" color={fg}>
        {label}
      </Text>
    </Touchable>
  );
}

export function SearchField({
  placeholder,
  light = false,
  style,
}: {
  placeholder: string;
  light?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = light ? '#1C1C1E' : colors.text;
  return (
    <View
      style={[
        styles.search,
        light
          ? { backgroundColor: '#E5E5EA' }
          : { backgroundColor: colors.panelHigh, borderColor: colors.border, borderWidth: 1 },
        style,
      ]}
    >
      <Icon name="search" size={30} color={light ? '#3A3A3C' : colors.textSecondary} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={light ? '#6C6C70' : colors.textTertiary}
        style={[type.body, { flex: 1, color: fg, height: '100%' }, webNoOutline]}
      />
    </View>
  );
}

// Remove o contorno de foco padrão do navegador (o campo já tem fundo destacado).
const webNoOutline = { outlineStyle: 'none' } as object;

export function Avatar({
  name,
  size = 72,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.center,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color ?? swatchFor(name),
        },
      ]}
    >
      <Text
        variant="bodyStrong"
        color="#FFFFFF"
        style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}
      >
        {initials}
      </Text>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label?: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Touchable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: colors.surfaceOverlay }]}
          >
            {o.icon && (
              <Icon name={o.icon} size={28} color={active ? colors.text : colors.textSecondary} />
            )}
            {o.label && (
              <Text variant="bodyStrong" tone={active ? 'primary' : 'secondary'}>
                {o.label}
              </Text>
            )}
          </Touchable>
        );
      })}
    </View>
  );
}

export function Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Touchable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.switch, { backgroundColor: value ? colors.success : colors.surfaceOverlay }]}
    >
      <View style={[styles.knob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Touchable>
  );
}

export function Tag({
  label,
  icon,
  color = colors.textSecondary,
}: {
  label: string;
  icon?: IconName;
  color?: string;
}) {
  return (
    <View style={styles.tag}>
      {icon && <Icon name={icon} size={20} color={color} />}
      <Text variant="label" color={color}>
        {label}
      </Text>
    </View>
  );
}

/** Cabeçalho padrão das páginas: título, subtítulo e ações à direita. */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text variant="title">{title}</Text>
        <Text variant="callout" tone="secondary">
          {subtitle}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginLeft: inset,
      }}
    />
  );
}

export const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[8],
    borderRadius: radius.lg,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    height: layout.touch - 4,
    paddingHorizontal: spacing[6],
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  search: {
    height: layout.touch + 4,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    backgroundColor: colors.panelHigh,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    minWidth: layout.touch - 8,
    height: layout.touch - 8,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  switch: { width: 92, height: 52, borderRadius: 26, padding: 4, justifyContent: 'center' },
  knob: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.panelHigh,
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[6] },
});
