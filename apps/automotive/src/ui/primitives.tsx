import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { type ComponentProps, type ReactNode, useRef, useState } from 'react';
import {
  Animated,
  Platform,
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
import { layout, nativeDriver, spacing, type TypeVariant, type, useColors } from '../theme';
import { useSpring } from './motion';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  size = 30,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
}

/* ---------------- Texto ---------------- */

type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'danger';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: Tone;
  color?: string;
}

export function Text({ variant = 'body', tone = 'primary', color, style, ...rest }: TextProps) {
  const c = useColors();
  const toneColor = {
    primary: c.text,
    secondary: c.textSecondary,
    tertiary: c.textTertiary,
    accent: c.accent,
    success: c.success,
    danger: c.danger,
  }[tone];
  return <RNText style={[type[variant], { color: color ?? toneColor }, style]} {...rest} />;
}

/* ---------------- Toque ---------------- */

/**
 * Área tocável com a resposta do CarPlay: leve redução por mola ao pressionar e retorno
 * elástico ao soltar.
 */
export function Touchable({
  style,
  children,
  scaleTo = 0.96,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode; scaleTo?: number }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(s, {
      toValue: v,
      damping: 18,
      stiffness: 420,
      useNativeDriver: nativeDriver,
    }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        to(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        rest.onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: s }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ---------------- Botões ---------------- */

type ButtonVariant = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive' | 'music';

export function Button({
  label,
  icon,
  variant = 'filled',
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
  const c = useColors();
  const look: Record<ButtonVariant, { bg: string; fg: string }> = {
    filled: { bg: c.accent, fg: c.onAccent },
    tinted: {
      bg: c.mode === 'dark' ? 'rgba(10,132,255,0.22)' : 'rgba(0,122,255,0.12)',
      fg: c.accent,
    },
    gray: { bg: c.fill, fg: c.text },
    plain: { bg: 'transparent', fg: c.accent },
    destructive: {
      bg: c.mode === 'dark' ? 'rgba(255,69,58,0.2)' : 'rgba(255,59,48,0.12)',
      fg: c.danger,
    },
    music: { bg: c.music.accent, fg: c.music.onAccent },
  };
  const l = look[variant];
  return (
    <Touchable
      accessibilityRole="button"
      {...rest}
      style={[
        styles.button,
        {
          height: size === 'lg' ? 84 : layout.touch - 4,
          backgroundColor: l.bg,
          opacity: rest.disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 32 : 28} color={l.fg} />}
      <Text variant="headline" color={l.fg}>
        {label}
      </Text>
    </Touchable>
  );
}

export function IconButton({
  icon,
  size = layout.touch,
  iconSize = 32,
  variant = 'plain',
  color,
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  icon: IconName;
  size?: number;
  iconSize?: number;
  variant?: 'plain' | 'gray' | 'inverse';
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = variant === 'gray' ? c.fill : variant === 'inverse' ? c.text : 'transparent';
  const fg = color ?? (variant === 'inverse' ? (c.mode === 'dark' ? '#000' : '#FFF') : c.text);
  return (
    <Touchable
      accessibilityRole="button"
      scaleTo={0.9}
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

/* ---------------- Identidade ---------------- */

/** Avatar no estilo do app Contatos: iniciais brancas sobre degradê cinza. */
export function Avatar({
  name,
  size = 64,
  square = false,
}: {
  name: string;
  size?: number;
  square?: boolean;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <LinearGradient
      colors={['#A6ABB8', '#858994']}
      style={[
        styles.center,
        { width: size, height: size, borderRadius: square ? size * 0.26 : size / 2 },
      ]}
    >
      <RNText
        style={[
          type.headline,
          { color: '#FFFFFF', fontSize: size * 0.38, lineHeight: size * 0.46 },
        ]}
      >
        {initials}
      </RNText>
    </LinearGradient>
  );
}

/** Ícone de app (squircle colorido com glifo branco), como no CarPlay e nos Ajustes. */
export function AppIcon({
  icon,
  color,
  size = 64,
  glyph = '#FFFFFF',
}: {
  icon: IconName;
  color: string;
  size?: number;
  glyph?: string;
}) {
  return (
    <LinearGradient
      colors={[lighten(color, 0.18), color]}
      style={[styles.center, { width: size, height: size, borderRadius: size * 0.235 }]}
    >
      <Ionicons name={icon} size={size * 0.56} color={glyph} />
    </LinearGradient>
  );
}

/* ---------------- Controles ---------------- */

export function Chip({
  label,
  icon,
  selected = false,
  accent,
  onAccent,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected?: boolean;
  accent?: string;
  onAccent?: string;
  onPress?: () => void;
}) {
  const c = useColors();
  const bg = selected ? (accent ?? c.text) : c.fill;
  const fg = selected ? (onAccent ?? (c.mode === 'dark' ? '#000' : '#FFF')) : c.text;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg }]}
    >
      {icon && <Icon name={icon} size={26} color={fg} />}
      <Text variant="bodyStrong" color={fg}>
        {label}
      </Text>
    </Touchable>
  );
}

export function SearchField({
  placeholder,
  style,
  background,
  foreground,
}: {
  placeholder: string;
  style?: StyleProp<ViewStyle>;
  background?: string;
  foreground?: string;
}) {
  const c = useColors();
  const fg = foreground ?? c.text;
  return (
    <View style={[styles.search, { backgroundColor: background ?? c.fill }, style]}>
      <Icon name="search" size={28} color={foreground ? `${foreground}99` : c.textSecondary} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={foreground ? `${foreground}88` : c.textSecondary}
        style={[type.body, { flex: 1, color: fg, height: '100%' }, webNoOutline]}
      />
    </View>
  );
}

const webNoOutline = { outlineStyle: 'none' } as object;

/** Controle segmentado do iOS, com o "polegar" deslizando entre as opções. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  segmentWidth = 170,
}: {
  options: { value: T; label?: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  segmentWidth?: number;
}) {
  const c = useColors();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const x = useSpring(index * segmentWidth);
  return (
    <View
      style={[
        styles.segmented,
        { backgroundColor: c.fill, width: segmentWidth * options.length + 8 },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            width: segmentWidth,
            backgroundColor: c.mode === 'dark' ? '#636366' : '#FFFFFF',
            transform: [{ translateX: x }],
          },
        ]}
      />
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[styles.segment, { width: segmentWidth }]}
        >
          {o.icon && <Icon name={o.icon} size={24} />}
          {o.label && <Text variant="subhead">{o.label}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

/** Interruptor do iOS com o botão deslizando por mola. */
export function Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  const x = useSpring(value ? 36 : 0);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.switch, { backgroundColor: value ? c.success : c.fillStrong }]}
    >
      <Animated.View style={[styles.knob, { transform: [{ translateX: x }] }]} />
    </Pressable>
  );
}

/* ---------------- Listas (inset grouped) ---------------- */

export function Group({
  children,
  style,
  inset = 24,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Recuo do separador (alinha com o texto quando há ícone/avatar à esquerda). */
  inset?: number;
}) {
  const c = useColors();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View
      style={[
        { backgroundColor: c.grouped, borderRadius: layout.radius.lg, overflow: 'hidden' },
        style,
      ]}
    >
      {items.map((child, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: filhos estáticos
        <View key={i}>
          {i > 0 && <Separator inset={inset} />}
          {child}
        </View>
      ))}
    </View>
  );
}

export function Row({
  leading,
  title,
  subtitle,
  value,
  trailing,
  chevron,
  onPress,
  titleColor,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  titleColor?: string;
}) {
  const c = useColors();
  const [pressed, setPressed] = useState(false);
  const content = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" color={titleColor} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text variant="body" tone="secondary" numberOfLines={1}>
          {value}
        </Text>
      )}
      {trailing}
      {chevron && <Icon name="chevron-forward" size={26} color={c.textTertiary} />}
    </>
  );
  // Sem ação, a linha é só um contêiner: controles dentro dela (interruptor, seletor)
  // continuam recebendo toques normalmente.
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.row, pressed && { backgroundColor: c.fill }]}
    >
      {content}
    </Pressable>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="subhead" tone="secondary">
        {title}
      </Text>
      {action}
    </View>
  );
}

export function Separator({ inset = 0 }: { inset?: number }) {
  const c = useColors();
  return (
    <View
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginLeft: inset }}
    />
  );
}

/** Cabeçalho de página: título grande e subtítulo, ações à direita. */
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
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="largeTitle">{title}</Text>
        <Text variant="callout" tone="secondary">
          {subtitle}
        </Text>
      </View>
      {right}
    </View>
  );
}

/**
 * Desfoque do que está atrás. Na Web usa `backdrop-filter` com raio forte (o expo-blur
 * limita a ~20 px); no Android/iOS usa o BlurView nativo na intensidade máxima.
 */
export function Blur({ radius = 40, tint }: { radius?: number; tint: 'dark' | 'light' }) {
  if (Platform.OS === 'web') {
    const f = `blur(${radius.toFixed(1)}px) saturate(${100 + (80 * Math.min(radius, 40)) / 40}%)`;
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backdropFilter: f, WebkitBackdropFilter: f } as object]}
      />
    );
  }
  return (
    <BlurView
      tint={tint}
      intensity={Math.min(100, (radius / 40) * 100)}
      experimentalBlurMethod="dimezisBlurView"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

/**
 * Material translúcido (estilo iOS): desfoque forte + camada de cor quase opaca, como na
 * referência do cartão do cliente. Usado sobre o mapa e na barra lateral.
 */
export function Material({
  style,
  children,
  radius = 44,
  ...rest
}: ViewProps & { radius?: number }) {
  const c = useColors();
  return (
    <View
      style={[{ overflow: 'hidden', borderWidth: 1, borderColor: c.material.border }, style]}
      {...rest}
    >
      <Blur radius={radius} tint={c.material.tint} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.material.fallback }]} />
      {children}
    </View>
  );
}

/** Fundo de janelas e pop-ups: desfoca toda a tela atrás (referência: imagem 1). */
/**
 * Fundo de janelas e pop-ups: desfoca a tela atrás (referência: imagem 1).
 * `progress` (0→1) aumenta o raio do desfoque e o tom aos poucos, para que o desfoque
 * entre e saia numa transição — e não de uma vez.
 */
export function BlurBackdrop({
  onPress,
  progress = 1,
}: {
  onPress?: () => void;
  progress?: number;
}) {
  const c = useColors();
  const tint =
    c.mode === 'dark' ? `rgba(0,0,0,${0.35 * progress})` : `rgba(200,200,206,${0.35 * progress})`;
  return (
    <Pressable accessibilityLabel="Fechar janela" onPress={onPress} style={StyleSheet.absoluteFill}>
      <Blur radius={22 * progress} tint={c.material.tint} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
    </Pressable>
  );
}

function lighten(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 0xff;
    return Math.round(v + (255 - v) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[8],
    borderRadius: layout.radius.md,
  },
  chip: {
    height: 64,
    paddingHorizontal: spacing[6],
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  search: {
    height: 72,
    borderRadius: layout.radius.md,
    paddingHorizontal: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  segmented: { height: 68, borderRadius: 16, padding: 4, flexDirection: 'row' },
  thumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  switch: { width: 92, height: 56, borderRadius: 28, padding: 4 },
  knob: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    minHeight: 88,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[6],
    marginBottom: spacing[2],
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[6] },
});
