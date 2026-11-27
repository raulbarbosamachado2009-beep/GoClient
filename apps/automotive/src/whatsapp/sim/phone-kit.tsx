import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Text as RNText, type StyleProp, StyleSheet, type TextStyle, View } from 'react-native';
import { FONT, useColors } from '../../theme';
import { Touchable } from '../../ui/primitives';
import type { SimChat, SimMessage } from './data';

/**
 * Peças comuns do WhatsApp simulado do celular (medidas em pontos do iPhone, cores do
 * WhatsApp do iOS no claro e no escuro).
 */
export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Pontos do iPhone (largura 393) → unidades da tela de referência do celular (720). */
export const K = 720 / 393;
export const u = (pt: number) => Math.round(pt * K);

export function usePalette() {
  const dark = useColors().mode === 'dark';
  return dark
    ? {
        dark,
        bg: '#0B0B0B',
        wall: '#0B0B0B',
        card: '#1C1D1D',
        button: '#232424',
        field: '#1E1F1F',
        chip: '#0B0B0B',
        chipLine: '#2C2D2D',
        chipOn: '#103629',
        chipOnInk: '#D9FDD3',
        line: '#232424',
        ink: '#FFFFFF',
        sub: '#8D9598',
        green: '#21C063',
        greenInk: '#21C063',
        out: '#144D37',
        in: '#242626',
        red: '#F15C6D',
        avatar: '#103B4F',
        avatarInk: '#8ACDEA',
        group: '#0B3A36',
        groupInk: '#6FD1C5',
        tick: '#53BDEB',
        press: '#1A1B1B',
      }
    : {
        dark,
        bg: '#FFFFFF',
        wall: '#EFEAE2',
        card: '#FFFFFF',
        button: '#F2F2F2',
        field: '#F2F2F2',
        chip: '#FFFFFF',
        chipLine: '#E3E3E3',
        chipOn: '#D9FDD3',
        chipOnInk: '#15603E',
        line: '#E9E9E9',
        ink: '#000000',
        sub: '#8A8A8E',
        green: '#1DAA61',
        greenInk: '#1DAA61',
        out: '#D9FDD3',
        in: '#FFFFFF',
        red: '#EA0038',
        avatar: '#CAECFA',
        avatarInk: '#3D9BD1',
        group: '#CBF2EE',
        groupInk: '#048479',
        tick: '#53BDEB',
        press: '#F2F2F2',
      };
}
export type Palette = ReturnType<typeof usePalette>;
/** Fundo agrupado (dados do contato), como nos Ajustes do iPhone. */
export const grouped = (P: Palette) => (P.dark ? '#0B0B0B' : '#F2F2F7');

export const FAMILY = {
  regular: FONT.displayRegular,
  medium: FONT.displayMedium,
  semibold: FONT.displaySemibold,
  bold: FONT.displayBold,
} as const;

export function Text({
  children,
  pt,
  weight = 'regular',
  color,
  style,
  lines,
}: {
  children: ReactNode;
  /** Tamanho em pontos do iPhone. */
  pt: number;
  weight?: keyof typeof FAMILY;
  color?: string;
  style?: StyleProp<TextStyle>;
  lines?: number;
}) {
  return (
    <RNText
      numberOfLines={lines}
      style={[
        {
          fontFamily: FAMILY[weight],
          fontSize: u(pt),
          lineHeight: Math.round(u(pt) * 1.25),
          color,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

export function Icon({ name, pt, color }: { name: IconName; pt: number; color: string }) {
  return <Ionicons name={name} size={u(pt)} color={color} />;
}

export function Avatar({ P, pt, group }: { P: Palette; pt: number; group?: boolean }) {
  const s = u(pt);
  return (
    <View
      style={[
        styles.center,
        { width: s, height: s, borderRadius: s / 2, backgroundColor: group ? P.group : P.avatar },
      ]}
    >
      <Ionicons
        name={group ? 'people' : 'person'}
        size={s * (group ? 0.46 : 0.5)}
        color={group ? P.groupInk : P.avatarInk}
      />
    </View>
  );
}

/** Botão redondo de vidro do iOS 26 (44 pt). */
export function Round({
  P,
  icon,
  label,
  onPress,
  filled,
  wide,
  badge,
}: {
  P: Palette;
  icon: IconName;
  label: string;
  onPress?: () => void;
  filled?: boolean;
  wide?: boolean;
  badge?: number;
}) {
  const h = u(44);
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.9}
      style={[
        styles.center,
        {
          width: wide ? u(56) : h,
          height: h,
          borderRadius: h / 2,
          backgroundColor: filled ? P.green : P.button,
        },
      ]}
    >
      <Icon name={icon} pt={filled ? 26 : 22} color={filled ? '#FFFFFF' : P.ink} />
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: P.green }]}>
          <Text pt={11} weight="semibold" color="#FFFFFF">
            {badge}
          </Text>
        </View>
      )}
    </Touchable>
  );
}

export const lastOf = (c: SimChat) => c.messages[c.messages.length - 1];
export const whenOf = (m?: SimMessage) => (!m ? '' : m.day === 'Hoje' ? m.time : m.day);
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -u(4),
    right: -u(4),
    minWidth: u(18),
    height: u(18),
    borderRadius: u(9),
    paddingHorizontal: u(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
