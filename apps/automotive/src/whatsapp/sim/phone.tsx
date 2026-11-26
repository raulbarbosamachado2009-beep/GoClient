import Ionicons from '@expo/vector-icons/Ionicons';
import {
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Pressable,
  Text as RNText,
  ScrollView,
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';
import { PHONE_SCROLL_END, useSystemInsets, useTabBarSpace } from '../../layout/form-factor';
import { FONT, useColors } from '../../theme';
import { Appear } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import { startCall } from './call';
import {
  CALLS,
  CHATS,
  CONTACTS,
  type SimCall,
  type SimChat,
  type SimContact,
  type SimMessage,
} from './data';

/**
 * WhatsApp **simulado** do celular em pé (pedido do usuário em 26/11/2026), no desenho do
 * WhatsApp do iPhone: Conversas, conversa aberta, dados do contato (com rolagem), Ligações
 * e a ligação em andamento (tela cheia, em `call-screen.tsx`).
 *
 * Tela cheia: o fundo vai até as bordas e passa por trás da barra de abas do app; só o
 * conteúdo se afasta dela. Como a barra de abas do app fica embaixo, o botão redondo do
 * canto esquerdo (os "três pontinhos" do WhatsApp) alterna Conversas ↔ Ligações, como na
 * multimídia. Sem chamada de vídeo e só dados fictícios.
 */
type IconName = ComponentProps<typeof Ionicons>['name'];

/** Pontos do iPhone (largura 393) → unidades da tela de referência do celular (720). */
const K = 720 / 393;
const u = (pt: number) => Math.round(pt * K);

function usePalette() {
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
type Palette = ReturnType<typeof usePalette>;
/** Fundo agrupado (dados do contato), como nos Ajustes do iPhone. */
const grouped = (P: Palette) => (P.dark ? '#0B0B0B' : '#F2F2F7');

const FAMILY = {
  regular: FONT.displayRegular,
  medium: FONT.displayMedium,
  semibold: FONT.displaySemibold,
  bold: FONT.displayBold,
} as const;

function Text({
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

function Icon({ name, pt, color }: { name: IconName; pt: number; color: string }) {
  return <Ionicons name={name} size={u(pt)} color={color} />;
}

function Avatar({ P, pt, group }: { P: Palette; pt: number; group?: boolean }) {
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
function Round({
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

const lastOf = (c: SimChat) => c.messages[c.messages.length - 1];
const whenOf = (m?: SimMessage) => (!m ? '' : m.day === 'Hoje' ? m.time : m.day);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Screen =
  | { kind: 'root' }
  | { kind: 'chat'; id: string }
  | { kind: 'profile'; id: string; from: 'chat' | 'calls' }
  | { kind: 'new'; mode: 'chat' | 'call' };

export function PhoneWhatsApp() {
  const P = usePalette();
  const [tab, setTab] = useState<'chats' | 'calls'>('chats');
  const [stack, setStack] = useState<Screen[]>([{ kind: 'root' }]);
  const [back, setBack] = useState(false);
  const [contacts, setContacts] = useState<SimContact[]>(CONTACTS);
  const [chats, setChats] = useState<SimChat[]>(CHATS);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const top = stack[stack.length - 1] as Screen;

  const contactOf = (id: string) => contacts.find((c) => c.id === id);
  const push = (s: Screen) => {
    setBack(false);
    setStack((cur) => [...cur, s]);
  };
  const pop = () => {
    setBack(true);
    setStack((cur) => (cur.length > 1 ? cur.slice(0, -1) : cur));
  };

  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const append = (contactId: string, msg: SimMessage) =>
    setChats((cur) => {
      const had = cur.find((c) => c.id === contactId);
      const base = had ?? { id: contactId, contact: contactId, unread: 0, messages: [] };
      return [
        { ...base, unread: 0, messages: [...base.messages, msg] },
        ...cur.filter((c) => c.id !== contactId),
      ];
    });

  const openChat = (id: string) => {
    setChats((cur) => cur.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    push({ kind: 'chat', id });
  };
  const ring = (contactId: string) => {
    const who = contactOf(contactId);
    if (!who) return;
    startCall({ contact: who.id, name: who.name, group: !!who.members });
    append(contactId, {
      id: `c${Date.now()}`,
      out: true,
      text: 'Ligação de voz',
      time: now(),
      day: 'Hoje',
      kind: 'call',
    });
  };

  let screen: ReactNode;
  if (top.kind === 'new') {
    const mode = top.mode;
    screen = (
      <NewScreen
        P={P}
        mode={mode}
        contacts={contacts}
        onBack={pop}
        onPick={(id) => {
          if (mode === 'call') {
            pop();
            ring(id);
          } else {
            setStack([{ kind: 'root' }]);
            openChat(id);
          }
        }}
      />
    );
  } else if (top.kind === 'chat') {
    const contact = contactOf(top.id) as SimContact;
    const chat = chats.find((c) => c.id === top.id) ?? {
      id: top.id,
      contact: top.id,
      unread: 0,
      messages: [],
    };
    screen = (
      <ChatScreen
        P={P}
        contact={contact}
        chat={chat}
        blocked={blocked.has(top.id)}
        onBack={pop}
        onProfile={() => push({ kind: 'profile', id: top.id, from: 'chat' })}
        onCall={() => ring(top.id)}
        onSend={(text) =>
          append(top.id, { id: `n${Date.now()}`, out: true, text, time: now(), day: 'Hoje' })
        }
      />
    );
  } else if (top.kind === 'profile') {
    const contact = contactOf(top.id) as SimContact;
    const chat = chats.find((c) => c.id === top.id);
    screen = (
      <ProfileScreen
        P={P}
        contact={contact}
        chat={chat}
        blocked={blocked.has(top.id)}
        onBack={pop}
        onCall={() => ring(top.id)}
        onMessage={() => {
          if (top.from === 'chat') return pop();
          setStack([{ kind: 'root' }]);
          openChat(top.id);
        }}
        onFavorite={() =>
          setContacts((cur) =>
            cur.map((c) => (c.id === top.id ? { ...c, favorite: !c.favorite } : c)),
          )
        }
        onClear={() =>
          setChats((cur) => cur.map((c) => (c.id === top.id ? { ...c, messages: [] } : c)))
        }
        onBlock={() =>
          setBlocked((cur) => {
            const next = new Set(cur);
            if (next.has(top.id)) next.delete(top.id);
            else next.add(top.id);
            return next;
          })
        }
      />
    );
  } else if (tab === 'calls') {
    screen = (
      <CallsScreen
        P={P}
        contacts={contacts}
        contactOf={contactOf}
        unread={chats.reduce((n, c) => n + (c.unread ? 1 : 0), 0)}
        onToggle={() => setTab('chats')}
        onNew={() => push({ kind: 'new', mode: 'call' })}
        onCall={ring}
        onInfo={(id) => push({ kind: 'profile', id, from: 'calls' })}
      />
    );
  } else {
    screen = (
      <ChatsScreen
        P={P}
        chats={chats}
        contacts={contacts}
        contactOf={contactOf}
        onToggle={() => setTab('calls')}
        onNew={() => push({ kind: 'new', mode: 'chat' })}
        onOpen={openChat}
      />
    );
  }

  const key =
    top.kind === 'root'
      ? `root-${tab}`
      : top.kind === 'new'
        ? `new-${top.mode}`
        : `${top.kind}-${top.id}`;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: P.bg }]}>
      {/* Entrar numa tela desliza da direita; voltar, da esquerda (como no iPhone). */}
      <Appear
        key={key}
        axis="x"
        distance={top.kind === 'root' && !back ? 0 : back ? -u(40) : u(60)}
        duration={320}
        style={{ flex: 1 }}
      >
        {screen}
      </Appear>
    </View>
  );
}

/* ---------------- Conversas ---------------- */

type Filter = 'all' | 'unread' | 'fav' | 'groups';

function ChatsScreen({
  P,
  chats,
  contacts,
  contactOf,
  onToggle,
  onNew,
  onOpen,
}: {
  P: Palette;
  chats: SimChat[];
  contacts: SimContact[];
  contactOf: (id: string) => SimContact | undefined;
  onToggle: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  const insets = useSystemInsets();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const unread = chats.filter((c) => c.unread).length;
  const groups = chats.filter((c) => contactOf(c.contact)?.members).length;
  const list = chats.filter((c) => {
    const who = contactOf(c.contact);
    if (!who) return false;
    if (q && !norm(who.name).includes(norm(q))) return false;
    if (filter === 'unread') return !!c.unread;
    if (filter === 'fav') return !!contacts.find((k) => k.id === c.contact)?.favorite;
    if (filter === 'groups') return !!who.members;
    return true;
  });
  const chips: { k: Filter; label: string; n?: number }[] = [
    { k: 'all', label: 'Todas' },
    { k: 'unread', label: 'Não lidas', n: unread },
    { k: 'fav', label: 'Favoritos' },
    { k: 'groups', label: 'Grupos', n: groups },
  ];
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + u(8), paddingBottom: PHONE_SCROLL_END }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.bar, { paddingHorizontal: u(16) }]}>
        <Round P={P} icon="call-outline" label="Ir para Ligações" onPress={onToggle} />
        <View style={{ flex: 1 }} />
        <Round P={P} icon="add" label="Nova conversa" filled onPress={onNew} />
      </View>
      <Text pt={34} weight="bold" color={P.ink} style={styles.large}>
        Conversas
      </Text>
      <Search P={P} value={q} onChange={setQ} placeholder="Pesquisar" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ gap: u(8), paddingHorizontal: u(16), paddingVertical: u(12) }}
      >
        {chips.map((c) => {
          const on = filter === c.k;
          return (
            <Touchable
              key={c.k}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              onPress={() => setFilter(c.k)}
              scaleTo={0.94}
              style={{
                height: u(34),
                paddingHorizontal: u(13),
                borderRadius: u(17),
                borderWidth: 1,
                borderColor: on ? P.chipOn : P.chipLine,
                backgroundColor: on ? P.chipOn : P.chip,
                justifyContent: 'center',
              }}
            >
              <Text pt={15} weight="medium" color={on ? P.chipOnInk : P.sub}>
                {c.label}
                {c.n ? ` ${c.n}` : ''}
              </Text>
            </Touchable>
          );
        })}
      </ScrollView>
      {list.map((c, i) => {
        const who = contactOf(c.contact) as SimContact;
        const last = lastOf(c);
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={who.name}
            onPress={() => onOpen(c.id)}
            style={({ pressed }) => [
              styles.row,
              { paddingLeft: u(16), backgroundColor: pressed ? P.press : 'transparent' },
            ]}
          >
            <Avatar P={P} pt={56} group={!!who.members} />
            <View
              style={{
                flex: 1,
                marginLeft: u(12),
                paddingRight: u(16),
                paddingVertical: u(12),
                borderBottomWidth: i < list.length - 1 ? 1 : 0,
                borderBottomColor: P.line,
                gap: u(2),
              }}
            >
              <View style={styles.between}>
                <Text pt={17} weight="semibold" color={P.ink} lines={1} style={{ flex: 1 }}>
                  {who.name}
                </Text>
                <Text pt={14} color={c.unread ? P.greenInk : P.sub}>
                  {whenOf(last)}
                </Text>
              </View>
              <View style={styles.between}>
                <LastLine P={P} msg={last} />
                {!!c.unread && (
                  <View style={[styles.count, { backgroundColor: P.green }]}>
                    <Text pt={13} weight="semibold" color="#FFFFFF">
                      {c.unread}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
      {list.length === 0 && (
        <Text pt={15} color={P.sub} style={{ textAlign: 'center', marginTop: u(40) }}>
          Nenhuma conversa aqui.
        </Text>
      )}
    </ScrollView>
  );
}

function LastLine({ P, msg }: { P: Palette; msg?: SimMessage }) {
  if (!msg) return <View style={{ flex: 1 }} />;
  const icon: IconName | null =
    msg.kind === 'photo'
      ? 'camera'
      : msg.kind === 'doc'
        ? 'document-text'
        : msg.kind === 'call'
          ? 'call'
          : null;
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: u(4) }}>
      {msg.out && <Icon name="checkmark-done" pt={17} color={P.tick} />}
      {icon && <Icon name={icon} pt={15} color={P.sub} />}
      <Text pt={15} color={P.sub} lines={1} style={{ flex: 1 }}>
        {msg.from ? `${msg.from}: ` : ''}
        {msg.text}
      </Text>
    </View>
  );
}

function Search({
  P,
  value,
  onChange,
  placeholder,
}: {
  P: Palette;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View
      style={{
        marginHorizontal: u(16),
        height: u(40),
        borderRadius: u(20),
        backgroundColor: P.field,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: u(12),
        gap: u(8),
      }}
    >
      <Icon name="search" pt={18} color={P.sub} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={P.sub}
        style={[styles.input, { flex: 1, fontSize: u(17), color: P.ink }]}
      />
    </View>
  );
}

/* ---------------- Conversa aberta ---------------- */

function ChatScreen({
  P,
  contact,
  chat,
  blocked,
  onBack,
  onProfile,
  onCall,
  onSend,
}: {
  P: Palette;
  contact: SimContact;
  chat: SimChat;
  blocked: boolean;
  onBack: () => void;
  onProfile: () => void;
  onCall: () => void;
  onSend: (text: string) => void;
}) {
  const insets = useSystemInsets();
  const tabSpace = useTabBarSpace();
  const [text, setText] = useState('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const count = chat.messages.length;
  // Abre (e segue) no fim da conversa, como no WhatsApp.
  useEffect(() => {
    if (count >= 0) requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
  }, [count]);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };
  const headH = insets.top + u(64);
  return (
    <View style={{ flex: 1, backgroundColor: P.wall }}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headH + u(8),
          paddingBottom: tabSpace + u(76),
          paddingHorizontal: u(12),
          gap: u(4),
        }}
        showsVerticalScrollIndicator={false}
      >
        {chat.messages.map((m, i) => {
          const prev = chat.messages[i - 1];
          const newDay = !prev || prev.day !== m.day;
          const tail = newDay || !prev || prev.out !== m.out;
          return (
            <View key={m.id} style={{ gap: u(4) }}>
              {newDay && (
                <View style={[styles.day, { backgroundColor: P.dark ? '#1C1D1D' : '#FFFFFF' }]}>
                  <Text pt={12} weight="medium" color={P.sub}>
                    {m.day}
                  </Text>
                </View>
              )}
              <Bubble P={P} msg={m} tail={tail} group={!!contact.members} />
            </View>
          );
        })}
        {blocked && (
          <View style={[styles.day, { backgroundColor: P.dark ? '#1C1D1D' : '#FFFFFF' }]}>
            <Text pt={13} color={P.sub}>
              Você bloqueou este contato.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Cabeçalho sobre a conversa (as mensagens passam por baixo dele). */}
      <View
        style={[
          styles.chatHead,
          {
            height: headH,
            paddingTop: insets.top,
            backgroundColor: P.dark ? 'rgba(11,11,11,0.94)' : 'rgba(255,255,255,0.94)',
          },
        ]}
      >
        <Round P={P} icon="chevron-back" label="Voltar" onPress={onBack} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dados do contato"
          onPress={onProfile}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: u(10) }}
        >
          <Avatar P={P} pt={38} group={!!contact.members} />
          <View style={{ flex: 1 }}>
            <Text pt={17} weight="semibold" color={P.ink} lines={1}>
              {contact.name}
            </Text>
            <Text pt={13} color={P.sub} lines={1}>
              {contact.members ? contact.members.join(', ') : 'toque para dados do contato'}
            </Text>
          </View>
        </Pressable>
        <Round P={P} icon="call-outline" label="Ligação de voz" onPress={onCall} wide />
      </View>

      {/* Campo de mensagem, logo acima da barra de abas do app. */}
      <View
        style={[
          styles.composer,
          {
            bottom: tabSpace,
            backgroundColor: P.dark ? 'rgba(11,11,11,0.94)' : 'rgba(246,246,246,0.96)',
          },
        ]}
      >
        <Icon name="add" pt={28} color={P.ink} />
        <View
          style={{
            flex: 1,
            height: u(36),
            borderRadius: u(18),
            backgroundColor: P.dark ? '#1E1F1F' : '#FFFFFF',
            borderWidth: P.dark ? 0 : 1,
            borderColor: '#E3E3E3',
            justifyContent: 'center',
            paddingHorizontal: u(12),
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            editable={!blocked}
            placeholder=""
            style={{
              fontFamily: FONT.displayRegular,
              fontSize: u(17),
              color: P.ink,
            }}
          />
        </View>
        {text.trim() ? (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            onPress={send}
            scaleTo={0.9}
            style={[styles.send, { backgroundColor: P.green }]}
          >
            <Icon name="send" pt={17} color="#FFFFFF" />
          </Touchable>
        ) : (
          <View style={[styles.send, { backgroundColor: P.green }]}>
            <Icon name="mic" pt={20} color="#FFFFFF" />
          </View>
        )}
      </View>
    </View>
  );
}

function Bubble({
  P,
  msg,
  tail,
  group,
}: {
  P: Palette;
  msg: SimMessage;
  tail: boolean;
  group: boolean;
}) {
  const R = u(18);
  const bg = msg.out ? P.out : P.in;
  return (
    <View style={{ alignItems: msg.out ? 'flex-end' : 'flex-start', marginTop: tail ? u(4) : 0 }}>
      <View
        style={{
          maxWidth: '80%',
          backgroundColor: bg,
          borderRadius: R,
          borderBottomRightRadius: tail && msg.out ? u(4) : R,
          borderBottomLeftRadius: tail && !msg.out ? u(4) : R,
          paddingHorizontal: u(12),
          paddingVertical: u(7),
          gap: u(4),
          shadowColor: '#000',
          shadowOpacity: P.dark ? 0 : 0.06,
          shadowRadius: 1,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        {group && !msg.out && msg.from && tail && (
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: u(8) }}>
          {msg.kind !== 'doc' && msg.kind !== 'call' && (
            <Text pt={17} color={P.ink} style={{ flexShrink: 1 }}>
              {msg.text}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
            <Text pt={11} color={P.sub}>
              {msg.time}
            </Text>
            {msg.out && <Icon name="checkmark-done" pt={15} color={P.tick} />}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ---------------- Dados do contato ---------------- */

function ProfileScreen({
  P,
  contact,
  chat,
  blocked,
  onBack,
  onCall,
  onMessage,
  onFavorite,
  onClear,
  onBlock,
}: {
  P: Palette;
  contact: SimContact;
  chat?: SimChat;
  blocked: boolean;
  onBack: () => void;
  onCall: () => void;
  onMessage: () => void;
  onFavorite: () => void;
  onClear: () => void;
  onBlock: () => void;
}) {
  const insets = useSystemInsets();
  const y = useRef(new Animated.Value(0)).current;
  const group = !!contact.members;
  const media = chat?.messages.filter((m) => m.kind === 'photo' || m.kind === 'doc').length ?? 0;
  const headH = insets.top + u(64);
  // O nome aparece no cabeçalho depois que a foto sai da tela (como no iPhone).
  const nameIn = y.interpolate({
    inputRange: [u(180), u(230)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const action = (icon: IconName, label: string, onPress?: () => void) => (
    <Touchable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.94}
      style={{ alignItems: 'center', gap: u(8), flex: 1 }}
    >
      <View
        style={[
          styles.center,
          { width: u(64), height: u(48), borderRadius: u(24), backgroundColor: P.button },
        ]}
      >
        <Icon name={icon} pt={22} color={P.ink} />
      </View>
      <Text pt={14} color={P.ink}>
        {label}
      </Text>
    </Touchable>
  );

  const card = (children: ReactNode, key: string) => (
    <View
      key={key}
      style={{
        marginHorizontal: u(16),
        marginBottom: u(16),
        borderRadius: u(26),
        backgroundColor: P.dark ? P.card : '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
  const row = (
    label: string,
    opts: {
      icon?: IconName;
      color?: string;
      right?: string;
      sub?: string;
      chevron?: boolean;
      last?: boolean;
      onPress?: () => void;
    } = {},
  ) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={opts.onPress}
      disabled={!opts.onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: u(18),
        backgroundColor: pressed ? P.press : 'transparent',
      })}
    >
      {opts.icon && (
        <View style={{ width: u(36) }}>
          <Icon name={opts.icon} pt={24} color={opts.color ?? P.ink} />
        </View>
      )}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: u(52),
          paddingVertical: u(10),
          paddingRight: u(18),
          marginLeft: opts.icon ? u(8) : 0,
          borderBottomWidth: opts.last ? 0 : 1,
          borderBottomColor: P.line,
          gap: u(8),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text pt={17} color={opts.color ?? P.ink} lines={1}>
            {label}
          </Text>
          {!!opts.sub && (
            <Text pt={14} color={P.sub}>
              {opts.sub}
            </Text>
          )}
        </View>
        {!!opts.right && (
          <Text pt={17} color={P.sub}>
            {opts.right}
          </Text>
        )}
        {opts.chevron && <Icon name="chevron-forward" pt={16} color={P.sub} />}
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: grouped(P) }}>
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: headH, paddingBottom: PHONE_SCROLL_END }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
          useNativeDriver: false,
        })}
      >
        <View style={{ alignItems: 'center', gap: u(4), paddingVertical: u(16) }}>
          <Avatar P={P} pt={120} group={group} />
          <Text pt={26} weight="semibold" color={P.ink} style={{ marginTop: u(12) }}>
            {contact.name}
          </Text>
          <Text pt={17} color={P.sub}>
            {group ? `Grupo · ${contact.members?.length ?? 0} participantes` : contact.phone}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: u(16), marginVertical: u(16) }}>
          {action('call-outline', 'Ligar', onCall)}
          {action('chatbubble-outline', 'Mensagem', onMessage)}
          {action(contact.favorite ? 'star' : 'star-outline', 'Favorito', onFavorite)}
        </View>
        {!!contact.about && card(row(contact.about, { sub: 'Recado', last: true }), 'about')}
        {card(
          <>
            {row('Mídia, links e docs', { icon: 'image-outline', right: String(media) })}
            {row('Favoritas', {
              icon: 'star-outline',
              right: contact.favorite ? 'Sim' : 'Nenhuma',
              chevron: true,
              last: true,
              onPress: onFavorite,
            })}
          </>,
          'media',
        )}
        {card(
          row('Criptografia', {
            icon: 'lock-closed-outline',
            sub: 'As mensagens e as ligações são protegidas com a criptografia de ponta a ponta.',
            last: true,
          }),
          'privacy',
        )}
        {group &&
          card(
            (contact.members ?? []).map((m, i, all) =>
              row(m, { icon: 'person-circle-outline', last: i === all.length - 1 }),
            ),
            'members',
          )}
        {card(
          <>
            {row(contact.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos', {
              color: P.greenInk,
              onPress: onFavorite,
            })}
            {row('Limpar conversa', { color: P.red, last: true, onPress: onClear })}
          </>,
          'actions',
        )}
        {!group &&
          card(
            row(blocked ? `Desbloquear ${contact.name}` : `Bloquear ${contact.name}`, {
              color: P.red,
              last: true,
              onPress: onBlock,
            }),
            'block',
          )}
      </Animated.ScrollView>

      <View style={[styles.chatHead, { height: headH, paddingTop: insets.top }]}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: grouped(P), opacity: nameIn }]}
        />
        <Round P={P} icon="chevron-back" label="Voltar" onPress={onBack} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text pt={17} weight="semibold" color={P.ink} lines={1}>
            {group ? 'Dados do grupo' : 'Dados do contato'}
          </Text>
          <Animated.View style={{ opacity: nameIn, position: 'absolute', top: u(22) }}>
            <Text pt={13} color={P.sub} lines={1}>
              {contact.name}
            </Text>
          </Animated.View>
        </View>
        <View style={{ width: u(44) }} />
      </View>
    </View>
  );
}

/* ---------------- Nova conversa / nova ligação ---------------- */

function NewScreen({
  P,
  mode,
  contacts,
  onBack,
  onPick,
}: {
  P: Palette;
  mode: 'chat' | 'call';
  contacts: SimContact[];
  onBack: () => void;
  onPick: (id: string) => void;
}) {
  const insets = useSystemInsets();
  const [q, setQ] = useState('');
  const list = contacts
    .filter((c) => !q || norm(c.name).includes(norm(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + u(8), paddingBottom: PHONE_SCROLL_END }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.bar, { paddingHorizontal: u(16) }]}>
        <Round P={P} icon="chevron-back" label="Voltar" onPress={onBack} />
        <Text pt={17} weight="semibold" color={P.ink} style={{ flex: 1, textAlign: 'center' }}>
          {mode === 'call' ? 'Nova ligação' : 'Nova conversa'}
        </Text>
        <View style={{ width: u(44) }} />
      </View>
      <View style={{ height: u(12) }} />
      <Search P={P} value={q} onChange={setQ} placeholder="Pesquisar nome ou número" />
      <Text
        pt={15}
        weight="semibold"
        color={P.sub}
        style={{ paddingHorizontal: u(16), marginTop: u(20), marginBottom: u(6) }}
      >
        Contatos no WhatsApp
      </Text>
      {list.map((c, i) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={mode === 'call' ? `Ligar para ${c.name}` : c.name}
          onPress={() => onPick(c.id)}
          style={({ pressed }) => [
            styles.row,
            { paddingLeft: u(16), backgroundColor: pressed ? P.press : 'transparent' },
          ]}
        >
          <Avatar P={P} pt={42} group={!!c.members} />
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: u(12),
              paddingVertical: u(12),
              paddingRight: u(16),
              borderBottomWidth: i < list.length - 1 ? 1 : 0,
              borderBottomColor: P.line,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text pt={17} color={P.ink} lines={1}>
                {c.name}
              </Text>
              <Text pt={14} color={P.sub} lines={1}>
                {c.members ? c.members.join(', ') : (c.about ?? c.phone)}
              </Text>
            </View>
            {mode === 'call' && <Icon name="call-outline" pt={22} color={P.greenInk} />}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/* ---------------- Ligações ---------------- */

const CALL_TEXT: Record<SimCall['kind'], string> = {
  missed: 'Perdida',
  in: 'Recebida',
  out: 'Efetuada',
};
const CALL_ICON: Record<SimCall['kind'], IconName> = {
  missed: 'arrow-down',
  in: 'arrow-down',
  out: 'arrow-up',
};

function CallsScreen({
  P,
  contacts,
  contactOf,
  unread,
  onToggle,
  onNew,
  onCall,
  onInfo,
}: {
  P: Palette;
  contacts: SimContact[];
  contactOf: (id: string) => SimContact | undefined;
  unread: number;
  onToggle: () => void;
  onNew: () => void;
  onCall: (id: string) => void;
  onInfo: (id: string) => void;
}) {
  const insets = useSystemInsets();
  const favorites = useMemo(() => contacts.filter((c) => c.favorite), [contacts]);
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + u(8), paddingBottom: PHONE_SCROLL_END }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.bar, { paddingHorizontal: u(16) }]}>
        <Round
          P={P}
          icon="chatbubble-ellipses-outline"
          label="Voltar para Conversas"
          onPress={onToggle}
          badge={unread}
        />
        <View style={{ flex: 1 }} />
        <Round P={P} icon="add" label="Nova ligação" filled onPress={onNew} />
      </View>
      <Text pt={34} weight="bold" color={P.ink} style={styles.large}>
        Ligações
      </Text>

      {favorites.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ gap: u(20), paddingHorizontal: u(16), paddingBottom: u(20) }}
        >
          {favorites.map((c) => (
            <Touchable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`Ligar para ${c.name}`}
              onPress={() => onCall(c.id)}
              scaleTo={0.94}
              style={{ alignItems: 'center', gap: u(8), width: u(64) }}
            >
              <Avatar P={P} pt={56} group={!!c.members} />
              <Text pt={14} color={P.sub} lines={1}>
                {c.name.split(' ')[0]}
              </Text>
            </Touchable>
          ))}
        </ScrollView>
      )}

      <Text
        pt={22}
        weight="bold"
        color={P.ink}
        style={{ paddingHorizontal: u(16), marginBottom: u(8) }}
      >
        Ligações recentes
      </Text>
      {CALLS.map((k, i) => {
        const who = contactOf(k.contact);
        if (!who) return null;
        const missed = k.kind === 'missed';
        return (
          <Pressable
            key={k.id}
            accessibilityRole="button"
            accessibilityLabel={`Ligar para ${who.name}`}
            onPress={() => onCall(who.id)}
            style={({ pressed }) => [
              styles.row,
              { paddingLeft: u(16), backgroundColor: pressed ? P.press : 'transparent' },
            ]}
          >
            <Avatar P={P} pt={42} group={!!who.members} />
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: u(12),
                paddingVertical: u(10),
                paddingRight: u(8),
                borderBottomWidth: i < CALLS.length - 1 ? 1 : 0,
                borderBottomColor: P.line,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text pt={17} color={missed ? P.red : P.ink} lines={1}>
                  {who.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: u(4) }}>
                  <Icon name="call" pt={13} color={P.sub} />
                  <Icon name={CALL_ICON[k.kind]} pt={11} color={P.sub} />
                  <Text pt={15} color={P.sub}>
                    {CALL_TEXT[k.kind]}
                  </Text>
                </View>
              </View>
              <Text pt={15} color={P.sub}>
                {k.when}
              </Text>
              <Touchable
                accessibilityRole="button"
                accessibilityLabel={`Dados de ${who.name}`}
                onPress={() => onInfo(who.id)}
                scaleTo={0.9}
                style={[styles.center, { width: u(44), height: u(44) }]}
              >
                <Icon name="information-circle-outline" pt={26} color={P.ink} />
              </Touchable>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: FONT.displayRegular,
    paddingVertical: 0,
    // Web: sem o contorno azul do navegador.
    outlineStyle: 'none',
  } as object,
  center: { alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: u(12), height: u(52) },
  large: { paddingHorizontal: u(16), marginTop: u(14), marginBottom: u(10) },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', gap: u(8) },
  count: {
    minWidth: u(20),
    height: u(20),
    borderRadius: u(10),
    paddingHorizontal: u(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  day: {
    alignSelf: 'center',
    paddingHorizontal: u(10),
    paddingVertical: u(4),
    borderRadius: u(10),
    marginVertical: u(8),
  },
  chatHead: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: u(10),
    paddingHorizontal: u(16),
  },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: u(12),
    paddingHorizontal: u(14),
    paddingVertical: u(8),
  },
  send: {
    width: u(36),
    height: u(36),
    borderRadius: u(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
