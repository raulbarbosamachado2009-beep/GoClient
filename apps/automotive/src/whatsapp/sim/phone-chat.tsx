import { type ComponentRef, memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { useSystemInsets } from '../../layout/form-factor';
import { FONT, nativeDriver } from '../../theme';
import { appleEase } from '../../ui/motion';
import { Blur, Touchable } from '../../ui/primitives';
import type { SimChat, SimContact, SimMessage } from './data';
import { Avatar, Icon, type IconName, type Palette, Text, u } from './phone-kit';

/**
 * Conversa aberta do WhatsApp simulado (celular), copiada do WhatsApp do iPhone (prints e
 * vídeo do usuário, 27/11/2026):
 *
 * - Papel de parede com desenhos de linha bem apagados (desenho nosso, no espírito do
 *   WhatsApp), no escuro e no claro.
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
        doodle: 'rgba(255,255,255,0.075)',
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
        doodle: 'rgba(84,101,111,0.11)',
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

/* ---------------- Papel de parede ---------------- */

/** Desenhos de linha (24×24) espalhados num ladrilho que se repete. */
const DOODLES: { d: string; x: number; y: number; r: number; extra?: 'smile' | 'sun' | 'pin' }[] = [
  {
    d: 'M12 20s-7-4.4-9.3-8.7C1.3 8.2 3 5 6.4 5c2 0 3.4 1.1 5.6 3.1C14.2 6.1 15.6 5 17.6 5 21 5 22.7 8.2 21.3 11.3 19 15.6 12 20 12 20z',
    x: 10,
    y: 14,
    r: -12,
  },
  {
    d: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
    x: 78,
    y: 6,
    r: 14,
  },
  {
    d: 'M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm0 0V5l11-2v12m0 0a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
    x: 150,
    y: 22,
    r: -8,
  },
  { d: 'M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18z', x: 46, y: 62, r: 6 },
  { d: 'M4 5h16v11H9l-5 4z', x: 118, y: 66, r: -14 },
  { d: '', x: 186, y: 84, r: 0, extra: 'smile' },
  { d: 'M3 11l18-8-8 18-2-8z', x: 14, y: 112, r: 10 },
  { d: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2', x: 84, y: 120, r: 0 },
  { d: '', x: 154, y: 136, r: 0, extra: 'sun' },
  { d: 'M5 19C5 10 11 5 20 4c-1 9-6 15-15 15zM5 19l8-8', x: 40, y: 168, r: -6 },
  {
    d: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0',
    x: 116,
    y: 178,
    r: 8,
  },
  { d: '', x: 190, y: 186, r: -10, extra: 'pin' },
  { d: 'M4 8h4l2-2h4l2 2h4v11H4zM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', x: 186, y: 40, r: 12 },
  { d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', x: 6, y: 64, r: 0 },
];
const TILE = 224;

/** Ladrilho em `Pattern` (um desenho só, repetido pelo SVG: leve no aparelho e no navegador). */
export const Wallpaper = memo(function Wallpaper({ color, bg }: { color: string; bg: string }) {
  const t = u(TILE);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="wa-doodles" patternUnits="userSpaceOnUse" width={t} height={t}>
            <G scale={t / TILE}>
              {DOODLES.map((o, i) => (
                <G
                  // biome-ignore lint/suspicious/noArrayIndexKey: desenho fixo
                  key={i}
                  transform={`translate(${o.x} ${o.y}) rotate(${o.r} 12 12)`}
                  stroke={color}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  {o.d ? <Path d={o.d} /> : null}
                  {o.extra === 'smile' && (
                    <>
                      <Circle cx={12} cy={12} r={9} />
                      <Path d="M8 14c1.2 1.5 2.5 2 4 2s2.8-.5 4-2M9 9.5h.01M15 9.5h.01" />
                    </>
                  )}
                  {o.extra === 'sun' && (
                    <>
                      <Circle cx={12} cy={12} r={4} />
                      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
                    </>
                  )}
                  {o.extra === 'pin' && (
                    <>
                      <Path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z" />
                      <Circle cx={12} cy={10} r={2} />
                    </>
                  )}
                </G>
              ))}
            </G>
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wa-doodles)" />
      </Svg>
    </View>
  );
});

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
}) {
  const C = chatColors(P);
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
      <Wallpaper color={C.doodle} bg={C.wall} />
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
      />
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
}: {
  P: Palette;
  text: string;
  typing: boolean;
  blocked: boolean;
  bottom: number;
  onChange: (t: string) => void;
  onSend: () => void;
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
      <Pressable accessibilityRole="button" accessibilityLabel="Anexar" style={styles.side}>
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
        {(msg.kind === 'doc' || msg.kind === 'call') && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: u(10) }}>
            <View
              style={[
                styles.center,
                {
                  width: u(36),
                  height: u(36),
                  borderRadius: u(18),
                  backgroundColor: P.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                },
              ]}
            >
              <Icon
                name={msg.kind === 'call' ? 'call' : 'document-text'}
                pt={18}
                color={msg.kind === 'call' ? P.green : P.red}
              />
            </View>
            <View>
              <Text pt={16} color={P.ink}>
                {msg.kind === 'doc' ? `${msg.text}.pdf` : msg.text}
              </Text>
              <Text pt={13} color={P.sub}>
                {msg.kind === 'doc' ? 'PDF · 2 páginas' : 'Efetuada'}
              </Text>
            </View>
          </View>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            columnGap: u(8),
          }}
        >
          {msg.kind !== 'doc' && msg.kind !== 'call' && (
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
