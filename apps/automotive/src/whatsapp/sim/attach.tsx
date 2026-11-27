import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text as RNText, StyleSheet, View } from 'react-native';
import { FONT } from '../../theme';
import { appleEase } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import type { SimMessage } from './data';
import type { AttachKind } from './outbox';

/**
 * Peças comuns do celular e da multimídia para anexos do WhatsApp simulado: o mini menu do
 * "+" (Documento, Fotos, Áudio, Localização) e o corpo dos balões de anexo. `px` converte
 * pontos do iPhone para a tela de cada um (celular: u(); multimídia: o fator `k`).
 */
type IconName = ComponentProps<typeof Ionicons>['name'];
export type AttachColors = {
  dark: boolean;
  ink: string;
  sub: string;
  green: string;
  red: string;
};

const T = ({
  children,
  size,
  color,
  bold,
  lines,
}: {
  children: ReactNode;
  size: number;
  color: string;
  bold?: boolean;
  lines?: number;
}) => (
  <RNText
    numberOfLines={lines}
    style={{
      fontFamily: bold ? FONT.displaySemibold : FONT.displayRegular,
      fontSize: size,
      lineHeight: Math.round(size * 1.3),
      color,
    }}
  >
    {children}
  </RNText>
);

export const ATTACH_OPTIONS: { kind: AttachKind; icon: IconName; label: string }[] = [
  { kind: 'doc', icon: 'document-text-outline', label: 'Documento' },
  { kind: 'photo', icon: 'images-outline', label: 'Fotos' },
  { kind: 'audio', icon: 'headset-outline', label: 'Áudio' },
  { kind: 'location', icon: 'location-outline', label: 'Localização atual' },
];

/**
 * Mini menu do "+": cartão de vidro que cresce a partir do botão (canto de baixo à esquerda),
 * como os menus do iOS. Tocar fora fecha.
 */
export function AttachMenu({
  C,
  px,
  left,
  bottom,
  onPick,
  onClose,
}: {
  C: AttachColors;
  px: (pt: number) => number;
  left: number;
  bottom: number;
  onPick: (kind: AttachKind) => void;
  onClose: () => void;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 260,
      easing: appleEase,
      useNativeDriver: false,
    }).start();
  }, [v]);
  const R = px(22);
  const PAD = px(6);
  const close = (then?: () => void) =>
    Animated.timing(v, { toValue: 0, duration: 160, useNativeDriver: false }).start(() => {
      onClose();
      then?.();
    });
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Fechar anexos"
        onPress={() => close()}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left,
          bottom,
          width: px(250),
          padding: PAD,
          borderRadius: R,
          backgroundColor: C.dark ? '#252626' : '#FFFFFF',
          shadowColor: '#000',
          shadowOpacity: C.dark ? 0.5 : 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [px(16), 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
          ],
          transformOrigin: 'bottom left',
        }}
      >
        {ATTACH_OPTIONS.map((o) => (
          <Touchable
            key={o.kind}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            onPress={() => close(() => onPick(o.kind))}
            scaleTo={0.97}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(12),
              height: px(48),
              paddingHorizontal: px(10),
              borderRadius: R - PAD,
            }}
          >
            <Ionicons name={o.icon} size={px(22)} color={C.green} />
            <T size={px(17)} color={C.ink}>
              {o.label}
            </T>
          </Touchable>
        ))}
      </Animated.View>
    </View>
  );
}

/** Ondas do áudio (fixas, só desenho). */
const WAVE = [6, 10, 16, 9, 20, 14, 8, 18, 22, 12, 7, 15, 19, 10, 6, 13, 17, 9, 12, 7, 5, 9];

/** Corpo dos anexos com linha (documento, ligação, áudio e localização). */
export function AttachBody({
  msg,
  C,
  px,
}: {
  msg: SimMessage;
  C: AttachColors;
  px: (pt: number) => number;
}) {
  const soft = C.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  if (msg.kind === 'audio') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10), paddingTop: px(2) }}>
        <Ionicons name="play" size={px(26)} color={C.sub} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(2), height: px(24) }}>
          {WAVE.map((h, i) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: desenho fixo
              key={i}
              style={{
                width: px(2.5),
                height: px(h),
                borderRadius: px(2),
                backgroundColor: i < 3 ? C.green : C.sub,
                opacity: i < 3 ? 1 : 0.6,
              }}
            />
          ))}
        </View>
        <T size={px(13)} color={C.sub}>
          {msg.text}
        </T>
      </View>
    );
  }
  if (msg.kind === 'location') {
    return (
      <View style={{ gap: px(6) }}>
        <View
          style={[
            styles.center,
            {
              width: px(230),
              height: px(120),
              borderRadius: px(12),
              backgroundColor: C.dark ? '#26302F' : '#E4EDE6',
            },
          ]}
        >
          <Ionicons name="location" size={px(36)} color={C.red} />
        </View>
        <View>
          <T size={px(16)} color={C.ink} bold>
            {msg.text}
          </T>
          {!!msg.meta && (
            <T size={px(13)} color={C.sub} lines={1}>
              {msg.meta}
            </T>
          )}
        </View>
      </View>
    );
  }
  const call = msg.kind === 'call';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
      <View
        style={[
          styles.center,
          { width: px(36), height: px(36), borderRadius: px(18), backgroundColor: soft },
        ]}
      >
        <Ionicons
          name={call ? 'call' : 'document-text'}
          size={px(18)}
          color={call ? C.green : C.red}
        />
      </View>
      <View style={{ flexShrink: 1 }}>
        <T size={px(16)} color={C.ink} lines={1}>
          {call ? msg.text : `${msg.text}.pdf`}
        </T>
        <T size={px(13)} color={C.sub}>
          {msg.meta ?? (call ? (msg.out ? 'Efetuada' : 'Recebida') : 'PDF · 2 páginas')}
        </T>
      </View>
    </View>
  );
}

/** Anexos que mostram o texto como legenda (os outros já mostram o texto no corpo). */
export const showsText = (msg: SimMessage) => !!msg.text && (!msg.kind || msg.kind === 'photo');

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

/** Prévia da última mensagem na lista de conversas: ícone do anexo e o texto. */
export function previewOf(msg: SimMessage): { icon: IconName | null; text: string } {
  switch (msg.kind) {
    case 'photo':
      return { icon: 'camera', text: msg.text || 'Foto' };
    case 'doc':
      return { icon: 'document-text', text: msg.text };
    case 'call':
      return { icon: 'call', text: msg.text };
    case 'audio':
      return { icon: 'mic', text: msg.text };
    case 'location':
      return { icon: 'location', text: msg.text };
    default:
      return { icon: null, text: msg.text };
  }
}
