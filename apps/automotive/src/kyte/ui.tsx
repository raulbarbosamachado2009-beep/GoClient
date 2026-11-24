import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Image,
  Text as RNText,
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { usePhone, useSystemInsets, useTabBarSpace } from '../layout/form-factor';
import { FONT } from '../theme';
import { Touchable } from '../ui/primitives';
import { Spinner } from '../ui/spinner';

/**
 * Peças visuais das telas do Kyte no GoClient, no estilo do próprio Kyte (prints enviados):
 * fundo cinza-claro, cartões brancos, verde do Kyte, cabeçalho azul-ardósia escuro.
 */
export const KY = {
  green: '#2DD1A8',
  greenInk: '#14A884',
  navy: '#363F4D',
  night: '#1C2430',
  ink: '#2B3240',
  sub: '#7A8494',
  faint: '#AAB1BC',
  bg: '#EEF1F5',
  card: '#FFFFFF',
  line: '#E3E7EC',
  chip: '#F4F6F8',
  red: '#F0525A',
  wa: '#25D366',
};

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Tamanhos de letra e de linha: celular (720 de largura) e multimídia (1600×900). */
export function useKySize() {
  const phone = usePhone();
  return phone
    ? {
        phone,
        title: 34,
        big: 30,
        body: 22,
        row: 23,
        sub: 18,
        small: 16,
        icon: 30,
        rowH: 92,
        pad: 22,
        radius: 16,
      }
    : {
        phone,
        title: 44,
        big: 34,
        body: 26,
        row: 29,
        sub: 22,
        small: 19,
        icon: 34,
        rowH: 78,
        pad: 24,
        radius: 18,
      };
}

export function Text({
  children,
  size,
  weight = 'regular',
  color = KY.ink,
  style,
  lines,
}: {
  children: ReactNode;
  size: number;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  style?: StyleProp<TextStyle>;
  lines?: number;
}) {
  const family =
    weight === 'bold'
      ? FONT.displayBold
      : weight === 'semibold'
        ? FONT.displaySemibold
        : weight === 'medium'
          ? FONT.displayMedium
          : FONT.displayRegular;
  return (
    <RNText
      numberOfLines={lines}
      style={[{ fontFamily: family, fontSize: size, lineHeight: size * 1.22, color }, style]}
    >
      {children}
    </RNText>
  );
}

export function KIcon({
  name,
  size,
  color = KY.ink,
}: {
  name: IconName;
  size: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Cabeçalho: ☰ (menu das seções) | título, e ações à direita. */
export function Header({
  title,
  onMenu,
  onBack,
  right,
  dark = false,
}: {
  title: string;
  onMenu?: () => void;
  onBack?: () => void;
  right?: ReactNode;
  dark?: boolean;
}) {
  const s = useKySize();
  // Celular: o cabeçalho começa embaixo da câmera (a tela vai de ponta a ponta).
  const top = useSystemInsets().top;
  const ink = dark ? '#FFFFFF' : KY.ink;
  return (
    <View
      style={[
        styles.header,
        {
          paddingHorizontal: s.pad,
          height: 96 + (s.phone ? top : 0),
          paddingTop: s.phone ? top : 0,
        },
      ]}
    >
      {onBack ? (
        <IconButton icon="chevron-back" onPress={onBack} color={ink} label="Voltar" />
      ) : onMenu ? (
        <IconButton icon="menu" onPress={onMenu} color={ink} label="Menu do Kyte" />
      ) : null}
      {(onMenu || onBack) && (
        <View
          style={[styles.divider, { backgroundColor: dark ? 'rgba(255,255,255,.25)' : KY.line }]}
        />
      )}
      <Text size={s.title} weight="semibold" color={ink} lines={1} style={{ flex: 1 }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{right}</View>
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  color = KY.ink,
  label,
  size,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  label: string;
  size?: number;
}) {
  const s = useKySize();
  const box = s.phone ? 64 : 68;
  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={label}
      style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}
    >
      <KIcon name={icon} size={size ?? s.icon + 6} color={color} />
    </Touchable>
  );
}

/** Botão verde quadrado (o "+" do Kyte). */
export function PlusButton({ onPress, label }: { onPress: () => void; label: string }) {
  const s = useKySize();
  const box = s.phone ? 72 : 76;
  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        width: box,
        height: box,
        borderRadius: 16,
        backgroundColor: KY.green,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <KIcon name="add" size={s.icon + 14} color="#FFFFFF" />
    </Touchable>
  );
}

export function GreenButton({
  label,
  onPress,
  icon,
  style,
  height,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const s = useKySize();
  return (
    <Touchable
      onPress={onPress}
      style={[
        {
          height: height ?? (s.phone ? 88 : 96),
          borderRadius: 18,
          backgroundColor: KY.green,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 12,
        },
        style,
      ]}
    >
      {icon && <KIcon name={icon} size={s.icon} color="#FFFFFF" />}
      <Text size={s.big} weight="semibold" color="#FFFFFF">
        {label}
      </Text>
    </Touchable>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useKySize();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          height: s.phone ? 76 : 70,
          borderRadius: 999,
          backgroundColor: '#E4E8ED',
          paddingHorizontal: 24,
        },
        style,
      ]}
    >
      <KIcon name="search" size={s.icon} color={KY.ink} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={KY.faint}
        autoCorrect={false}
        style={{
          flex: 1,
          minWidth: 0,
          width: 0,
          fontFamily: FONT.textRegular,
          fontSize: s.body,
          color: KY.ink,
          paddingVertical: 0,
        }}
      />
      {value ? (
        <Touchable onPress={() => onChange('')} accessibilityLabel="Limpar busca">
          <KIcon name="close-circle" size={s.icon - 4} color={KY.faint} />
        </Touchable>
      ) : null}
    </View>
  );
}

/** Abas com sublinhado verde (ITENS / ESTOQUE ...). */
export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: K; label: string; icon: IconName }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const s = useKySize();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: KY.card,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Touchable
            key={t.key}
            onPress={() => onChange(t.key)}
            scaleTo={0.98}
            style={{
              flex: 1,
              height: s.phone ? 76 : 72,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              borderBottomWidth: 4,
              borderBottomColor: on ? KY.green : 'transparent',
              backgroundColor: on ? KY.card : '#F6F8FA',
            }}
          >
            <KIcon name={t.icon} size={s.icon - 2} color={on ? KY.greenInk : KY.sub} />
            <Text size={s.sub} weight="semibold" color={on ? KY.greenInk : KY.sub}>
              {t.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

/** Miniatura do produto: a foto, ou o começo do nome num quadrado escuro (como no Kyte). */
export function Thumb({ image, name, size }: { image: string; name: string; size: number }) {
  if (image)
    return (
      <Image
        source={{ uri: image }}
        style={{ width: size, height: size, borderRadius: 10, backgroundColor: KY.line }}
      />
    );
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: '#525D6E',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Text size={size * 0.22} color="#FFFFFF" lines={1}>
        {name.split(' ')[0]?.slice(0, 7)}
      </Text>
    </View>
  );
}

/** Barra escura do rodapé (totais). */
export function FooterBar({ children }: { children: ReactNode }) {
  const s = useKySize();
  // Celular: a barra desce até a borda, por trás da barra de abas flutuante.
  const tab = useTabBarSpace();
  return (
    <View
      style={{
        backgroundColor: KY.navy,
        borderRadius: s.phone ? 0 : 16,
        marginHorizontal: s.phone ? 0 : s.pad,
        marginBottom: s.phone ? 0 : 18,
        paddingHorizontal: s.pad + 8,
        paddingTop: s.phone ? 22 : 18,
        paddingBottom: s.phone ? tab + 10 : 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {children}
    </View>
  );
}

/** Carregando / erro / vazio, com o caminho de saída. */
export function State({
  loading,
  error,
  empty,
  onRetry,
  onOpenKyte,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: string;
  onRetry?: () => void;
  onOpenKyte?: () => void;
}) {
  const s = useKySize();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40, gap: 18, flex: 1 }}>
      {loading ? (
        <>
          <Spinner color={KY.green} />
          <Text size={s.body} color={KY.sub}>
            Lendo os dados do Kyte…
          </Text>
        </>
      ) : (
        <>
          <Text size={s.body} color={KY.sub} style={{ textAlign: 'center', maxWidth: 760 }}>
            {error ?? empty}
          </Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {onRetry && <SmallButton label="Tentar de novo" icon="refresh" onPress={onRetry} />}
            {onOpenKyte && (
              <SmallButton label="Abrir no Kyte" icon="open-outline" onPress={onOpenKyte} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

export function SmallButton({
  label,
  icon,
  onPress,
  tone = 'light',
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: 'light' | 'green' | 'dark' | 'danger';
}) {
  const s = useKySize();
  const bg = { light: KY.card, green: KY.green, dark: KY.navy, danger: KY.red }[tone];
  const ink = tone === 'light' ? KY.ink : '#FFFFFF';
  return (
    <Touchable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
        height: s.phone ? 68 : 64,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: tone === 'light' ? 1 : 0,
        borderColor: KY.line,
      }}
    >
      {icon && <KIcon name={icon} size={s.icon - 6} color={ink} />}
      <Text size={s.sub} weight="semibold" color={ink}>
        {label}
      </Text>
    </Touchable>
  );
}

export const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  divider: { width: 2, height: 52, marginRight: 6 },
});
