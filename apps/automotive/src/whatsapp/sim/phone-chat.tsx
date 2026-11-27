import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSystemInsets } from '../../layout/form-factor';
import { FONT, nativeDriver } from '../../theme';
import { appleEase } from '../../ui/motion';
import { Blur, Touchable } from '../../ui/primitives';
import { AttachBody, AttachMenu, showsText } from './attach';
import type { SimChat, SimContact, SimMessage } from './data';
import type { AttachKind } from './outbox';
import { Avatar, Icon, type IconName, type Palette, Text, u } from './phone-kit';
import { Wallpaper } from './wallpaper';

/**
 * Conversa aberta do WhatsApp simulado (celular), copiada do WhatsApp do iPhone (prints e
 * vídeo do usuário, 27/11/2026):
 *
 * - Papel de parede: as imagens enviadas pelo usuário (escura e clara), em `wallpaper.tsx`.
 * - Cabeçalho de vidro: botão redondo de voltar, foto, nome e "toque para mostrar os dados do
 *   contato"; à direita, a pílula com o telefone. As mensagens passam por baixo dele.
 * - Balões com "rabinho" na última mensagem de cada sequência, hora e confirmações dentro do
 *   balão, separador "Hoje" e a faixa "Mensagens não lidas: N".
 * - Rodapé: "+", campo com o ícone de figurinha, câmera e o microfone verde. Ao digitar, a
 *   câmera some e o microfone vira o botão de enviar.
 * - Enviar: o balão sobe do campo para o fim da conversa; o relógio vira ✓ e depois ✓✓.
 *
 * Sem chamada de vídeo (decisão anterior do usuário) e só dados fictícios.
 */

export type SendStatus = 'sending' | 'sent' | 'delivered' | 'read';

/** Cores da conversa, além da paleta: vidro, papel de parede e faixas. */
function chatColors(P: Palette) {
  return P.dark
    ? {
        wall: '#0B0B0B',
        glass: 'rgba(30,31,31,0.72)',
        glassLine: 'rgba(255,255,255,0.08)',
        head: 'rgba(11,11,11,0.55)',
        bar: '#0B0B0B',
        field: '#232424',
        pill: 'rgba(29,31,31,0.92)',
        pillInk: '#C9CDCF',
        band: 'rgba(255,255,255,0.06)',
        bandInk: '#C9CDCF',
        time: 'rgba(255,255,255,0.6)',
        timeOut: 'rgba(255,255,255,0.6)',
      }
    : {
        wall: '#EFEAE2',
        glass: 'rgba(255,255,255,0.78)',
        glassLine: 'rgba(0,0,0,0.06)',
        head: 'rgba(246,246,246,0.6)',
        bar: '#F6F6F6',
        field: '#FFFFFF',
        pill: 'rgba(255,255,255,0.92)',
        pillInk: '#54656F',
        band: 'rgba(255,255,255,0.55)',
        bandInk: '#54656F',
        time: 'rgba(0,0,0,0.45)',
        timeOut: 'rgba(0,0,0,0.45)',
      };
}

/* ---------------- Vidro ---------------- */

/** Botão redondo (ou pílula) de vidro do iOS 26 sobre a conversa. */
export function Glass({
  P,
  children,
  label,
  onPress,
  width,
}: {
  P: Palette;
  children: React.ReactNode;
  label: string;
  onPress?: () => void;
  width?: number;
}) {
  const C = chatColors(P);
  const h = u(44);
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.9}
      style={{
        width: width ?? h,
        height: h,
        borderRadius: h / 2,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: C.glassLine,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: u(22),
      }}
    >
      <Blur radius={24} tint={P.dark ? 'dark' : 'light'} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.glass }]} />
      {children}
    </Touchable>
  );
}

/* ---------------- Conversa ---------------- */

export function ChatScreen({
  P,
  contact,
  chat,
  blocked,
  unreadFrom,
  statusOf,
  onBack,
  onProfile,
  onCall,
  onSend,
  onAttach,
}: {
  P: Palette;
  contact: SimContact;
  chat: SimChat;
  blocked: boolean;
  /** Quantas mensagens estavam por ler ao abrir (faixa "Mensagens não lidas: N"). */
  unreadFrom: number;
  /** Situação das mensagens enviadas agora (relógio → ✓ → ✓✓). */
  statusOf: (id: string) => SendStatus;
  onBack: () => void;
  onProfile: () => void;
  onCall: () => void;
  onSend: (text: string) => void;
  /** Opção do mini menu do "+" (manda um anexo de exemplo). */
  onAttach: (kind: AttachKind) => void;
}) {
  const C = chatColors(P);
  const [attach, setAttach] = useState(false);
  const insets = useSystemInsets();
  const composerBottom = Math.max(insets.bottom, u(20)) + u(6);
  const [text, setText] = useState('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const count = chat.messages.length;
  const opened = useRef(false);
  // Abre no fim da conversa; uma mensagem nova rola com animação, como no WhatsApp.
  useEffect(() => {
    const animated = opened.current;
    opened.current = true;
    if (count >= 0) requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated }));
  }, [count]);
  // As mensagens que já existiam ao abrir não animam; só as que chegam depois.
  const known = useRef(new Set(chat.messages.map((m) => m.id))).current;

  const send = () => {
    const t = text.trim();
    if (!t || blocked) return;
    onSend(t);
    setText('');
  };
  const typing = text.trim().length > 0;
  const headH = insets.top + u(60);
  const firstUnread = unreadFrom > 0 ? Math.max(0, count - unreadFrom) : -1;

  return (
    <View style={{ flex: 1, backgroundColor: C.wall }}>
      <Wallpaper dark={P.dark} />
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headH + u(6),
          paddingBottom: composerBottom + u(64),
          paddingHorizontal: u(10),
        }}
        showsVerticalScrollIndicator={false}
      >
        {chat.messages.map((m, i) => {
          const prev = chat.messages[i - 1];
          const next = chat.messages[i + 1];
          const newDay = !prev || prev.day !== m.day;
          const band = i === firstUnread;
          // iOS: o rabinho fica na última mensagem de cada sequência do mesmo lado.
          const tail = !next || next.out !== m.out || next.day !== m.day || i + 1 === firstUnread;
          const first = newDay || band || !prev || prev.out !== m.out;
          return (
            <View key={m.id}>
              {newDay && (
                <View style={[styles.day, { backgroundColor: C.pill }]}>
                  <Text pt={12} weight="semibold" color={C.pillInk}>
                    {m.day}
                  </Text>
                </View>
              )}
              {band && (
                <View style={[styles.band, { backgroundColor: C.band }]}>
                  <Text pt={14} weight="semibold" color={C.bandInk}>
                    {`Mensagens não lidas: ${unreadFrom}`}
                  </Text>
                </View>
              )}
              <Bubble
                P={P}
                msg={m}
                tail={tail}
                first={first}
                group={!!contact.members}
                status={m.out ? (known.has(m.id) ? 'read' : statusOf(m.id)) : undefined}
                enter={!known.has(m.id)}
              />
            </View>
          );
        })}
        {blocked && (
          <View style={[styles.day, { backgroundColor: C.pill, marginTop: u(10) }]}>
            <Text pt={13} color={C.pillInk}>
              Você bloqueou este contato.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Cabeçalho de vidro (as mensagens passam por baixo). */}
      <View style={[styles.head, { height: headH, paddingTop: insets.top }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Blur radius={20} tint={P.dark ? 'dark' : 'light'} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.head }]} />
        </View>
        <Glass P={P} label="Voltar" onPress={onBack}>
          <Icon name="chevron-back" pt={24} color={P.ink} />
        </Glass>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dados do contato"
          onPress={onProfile}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: u(9) }}
        >
          <Avatar P={P} pt={36} group={!!contact.members} />
          <View style={{ flex: 1 }}>
            <Text pt={17} weight="semibold" color={P.ink} lines={1}>
              {contact.name}
            </Text>
            <Text pt={12} color={P.sub} lines={1}>
              {contact.members
                ? contact.members.join(', ')
                : 'toque para mostrar os dados do contato'}
            </Text>
          </View>
        </Pressable>
        <Glass P={P} label="Ligação de voz" onPress={onCall} width={u(60)}>
          <Icon name="call-outline" pt={23} color={P.ink} />
        </Glass>
      </View>

      <Composer
        P={P}
        text={text}
        typing={typing}
        blocked={blocked}
        bottom={composerBottom}
        onChange={setText}
        onSend={send}
        onAttach={() => !blocked && setAttach(true)}
      />
      {attach && (
        <AttachMenu
          C={P}
          px={u}
          left={u(10)}
          bottom={composerBottom + u(52)}
          onPick={onAttach}
          onClose={() => setAttach(false)}
        />
      )}
    </View>
  );
}

/* ---------------- Rodapé ---------------- */

function Composer({
  P,
  text,
  typing,
  blocked,
  bottom,
  onChange,
  onSend,
  onAttach,
}: {
  P: Palette;
  text: string;
  typing: boolean;
  blocked: boolean;
  bottom: number;
  onChange: (t: string) => void;
  onSend: () => void;
  onAttach: () => void;
}) {
  const C = chatColors(P);
  // 0 = parado (câmera + microfone); 1 = digitando (sem câmera, botão de enviar).
  const v = useRef(new Animated.Value(typing ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, {
      toValue: typing ? 1 : 0,
      damping: 20,
      stiffness: 320,
      useNativeDriver: false,
    }).start();
  }, [typing, v]);
  const cam = u(40);
  return (
    <View style={[styles.composer, { paddingBottom: bottom, backgroundColor: C.bar }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Anexar"
        onPress={onAttach}
        style={styles.side}
      >
        <Icon name="add" pt={30} color={P.ink} />
      </Pressable>
      <View style={[styles.field, { backgroundColor: C.field }]}>
        <TextInput
          value={text}
          onChangeText={onChange}
          onSubmitEditing={onSend}
          editable={!blocked}
          blurOnSubmit={false}
          selectionColor={P.green}
          accessibilityLabel="Mensagem"
          style={[styles.input, { color: P.ink }]}
        />
        <Sticker color={P.ink} />
      </View>
      {/* A câmera recolhe ao digitar (a largura anda junto, o campo cresce). */}
      <Animated.View
        style={{
          width: v.interpolate({ inputRange: [0, 1], outputRange: [cam, 0] }),
          opacity: v.interpolate({
            inputRange: [0, 0.5],
            outputRange: [1, 0],
            extrapolate: 'clamp',
          }),
          overflow: 'hidden',
          alignItems: 'center',
        }}
      >
        <Icon name="camera-outline" pt={26} color={P.ink} />
      </Animated.View>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={typing ? 'Enviar' : 'Mensagem de voz'}
        onPress={typing ? onSend : undefined}
        scaleTo={0.88}
        style={[styles.send, { backgroundColor: P.green }]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.center,
            {
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }],
            },
          ]}
        >
          <Icon name="mic" pt={20} color="#FFFFFF" />
        </Animated.View>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.center,
            {
              opacity: v,
              transform: [
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) },
              ],
            },
          ]}
        >
          <Icon name="send" pt={17} color="#FFFFFF" />
        </Animated.View>
      </Touchable>
    </View>
  );
}

/** Ícone de figurinha do campo (quadrado arredondado com a ponta dobrada). */
function Sticker({ color }: { color: string }) {
  const s = u(22);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" accessibilityLabel="Figurinhas">
      <Path
        d="M8 3h7.5L21 8.5V16a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zM15.5 3v1.5a4 4 0 0 0 4 4H21"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/* ---------------- Balão ---------------- */

/** Rabinho do balão (lado de fora, embaixo), desenhado para emendar no canto. */
function Tail({ color, out }: { color: string; out: boolean }) {
  const w = u(9);
  const h = u(14);
  return (
    <Svg
      width={w}
      height={h}
      viewBox="0 0 9 14"
      style={[styles.tail, out ? { right: -w + 1 } : { left: -w + 1, transform: [{ scaleX: -1 }] }]}
    >
      <Path d="M0 0 C0 7 2.5 11.5 9 14 L0 14 Z" fill={color} />
    </Svg>
  );
}

const STATUS_ICON: Record<SendStatus, IconName> = {
  sending: 'time-outline',
  sent: 'checkmark',
  delivered: 'checkmark-done',
  read: 'checkmark-done',
};

function Bubble({
  P,
  msg,
  tail,
  first,
  group,
  status,
  enter,
}: {
  P: Palette;
  msg: SimMessage;
  tail: boolean;
  first: boolean;
  group: boolean;
  status?: SendStatus;
  /** Mensagem que acabou de ser enviada/chegar: sobe do rodapé. */
  enter: boolean;
}) {
  const C = chatColors(P);
  const R = u(18);
  const bg = msg.out ? P.out : P.in;
  const v = useRef(new Animated.Value(enter ? 0 : 1)).current;
  useEffect(() => {
    if (!enter) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 300,
      easing: appleEase,
      useNativeDriver: nativeDriver,
    }).start();
  }, [enter, v]);
  const small = u(5);
  return (
    <Animated.View
      style={{
        alignItems: msg.out ? 'flex-end' : 'flex-start',
        marginTop: first ? u(8) : u(2),
        paddingLeft: msg.out ? u(48) : u(6),
        paddingRight: msg.out ? u(6) : u(48),
        opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [u(44), 0] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
        ],
      }}
    >
      <View
        style={{
          backgroundColor: bg,
          borderRadius: R,
          borderBottomRightRadius: tail && msg.out ? small : R,
          borderBottomLeftRadius: tail && !msg.out ? small : R,
          paddingLeft: u(12),
          paddingRight: u(10),
          paddingTop: u(6),
          paddingBottom: u(6),
          gap: u(4),
          shadowColor: '#000',
          shadowOpacity: P.dark ? 0 : 0.08,
          shadowRadius: 0.5,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        {tail && <Tail color={bg} out={msg.out} />}
        {group && !msg.out && msg.from && first && (
          <Text pt={14} weight="semibold" color={P.groupInk}>
            {msg.from}
          </Text>
        )}
        {msg.kind === 'photo' && (
          <View
            style={[
              styles.center,
              {
                width: u(230),
                height: u(150),
                borderRadius: u(12),
                backgroundColor: P.dark ? '#2A2B2B' : '#E9EDEF',
              },
            ]}
          >
            <Icon name="image-outline" pt={40} color={P.sub} />
          </View>
        )}
        {!!msg.kind && msg.kind !== 'photo' && <AttachBody msg={msg} C={P} px={u} />}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            columnGap: u(8),
          }}
        >
          {showsText(msg) && (
            <Text pt={17} color={P.ink} style={{ flexShrink: 1 }}>
              {msg.text}
            </Text>
          )}
          <View style={styles.meta}>
            <Text pt={11} color={msg.out ? C.timeOut : C.time}>
              {msg.time}
            </Text>
            {status && (
              <Icon
                name={STATUS_ICON[status]}
                pt={status === 'sending' ? 12 : 15}
                color={status === 'read' ? P.tick : msg.out ? C.timeOut : C.time}
              />
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/** Pausa entre os estados de uma mensagem enviada (simulado): relógio → ✓ → ✓✓. */
export const STATUS_STEPS: { status: SendStatus; after: number }[] = [
  { status: 'sent', after: 650 },
  { status: 'delivered', after: 1500 },
];

/** Entrada/saída de telas do WhatsApp (empilhar/voltar do iPhone). */
export const pushEase = Easing.bezier(0.2, 0.9, 0.25, 1);

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  day: {
    alignSelf: 'center',
    paddingHorizontal: u(10),
    paddingVertical: u(4),
    borderRadius: u(10),
    marginTop: u(10),
    marginBottom: u(2),
  },
  band: {
    marginHorizontal: -u(10),
    marginTop: u(10),
    paddingVertical: u(6),
    alignItems: 'center',
  },
  head: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: u(10),
    paddingHorizontal: u(14),
    overflow: 'hidden',
  },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: u(10),
    paddingHorizontal: u(12),
    paddingTop: u(7),
  },
  side: { width: u(32), alignItems: 'center' },
  field: {
    flex: 1,
    minWidth: 0,
    minHeight: u(36),
    borderRadius: u(18),
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: u(14),
    paddingRight: u(10),
    gap: u(8),
  },
  input: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    fontFamily: FONT.displayRegular,
    fontSize: u(17),
    paddingVertical: u(6),
    // Web: sem o contorno azul do navegador.
    outlineStyle: 'none',
  } as object,
  send: {
    width: u(36),
    height: u(36),
    borderRadius: u(18),
    overflow: 'hidden',
  },
  tail: { position: 'absolute', bottom: 0 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    marginBottom: -u(2),
  },
});
