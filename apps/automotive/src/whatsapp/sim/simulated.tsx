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
  Easing,
  Pressable,
  Text as RNText,
  ScrollView,
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';
import { usePhone } from '../../layout/form-factor';
import { FONT, useColors } from '../../theme';
import { Appear, Presence } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import { startCall } from './call';
import { CallPanel } from './call-layer';
import {
  CALLS,
  CHATS,
  CONTACTS,
  ME,
  type SimCall,
  type SimChat,
  type SimContact,
  type SimMessage,
} from './data';

/**
 * WhatsApp **simulado** (Preview): as telas do WhatsApp Web redesenhadas no GoClient, com
 * dados fictícios, para refinar a interface da multimídia antes das funções reais (como foi
 * feito com o Kyte). Tudo acontece só na memória: nada é enviado nem salvo.
 *
 * Telas: carregamento, conversas (lista + painel vazio), conversa aberta, menu da conversa
 * (Pesquisar, Selecionar mensagens, Bloquear, Limpar e Apagar conversa), dados do contato,
 * nova conversa, novo contato, ligações e dados da ligação.
 *
 * Visual fiel ao WhatsApp Web atual (pedido do usuário em 26/11/2026): fonte do sistema,
 * cores, proporções, balões com "rabinho" e avatares padrão do WhatsApp, tudo ampliado ~1,85×
 * para a tela do carro. Sem o trilho lateral: o botão ao lado do "+" alterna Conversas ↔
 * Ligações e mostra o ícone do destino (ligação nas conversas, conversa nas ligações).
 */
type IconName = ComponentProps<typeof Ionicons>['name'];

/** Cores do WhatsApp Web atual (claro e escuro), para o simulado parecer o app de verdade. */
function usePalette() {
  const dark = useColors().mode === 'dark';
  return dark
    ? {
        dark,
        wall: '#0B141A',
        panel: '#111B21',
        bar: '#161717',
        head: '#161717',
        field: '#2E2F2F',
        line: 'rgba(134,150,160,0.15)',
        ink: '#E9EDEF',
        sub: '#8696A0',
        icon: '#AEBAC1',
        green: '#21C063',
        greenInk: '#21C063',
        chipOn: '#103529',
        chipInk: '#D9FDD3',
        out: '#144D37',
        in: '#242626',
        red: '#F15C6D',
        press: '#2E2F2F',
        avatar: '#103B4F',
        avatarInk: '#8ACDEA',
        group: '#0B3A36',
        groupInk: '#6FD1C5',
        soft: '#2E2F2F',
        tile: '#2E2F2F',
        menu: '#1D1F1F',
        tick: '#53BDEB',
        scrim: 'rgba(0,0,0,0.5)',
      }
    : {
        dark,
        wall: '#F4EFE8',
        panel: '#FFFFFF',
        bar: '#F7F5F3',
        head: '#FFFFFF',
        field: '#F6F5F4',
        line: '#E9E9E9',
        ink: '#111B21',
        sub: '#667781',
        icon: '#54656F',
        green: '#1DAA61',
        greenInk: '#1DAA61',
        chipOn: '#D9FDD3',
        chipInk: '#15603E',
        out: '#D9FDD3',
        in: '#FFFFFF',
        red: '#EA0038',
        press: '#ECECEC',
        avatar: '#CAECFA',
        avatarInk: '#3D9BD1',
        group: '#CBF2EE',
        groupInk: '#048479',
        soft: '#F6F5F4',
        tile: '#EDEAE7',
        menu: '#FFFFFF',
        tick: '#53BDEB',
        scrim: 'rgba(11,20,26,0.35)',
      };
}
type Palette = ReturnType<typeof usePalette>;

/**
 * Medidas do WhatsApp Web ×1,85 (multimídia, 1600×900) e ×1,5 (celular): cabeçalho 64,
 * título 22, nome 17, texto 14, linha 72 e avatar 49 no original.
 */
function useSizes() {
  const phone = usePhone();
  // Multimídia: elementos grandes como no resto do app (pedido do usuário).
  const k = phone ? 1.5 : 1.85;
  return {
    phone,
    k,
    // Lista um pouco mais estreita, para a conversa ganhar espaço.
    list: phone ? 0 : 600,
    title: Math.round(22 * k),
    name: Math.round(17 * k),
    sub: Math.round(14.5 * k),
    small: Math.round(12 * k),
    icon: Math.round(24 * k),
    rowH: Math.round(72 * k),
    avatar: Math.round(49 * k),
    pad: Math.round(16 * k),
    head: Math.round(64 * k),
    radius: Math.round(12 * k),
  };
}
type Sizes = ReturnType<typeof useSizes>;

/** Fontes da Apple (SF Pro), as mesmas do resto do app: o peso vem da família. */
const FAMILY = {
  regular: FONT.displayRegular,
  medium: FONT.displayMedium,
  semibold: FONT.displaySemibold,
  bold: FONT.displayBold,
} as const;

function Text({
  children,
  size,
  weight = 'regular',
  color,
  style,
  lines,
}: {
  children: ReactNode;
  size: number;
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
          fontSize: size,
          lineHeight: Math.round(size * 1.35),
          color,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

type Tab = 'chats' | 'calls';
type Left = 'list' | 'new' | 'newContact';
type Filter = 'all' | 'unread' | 'fav' | 'groups';
type Confirm = { kind: 'block' | 'clear' | 'delete'; chat: string } | null;

// O carregamento aparece só na primeira abertura da aba em cada uso do app.
let loadedOnce = false;

export function WhatsAppSim() {
  const P = usePalette();
  const S = useSizes();
  const [loading, setLoading] = useState(!loadedOnce);
  const [tab, setTab] = useState<Tab>('chats');
  const [left, setLeft] = useState<Left>('list');
  const [contacts, setContacts] = useState<SimContact[]>(CONTACTS);
  const [chats, setChats] = useState<SimChat[]>(CHATS);
  const [open, setOpen] = useState<string | null>(null);
  const [profile, setProfile] = useState(false);
  const [menu, setMenu] = useState(false);
  const [finding, setFinding] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<Set<string> | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [call, setCall] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      loadedOnce = true;
      setLoading(false);
    }, 1600);
    return () => clearTimeout(t);
  }, [loading]);

  const contactOf = (id: string) => contacts.find((c) => c.id === id);
  const chat = chats.find((c) => c.id === open) ?? null;
  const unreadTotal = chats.reduce((n, c) => n + (c.unread ? 1 : 0), 0);

  const openChat = (contactId: string) => {
    setChats((cur) =>
      cur.some((c) => c.id === contactId)
        ? cur.map((c) => (c.id === contactId ? { ...c, unread: 0 } : c))
        : [{ id: contactId, contact: contactId, unread: 0, messages: [] }, ...cur],
    );
    setTab('chats');
    setLeft('list');
    setOpen(contactId);
    setProfile(false);
    setFinding(null);
    setSelecting(null);
    setMenu(false);
  };

  const send = (text: string) => {
    if (!chat) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const msg: SimMessage = { id: `n${now.getTime()}`, out: true, text, time, day: 'Hoje' };
    setChats((cur) => [
      { ...chat, messages: [...chat.messages, msg] },
      ...cur.filter((c) => c.id !== chat.id),
    ]);
  };

  const runConfirm = () => {
    if (!confirm) return;
    const id = confirm.chat;
    if (confirm.kind === 'block')
      setBlocked((cur) => {
        const next = new Set(cur);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    if (confirm.kind === 'clear')
      setChats((cur) => cur.map((c) => (c.id === id ? { ...c, messages: [] } : c)));
    if (confirm.kind === 'delete') {
      setChats((cur) => cur.filter((c) => c.id !== id));
      setOpen(null);
      setProfile(false);
    }
    setConfirm(null);
  };

  const menuPick = (k: 'find' | 'select' | 'block' | 'clear' | 'delete') => {
    setMenu(false);
    if (!chat) return;
    if (k === 'find') {
      setSelecting(null);
      setFinding('');
    } else if (k === 'select') {
      setFinding(null);
      setSelecting(new Set());
    } else if (k === 'block' && blocked.has(chat.id))
      setBlocked((cur) => {
        const next = new Set(cur);
        next.delete(chat.id);
        return next;
      });
    else setConfirm({ kind: k, chat: chat.id });
  };

  // Ligação de voz simulada: abre o painel de chamada e deixa o balão "Ligação de voz" na conversa.
  const ring = (contactId: string) => {
    const who = contactOf(contactId);
    if (!who) return;
    startCall({ contact: who.id, name: who.name, group: !!who.members });
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const msg: SimMessage = {
      id: `c${now.getTime()}`,
      out: true,
      text: 'Ligação de voz',
      time,
      day: 'Hoje',
      kind: 'call',
    };
    setChats((cur) => {
      const had = cur.find((c) => c.id === contactId);
      const base = had ?? { id: contactId, contact: contactId, unread: 0, messages: [] };
      return [
        { ...base, messages: [...base.messages, msg] },
        ...cur.filter((c) => c.id !== contactId),
      ];
    });
  };

  // Botão ao lado do "+": Conversas ↔ Ligações (substitui o trilho lateral).
  const toggle = (t: Tab) => {
    setTab(t);
    setLeft('list');
    setMenu(false);
  };

  if (loading) return <Loading P={P} S={S} />;

  // Celular (por enquanto): uma coluna por vez. A versão do celular será desenhada depois.
  const showRight = tab === 'chats' ? !!chat : !!call;
  const leftPane =
    tab === 'calls' ? (
      <CallsList
        P={P}
        S={S}
        contacts={contacts}
        contactOf={contactOf}
        selected={call}
        onSelect={setCall}
        onCall={ring}
        unread={unreadTotal}
        onToggle={() => toggle('chats')}
      />
    ) : left === 'new' ? (
      <NewChat
        P={P}
        S={S}
        contacts={contacts}
        onBack={() => setLeft('list')}
        onNewContact={() => setLeft('newContact')}
        onPick={openChat}
      />
    ) : left === 'newContact' ? (
      <NewContact
        P={P}
        S={S}
        onBack={() => setLeft('new')}
        onSave={(c) => {
          setContacts((cur) => [...cur, c]);
          openChat(c.id);
        }}
      />
    ) : (
      <ChatList
        P={P}
        S={S}
        chats={chats}
        contactOf={contactOf}
        open={open}
        onOpen={openChat}
        onNew={() => setLeft('new')}
        onToggle={() => toggle('calls')}
      />
    );

  const rightPane =
    tab === 'calls' ? (
      call ? (
        <CallDetail
          P={P}
          S={S}
          call={CALLS.find((k) => k.id === call) as SimCall}
          contactOf={contactOf}
          onClose={() => setCall(null)}
          onMessage={openChat}
          onCall={ring}
        />
      ) : (
        <CallsEmpty P={P} S={S} />
      )
    ) : chat ? (
      profile ? (
        <Profile
          P={P}
          S={S}
          contact={contactOf(chat.contact) as SimContact}
          chat={chat}
          blocked={blocked.has(chat.id)}
          onClose={() => setProfile(false)}
          onCall={() => ring(chat.contact)}
          onFind={() => {
            setProfile(false);
            setFinding('');
          }}
          onFavorite={() =>
            setContacts((cur) =>
              cur.map((c) => (c.id === chat.contact ? { ...c, favorite: !c.favorite } : c)),
            )
          }
          onAsk={(kind) => setConfirm({ kind, chat: chat.id })}
          onUnblock={() =>
            setBlocked((cur) => {
              const next = new Set(cur);
              next.delete(chat.id);
              return next;
            })
          }
        />
      ) : (
        <Conversation
          P={P}
          S={S}
          chat={chat}
          contact={contactOf(chat.contact) as SimContact}
          blocked={blocked.has(chat.id)}
          finding={finding}
          selecting={selecting}
          onBack={() => setOpen(null)}
          onProfile={() => setProfile(true)}
          onCall={() => ring(chat.contact)}
          onMenu={() => setMenu(true)}
          onFind={setFinding}
          onSelect={setSelecting}
          onDeleteSelected={() => {
            const gone = selecting ?? new Set<string>();
            setChats((cur) =>
              cur.map((c) =>
                c.id === chat.id
                  ? { ...c, messages: c.messages.filter((m) => !gone.has(m.id)) }
                  : c,
              ),
            );
            setSelecting(null);
          }}
          onSend={send}
          onUnblock={() =>
            setBlocked((cur) => {
              const next = new Set(cur);
              next.delete(chat.id);
              return next;
            })
          }
        />
      )
    ) : (
      <ChatsEmpty
        P={P}
        S={S}
        onNew={() => setLeft('new')}
        onContact={() => setLeft('newContact')}
        onCalls={() => toggle('calls')}
      />
    );

  return (
    <Appear distance={0} style={[styles.root, { backgroundColor: P.panel }]}>
      {(!S.phone || !showRight) && (
        <View
          style={[
            S.phone ? { flex: 1 } : { width: S.list },
            { borderRightWidth: S.phone ? 0 : 1, borderRightColor: P.line },
          ]}
        >
          {leftPane}
          {/* Ligação em andamento: embaixo da lista, como no WhatsApp Web. */}
          {!S.phone && <CallPanel k={S.k * 0.85} />}
        </View>
      )}
      {(!S.phone || showRight) && <View style={{ flex: 1 }}>{rightPane}</View>}
      {S.phone && <CallPanel k={S.k * 0.85} />}

      <Presence show={menu && !!chat} distance={-10} style={StyleSheet.absoluteFill}>
        <ChatMenu
          P={P}
          S={S}
          blocked={!!chat && blocked.has(chat.id)}
          onClose={() => setMenu(false)}
          onPick={menuPick}
        />
      </Presence>
      <Presence show={!!confirm} distance={0} style={StyleSheet.absoluteFill}>
        {confirm && (
          <ConfirmDialog
            P={P}
            S={S}
            confirm={confirm}
            name={contactOf(chats.find((c) => c.id === confirm.chat)?.contact ?? '')?.name ?? ''}
            blocked={blocked.has(confirm.chat)}
            onCancel={() => setConfirm(null)}
            onConfirm={runConfirm}
          />
        )}
      </Presence>
    </Appear>
  );
}

/* ---------------- Peças ---------------- */

function Icon({ name, size, color }: { name: IconName; size: number; color: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function IconButton({
  name,
  P,
  S,
  onPress,
  label,
  color,
  filled,
}: {
  name: IconName;
  P: Palette;
  S: Sizes;
  onPress?: () => void;
  label: string;
  color?: string;
  /** Botão verde cheio (o "+" da lista). */
  filled?: boolean;
}) {
  // Alvo de toque grande (carro), mas o círculo verde tem o tamanho do WhatsApp (40 × k).
  const box = Math.max(S.icon + 32, 72);
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.9}
      style={{
        width: box,
        height: box,
        borderRadius: box / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {filled ? (
        <View
          style={[
            styles.center,
            {
              width: Math.round(40 * S.k),
              height: Math.round(40 * S.k),
              borderRadius: 40 * S.k,
              backgroundColor: P.green,
            },
          ]}
        >
          <Icon name={name} size={S.icon} color="#FFFFFF" />
        </View>
      ) : (
        <Icon name={name} size={S.icon} color={color ?? P.icon} />
      )}
    </Touchable>
  );
}

/** Avatar padrão do WhatsApp: silhueta azul (pessoa) ou verde-água (grupo). */
function Avatar({ P, size, group }: { P: Palette; name?: string; size: number; group?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: group ? P.group : P.avatar,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Icon
        name={group ? 'people' : 'person'}
        size={size * (group ? 0.46 : 0.5)}
        color={group ? P.groupInk : P.avatarInk}
      />
    </View>
  );
}

function SearchField({
  P,
  S,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  P: Palette;
  S: Sizes;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const h = Math.round(40 * S.k);
  const [focus, setFocus] = useState(false);
  return (
    <View
      style={{
        height: h,
        borderRadius: h / 2,
        backgroundColor: focus ? P.panel : P.field,
        borderWidth: 2,
        borderColor: focus ? P.green : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Math.round(14 * S.k),
        gap: Math.round(12 * S.k),
        marginHorizontal: S.pad,
      }}
    >
      <Icon name="search" size={Math.round(20 * S.k)} color={P.icon} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={P.sub}
        autoFocus={autoFocus}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[styles.input, { color: P.ink, fontSize: S.sub }]}
      />
      {!!value && (
        <Pressable accessibilityLabel="Limpar busca" onPress={() => onChange('')}>
          <Icon name="close-circle" size={S.icon * 0.8} color={P.sub} />
        </Pressable>
      )}
    </View>
  );
}

function Header({
  P,
  S,
  children,
  onBack,
  backIcon = 'arrow-back',
}: {
  P: Palette;
  S: Sizes;
  children: ReactNode;
  onBack?: () => void;
  backIcon?: IconName;
}) {
  return (
    <View
      style={{
        height: S.head,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: S.pad - (onBack ? 14 : 0),
        gap: Math.round(4 * S.k),
      }}
    >
      {onBack && <IconButton P={P} S={S} name={backIcon} label="Voltar" onPress={onBack} />}
      {children}
    </View>
  );
}

function Row({
  P,
  S,
  left,
  title,
  titleColor,
  subtitle,
  subColor,
  right,
  selected,
  onPress,
}: {
  P: Palette;
  S: Sizes;
  left: ReactNode;
  title: string;
  titleColor?: string;
  subtitle?: ReactNode;
  subColor?: string;
  right?: ReactNode;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      scaleTo={0.985}
      style={{
        minHeight: S.rowH,
        marginHorizontal: Math.round(10 * S.k),
        paddingHorizontal: Math.round(8 * S.k),
        borderRadius: S.radius,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Math.round(14 * S.k),
        backgroundColor: selected ? P.press : 'transparent',
      }}
    >
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text size={S.name} color={titleColor ?? P.ink} lines={1}>
          {title}
        </Text>
        {typeof subtitle === 'string' ? (
          <Text size={S.sub} color={subColor ?? P.sub} lines={1}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {right}
    </Touchable>
  );
}

function Pill({
  P,
  S,
  label,
  on,
  onPress,
}: {
  P: Palette;
  S: Sizes;
  label: string;
  on?: boolean;
  onPress?: () => void;
}) {
  const h = Math.round(34 * S.k);
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      scaleTo={0.94}
      hitSlop={12}
      style={{
        height: h,
        paddingHorizontal: Math.round(12 * S.k),
        borderRadius: h / 2,
        justifyContent: 'center',
        backgroundColor: on ? P.chipOn : 'transparent',
        borderWidth: 1,
        borderColor: on ? P.chipOn : P.line,
      }}
    >
      <Text size={Math.round(15 * S.k)} weight="medium" color={on ? P.chipInk : P.sub}>
        {label}
      </Text>
    </Touchable>
  );
}

/** Interruptor no tamanho do WhatsApp (proporcional à linha, menor que o do resto do app). */
function SimSwitch({
  P,
  S,
  value,
  onChange,
}: {
  P: Palette;
  S: Sizes;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const w = Math.round(34 * S.k);
  const h = Math.round(20 * S.k);
  const knob = h - 6;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={16}
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        padding: 3,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
        backgroundColor: value ? P.green : P.dark ? '#3B4A54' : '#C4C9CC',
      }}
    >
      <View
        style={{ width: knob, height: knob, borderRadius: knob / 2, backgroundColor: '#FFFFFF' }}
      />
    </Pressable>
  );
}

/** Letreiro "WhatsApp" (texto, não a imagem do logotipo): SF Pro Bold, verde claro, justo. */
function Wordmark({ P, S }: { P: Palette; S: Sizes }) {
  return (
    <Text
      size={Math.round(S.title * 1.12)}
      weight="bold"
      color={P.dark ? '#66D06E' : '#5CCB66'}
      style={{ flex: 1, letterSpacing: -0.8 }}
    >
      WhatsApp
    </Text>
  );
}

/* ---------------- Carregamento ---------------- */

function Loading({ P, S }: { P: Palette; S: Sizes }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [p]);
  const W = S.phone ? 320 : 420;
  return (
    <View style={[styles.center, { flex: 1, backgroundColor: P.bar, gap: 28 }]}>
      <Icon name="logo-whatsapp" size={S.phone ? 84 : 104} color={P.dark ? '#3B4A54' : '#C6CBCE'} />
      <Text size={S.title - 4} color={P.ink}>
        WhatsApp
      </Text>
      <View style={{ width: W, height: 6, borderRadius: 3, backgroundColor: P.line }}>
        <Animated.View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: P.green,
            width: p.interpolate({ inputRange: [0, 1], outputRange: [8, W] }),
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="lock-closed-outline" size={S.small + 2} color={P.sub} />
        <Text size={S.small} color={P.sub}>
          Protegida com a criptografia de ponta a ponta
        </Text>
      </View>
    </View>
  );
}

/* ---------------- Lista de conversas ---------------- */

function ChatList({
  P,
  S,
  chats,
  contactOf,
  open,
  onOpen,
  onNew,
  onToggle,
}: {
  P: Palette;
  S: Sizes;
  chats: SimChat[];
  contactOf: (id: string) => SimContact | undefined;
  open: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onToggle: () => void;
}) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const unread = chats.filter((c) => c.unread).length;
  const shown = chats.filter((c) => {
    const who = contactOf(c.contact);
    if (!who) return false;
    if (q && !norm(who.name).includes(norm(q))) return false;
    if (filter === 'unread') return c.unread > 0;
    if (filter === 'fav') return !!who.favorite;
    if (filter === 'groups') return !!who.members;
    return true;
  });
  return (
    <View style={{ flex: 1 }}>
      <Header P={P} S={S}>
        <Wordmark P={P} S={S} />
        <IconButton P={P} S={S} name="call-outline" label="Ir para Ligações" onPress={onToggle} />
        <IconButton P={P} S={S} name="add" label="Nova conversa" filled onPress={onNew} />
      </Header>
      <SearchField
        P={P}
        S={S}
        value={q}
        onChange={setQ}
        placeholder="Pesquisar ou começar conversa"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{
          gap: Math.round(8 * S.k),
          paddingHorizontal: S.pad,
          paddingVertical: Math.round(10 * S.k),
        }}
      >
        <Pill P={P} S={S} label="Tudo" on={filter === 'all'} onPress={() => setFilter('all')} />
        <Pill
          P={P}
          S={S}
          label={unread ? `Não lidas ${unread}` : 'Não lidas'}
          on={filter === 'unread'}
          onPress={() => setFilter('unread')}
        />
        <Pill
          P={P}
          S={S}
          label="Favoritas"
          on={filter === 'fav'}
          onPress={() => setFilter('fav')}
        />
        <Pill
          P={P}
          S={S}
          label="Grupos"
          on={filter === 'groups'}
          onPress={() => setFilter('groups')}
        />
      </ScrollView>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {shown.map((c) => {
          const who = contactOf(c.contact) as SimContact;
          const last = c.messages[c.messages.length - 1];
          return (
            <Row
              key={c.id}
              P={P}
              S={S}
              selected={open === c.id}
              onPress={() => onOpen(c.contact)}
              left={<Avatar P={P} name={who.name} size={S.avatar} group={!!who.members} />}
              title={who.name}
              subtitle={<LastLine P={P} S={S} msg={last} />}
              right={
                <View
                  style={{
                    alignItems: 'flex-end',
                    gap: Math.round(6 * S.k),
                    alignSelf: 'stretch',
                    paddingTop: Math.round(14 * S.k),
                  }}
                >
                  <Text
                    size={S.small}
                    weight={c.unread ? 'semibold' : 'regular'}
                    color={c.unread ? P.greenInk : P.sub}
                  >
                    {last?.day === 'Hoje' ? last.time : (last?.day ?? '')}
                  </Text>
                  {c.unread > 0 && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: P.green,
                          position: 'relative',
                          minWidth: Math.round(20 * S.k),
                          height: Math.round(20 * S.k),
                          borderRadius: 10 * S.k,
                        },
                      ]}
                    >
                      <Text size={S.small} weight="semibold" color={P.dark ? '#111B21' : '#FFFFFF'}>
                        {c.unread}
                      </Text>
                    </View>
                  )}
                </View>
              }
            />
          );
        })}
        {!shown.length && (
          <Text size={S.sub} color={P.sub} style={{ textAlign: 'center', marginTop: 48 }}>
            Nenhuma conversa aqui.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

/** Prévia da última mensagem (✓✓ nas enviadas, ícone nos anexos, nome nos grupos). */
function LastLine({ P, S, msg }: { P: Palette; S: Sizes; msg?: SimMessage }) {
  if (!msg) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {msg.out && <Icon name="checkmark-done" size={S.sub} color={P.tick} />}
      {msg.kind && (
        <Icon
          name={msg.kind === 'photo' ? 'camera' : msg.kind === 'call' ? 'call' : 'document-text'}
          size={S.sub}
          color={P.sub}
        />
      )}
      <Text size={S.sub} color={P.sub} lines={1} style={{ flex: 1 }}>
        {msg.from ? `${msg.from}: ` : ''}
        {msg.text}
      </Text>
    </View>
  );
}

/* ---------------- Painel vazio ---------------- */

/** Painel vazio do WhatsApp Web: cartão branco no fundo cinza-quente e atalhos redondos. */
function EmptyCard({
  P,
  S,
  icon,
  title,
  text,
  cta,
  actions,
  footer,
}: {
  P: Palette;
  S: Sizes;
  icon: IconName;
  title: string;
  text: string;
  cta?: { label: string; onPress?: () => void };
  actions: { icon: IconName; label: string; onPress?: () => void }[];
  footer: string;
}) {
  // O painel vazio usa uma escala um pouco menor para o cartão e os atalhos caberem.
  const k = Math.min(S.k, 1.45);
  const tile = Math.round(60 * k);
  return (
    <View style={[styles.center, { flex: 1, backgroundColor: P.bar, padding: 48 }]}>
      <Appear style={[styles.center, { gap: Math.round(32 * k) }]}>
        <View
          style={{
            width: Math.round(352 * k),
            backgroundColor: P.panel,
            borderRadius: Math.round(24 * k),
            paddingVertical: Math.round(40 * k),
            paddingHorizontal: Math.round(32 * k),
            alignItems: 'center',
            gap: Math.round(10 * k),
          }}
        >
          <Icon name={icon} size={Math.round(72 * k)} color={P.green} />
          <Text
            size={Math.round(22 * k)}
            color={P.ink}
            style={{ textAlign: 'center', marginTop: Math.round(14 * k) }}
          >
            {title}
          </Text>
          <Text size={Math.round(14 * k)} color={P.sub} style={{ textAlign: 'center' }}>
            {text}
          </Text>
          {cta && (
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={cta.label}
              onPress={cta.onPress}
              scaleTo={0.95}
              style={{
                marginTop: Math.round(14 * k),
                height: Math.round(36 * k),
                paddingHorizontal: Math.round(18 * k),
                borderRadius: 18 * k,
                justifyContent: 'center',
                backgroundColor: P.chipOn,
              }}
            >
              <Text size={Math.round(14 * k)} weight="semibold" color={P.chipInk}>
                {cta.label}
              </Text>
            </Touchable>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: Math.round(16 * k) }}>
          {actions.map((a) => (
            <Touchable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={a.onPress}
              scaleTo={0.92}
              style={{ alignItems: 'center', gap: Math.round(10 * k), width: Math.round(120 * k) }}
            >
              <View
                style={[
                  styles.center,
                  { width: tile, height: tile, borderRadius: tile / 2, backgroundColor: P.tile },
                ]}
              >
                <Icon name={a.icon} size={S.icon} color={P.ink} />
              </View>
              <Text size={Math.round(13 * k)} color={P.ink} style={{ textAlign: 'center' }}>
                {a.label}
              </Text>
            </Touchable>
          ))}
        </View>
      </Appear>
      <View style={[styles.footer, { bottom: 28, left: 32, right: 32 }]}>
        <Icon name="lock-closed-outline" size={S.small} color={P.sub} />
        <Text size={S.small} color={P.sub} lines={1}>
          {footer}
        </Text>
      </View>
    </View>
  );
}

function ChatsEmpty({
  P,
  S,
  onNew,
  onContact,
  onCalls,
}: {
  P: Palette;
  S: Sizes;
  onNew: () => void;
  onContact: () => void;
  onCalls: () => void;
}) {
  return (
    <EmptyCard
      P={P}
      S={S}
      icon="chatbubbles-outline"
      title="WhatsApp no GoClient"
      text="Converse com clientes e com a equipe pelo número compartilhado. O Lucas também avisa os clientes por aqui."
      cta={{ label: 'Nova conversa', onPress: onNew }}
      actions={[
        { icon: 'document-text-outline', label: 'Enviar documento' },
        { icon: 'person-add-outline', label: 'Adicionar contato', onPress: onContact },
        { icon: 'call-outline', label: 'Ligações', onPress: onCalls },
      ]}
      footer="Suas mensagens pessoais são protegidas com a criptografia de ponta a ponta"
    />
  );
}

/* ---------------- Conversa ---------------- */

function Conversation({
  P,
  S,
  chat,
  contact,
  blocked,
  finding,
  selecting,
  onBack,
  onProfile,
  onCall,
  onMenu,
  onFind,
  onSelect,
  onDeleteSelected,
  onSend,
  onUnblock,
}: {
  P: Palette;
  S: Sizes;
  chat: SimChat;
  contact: SimContact;
  blocked: boolean;
  finding: string | null;
  selecting: Set<string> | null;
  onBack: () => void;
  onProfile: () => void;
  onCall: () => void;
  onMenu: () => void;
  onFind: (q: string | null) => void;
  onSelect: (s: Set<string> | null) => void;
  onDeleteSelected: () => void;
  onSend: (text: string) => void;
  onUnblock: () => void;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [draft, setDraft] = useState('');
  const q = finding ? norm(finding) : '';
  const msgs = q ? chat.messages.filter((m) => norm(m.text).includes(q)) : chat.messages;

  let header: ReactNode;
  if (selecting)
    header = (
      <Header P={P} S={S} onBack={() => onSelect(null)} backIcon="close">
        <Text size={S.name} color={P.ink} style={{ flex: 1 }}>
          {selecting.size === 0
            ? 'Toque nas mensagens'
            : selecting.size === 1
              ? '1 selecionada'
              : `${selecting.size} selecionadas`}
        </Text>
        <IconButton
          P={P}
          S={S}
          name="trash-outline"
          label="Apagar selecionadas"
          color={selecting.size ? P.red : P.sub}
          onPress={selecting.size ? onDeleteSelected : undefined}
        />
      </Header>
    );
  else if (finding !== null)
    header = (
      <Header P={P} S={S} onBack={() => onFind(null)} backIcon="close">
        <View style={{ flex: 1 }}>
          <SearchField
            P={P}
            S={{ ...S, pad: 0 }}
            value={finding}
            onChange={(v) => onFind(v)}
            placeholder="Pesquisar nesta conversa"
            autoFocus
          />
        </View>
      </Header>
    );
  else
    header = (
      <Header P={P} S={S} onBack={S.phone ? onBack : undefined}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dados do contato"
          onPress={onProfile}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 20 }}
        >
          <Avatar P={P} name={contact.name} size={S.avatar - 16} group={!!contact.members} />
          <View style={{ flex: 1 }}>
            <Text size={S.name} color={P.ink} lines={1}>
              {contact.name}
            </Text>
            <Text size={S.small} color={P.sub} lines={1}>
              {contact.members ? contact.members.join(', ') : contact.phone}
            </Text>
          </View>
        </Pressable>
        <IconButton P={P} S={S} name="call-outline" label="Ligação de voz" onPress={onCall} />
        {!S.phone && (
          <IconButton P={P} S={S} name="search" label="Pesquisar" onPress={() => onFind('')} />
        )}
        <IconButton
          P={P}
          S={S}
          name="ellipsis-vertical"
          label="Opções da conversa"
          onPress={onMenu}
        />
      </Header>
    );

  return (
    <View style={{ flex: 1, backgroundColor: P.wall }}>
      <View style={{ backgroundColor: P.head, borderBottomWidth: 1, borderBottomColor: P.line }}>
        {header}
      </View>
      <ScrollView
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{
          paddingHorizontal: Math.round(48 * S.k),
          paddingVertical: S.pad,
          gap: Math.round(3 * S.k),
          flexGrow: 1,
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={[
            styles.dayPill,
            {
              backgroundColor: P.dark ? '#1D1F1F' : '#FFEECD',
              alignSelf: 'center',
              maxWidth: 640,
              marginBottom: 8,
            },
          ]}
        >
          <Icon name="lock-closed" size={S.small} color={P.dark ? '#FFD279' : '#54656F'} />
          <Text
            size={S.small}
            color={P.dark ? '#FFD279' : '#54656F'}
            style={{ textAlign: 'center' }}
          >
            As mensagens são protegidas com a criptografia de ponta a ponta.
          </Text>
        </View>
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const newDay = m.day !== prev?.day;
          // Rabinho só no primeiro balão de cada sequência do mesmo lado (como no WhatsApp).
          const tail = newDay || prev?.out !== m.out;
          return (
            <View key={m.id} style={{ gap: Math.round(3 * S.k), marginTop: tail && i > 0 ? 9 : 0 }}>
              {newDay && (
                <View
                  style={[
                    styles.dayPill,
                    styles.bubbleShadow,
                    { backgroundColor: P.in, alignSelf: 'center', marginVertical: 9 },
                  ]}
                >
                  <Text size={S.small} color={P.sub}>
                    {m.day}
                  </Text>
                </View>
              )}
              <Bubble
                P={P}
                S={S}
                msg={m}
                tail={tail}
                group={!!contact.members}
                selected={selecting?.has(m.id)}
                selecting={!!selecting}
                onPress={
                  selecting
                    ? () => {
                        const next = new Set(selecting);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        onSelect(next);
                      }
                    : undefined
                }
              />
            </View>
          );
        })}
        {!!q && !msgs.length && (
          <Text size={S.sub} color={P.sub} style={{ textAlign: 'center' }}>
            Nenhuma mensagem com "{finding}".
          </Text>
        )}
      </ScrollView>
      {blocked ? (
        <Pressable
          accessibilityRole="button"
          onPress={onUnblock}
          style={[styles.center, { backgroundColor: P.bar, paddingVertical: 28, gap: 6 }]}
        >
          <Text size={S.sub} color={P.sub}>
            Você bloqueou este contato.
          </Text>
          <Text size={S.sub} weight="medium" color={P.greenInk}>
            Toque para desbloquear
          </Text>
        </Pressable>
      ) : (
        <Composer
          P={P}
          S={S}
          value={draft}
          onChange={setDraft}
          onSend={() => {
            if (!draft.trim()) return;
            onSend(draft.trim());
            setDraft('');
          }}
        />
      )}
    </View>
  );
}

function Bubble({
  P,
  S,
  msg,
  group,
  tail,
  selected,
  selecting,
  onPress,
}: {
  P: Palette;
  S: Sizes;
  msg: SimMessage;
  group: boolean;
  tail: boolean;
  selected?: boolean;
  selecting: boolean;
  onPress?: () => void;
}) {
  const R = Math.round(7.5 * S.k);
  const bg = msg.out ? P.out : P.in;
  const TW = Math.round(8 * S.k);
  const TH = Math.round(13 * S.k);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderRadius: R,
        backgroundColor: selected
          ? P.dark
            ? 'rgba(0,168,132,0.18)'
            : 'rgba(0,168,132,0.12)'
          : 'transparent',
        paddingHorizontal: selecting ? 10 : 0,
      }}
    >
      {selecting && (
        <Icon
          name={selected ? 'checkbox' : 'square-outline'}
          size={S.icon * 0.9}
          color={selected ? P.green : P.sub}
        />
      )}
      <View style={{ flex: 1, alignItems: msg.out ? 'flex-end' : 'flex-start' }}>
        <View
          style={[
            styles.bubbleShadow,
            {
              maxWidth: '65%',
              backgroundColor: bg,
              borderRadius: R,
              borderTopRightRadius: tail && msg.out ? 0 : R,
              borderTopLeftRadius: tail && !msg.out ? 0 : R,
              paddingLeft: Math.round(9 * S.k),
              paddingRight: Math.round(7 * S.k),
              paddingTop: Math.round(6 * S.k),
              paddingBottom: Math.round(6 * S.k),
              gap: 4,
            },
          ]}
        >
          {tail && (
            // "Rabinho" do balão: triângulo no canto de cima, do lado de quem enviou.
            <View
              style={{
                position: 'absolute',
                top: 0,
                width: 0,
                height: 0,
                borderTopWidth: TH,
                borderTopColor: bg,
                ...(msg.out
                  ? { right: -TW, borderRightWidth: TW, borderRightColor: 'transparent' }
                  : { left: -TW, borderLeftWidth: TW, borderLeftColor: 'transparent' }),
              }}
            />
          )}
          {group && !msg.out && msg.from && tail && (
            <Text size={S.small + 1} weight="semibold" color={P.groupInk}>
              {msg.from}
            </Text>
          )}
          {msg.kind === 'photo' && (
            <View
              style={{
                width: Math.round(240 * S.k),
                height: Math.round(160 * S.k),
                borderRadius: R - 2,
                backgroundColor: P.dark ? '#2A3942' : '#E9EDEF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="image-outline" size={72} color={P.sub} />
            </View>
          )}
          {msg.kind === 'call' && (
            // Balão da ligação, como no WhatsApp Web: ícone redondo + "Ligação de voz".
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Math.round(12 * S.k),
                paddingVertical: Math.round(10 * S.k),
                paddingLeft: Math.round(10 * S.k),
                paddingRight: Math.round(40 * S.k),
                borderRadius: R - 2,
                backgroundColor: P.dark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.04)',
              }}
            >
              <View
                style={[
                  styles.center,
                  {
                    width: Math.round(36 * S.k),
                    height: Math.round(36 * S.k),
                    borderRadius: 18 * S.k,
                    backgroundColor: P.panel,
                  },
                ]}
              >
                <Icon name="call" size={Math.round(18 * S.k)} color={P.green} />
              </View>
              <View>
                <Text size={S.name} color={P.ink}>
                  {msg.text}
                </Text>
                <Text size={S.small} color={P.sub}>
                  {msg.out ? 'Efetuada' : 'Recebida'}
                </Text>
              </View>
            </View>
          )}
          {msg.kind === 'doc' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: Math.round(10 * S.k),
                borderRadius: R - 2,
                backgroundColor: P.dark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.04)',
              }}
            >
              <Icon name="document-text" size={44} color={P.red} />
              <View>
                <Text size={S.sub} color={P.ink}>
                  {msg.text}.pdf
                </Text>
                <Text size={S.small} color={P.sub}>
                  PDF · 2 páginas
                </Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
            {msg.kind !== 'doc' && msg.kind !== 'call' && (
              <Text size={S.sub} color={P.ink} style={{ flexShrink: 1 }}>
                {msg.text}
              </Text>
            )}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                marginLeft: 'auto',
                marginBottom: -2,
              }}
            >
              <Text size={Math.round(11 * S.k)} color={P.sub}>
                {msg.time}
              </Text>
              {msg.out && <Icon name="checkmark-done" size={Math.round(16 * S.k)} color={P.tick} />}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Composer({
  P,
  S,
  value,
  onChange,
  onSend,
}: {
  P: Palette;
  S: Sizes;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}) {
  const h = Math.round(52 * S.k);
  const has = value.trim().length > 0;
  return (
    <View
      style={{
        paddingHorizontal: Math.round(12 * S.k),
        paddingBottom: Math.round(12 * S.k),
        paddingTop: 4,
      }}
    >
      <View
        style={{
          minHeight: h,
          borderRadius: h / 2,
          backgroundColor: P.dark ? P.in : '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 4,
          shadowColor: '#0B141A',
          shadowOpacity: P.dark ? 0 : 0.1,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        <IconButton P={P} S={S} name="add" label="Anexar" />
        <IconButton P={P} S={S} name="happy-outline" label="Emojis e figurinhas" />
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSend}
          placeholder="Digite uma mensagem"
          placeholderTextColor={P.sub}
          style={[styles.input, { color: P.ink, fontSize: S.sub }]}
        />
        {has ? (
          <IconButton P={P} S={S} name="send" label="Enviar" filled onPress={onSend} />
        ) : (
          <IconButton P={P} S={S} name="mic-outline" label="Gravar áudio" />
        )}
      </View>
    </View>
  );
}

/* ---------------- Menu da conversa ---------------- */

function ChatMenu({
  P,
  S,
  blocked,
  onClose,
  onPick,
}: {
  P: Palette;
  S: Sizes;
  blocked: boolean;
  onClose: () => void;
  onPick: (k: 'find' | 'select' | 'block' | 'clear' | 'delete') => void;
}) {
  const R = Math.round(16 * S.k);
  const PAD = Math.round(6 * S.k);
  const items: {
    k: 'find' | 'select' | 'block' | 'clear' | 'delete';
    icon: IconName;
    label: string;
    red?: boolean;
  }[] = [
    { k: 'find', icon: 'search', label: 'Pesquisar' },
    { k: 'select', icon: 'checkbox-outline', label: 'Selecionar mensagens' },
    { k: 'block', icon: 'ban-outline', label: blocked ? 'Desbloquear' : 'Bloquear', red: !blocked },
    { k: 'clear', icon: 'remove-circle-outline', label: 'Limpar conversa', red: true },
    { k: 'delete', icon: 'trash-outline', label: 'Apagar conversa', red: true },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Fechar menu"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: 'absolute',
          top: S.head - 6,
          right: Math.round(10 * S.k),
          width: Math.round(240 * S.k),
          backgroundColor: P.menu,
          borderRadius: R,
          padding: PAD,
          shadowColor: '#0B141A',
          shadowOpacity: 0.2,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
        }}
      >
        {items.map((it, i) => (
          <View key={it.k}>
            {i === 2 && (
              <View
                style={{
                  height: 1,
                  backgroundColor: P.line,
                  marginVertical: PAD,
                  marginHorizontal: PAD * 2,
                }}
              />
            )}
            <Touchable
              accessibilityRole="menuitem"
              accessibilityLabel={it.label}
              onPress={() => onPick(it.k)}
              scaleTo={0.98}
              style={{
                height: Math.max(Math.round(40 * S.k), 64),
                borderRadius: R - PAD,
                flexDirection: 'row',
                alignItems: 'center',
                gap: Math.round(14 * S.k),
                paddingHorizontal: Math.round(12 * S.k),
              }}
            >
              <Icon
                name={it.icon}
                size={Math.round(20 * S.k)}
                color={it.red ? P.red : P.dark ? P.ink : '#3B4A54'}
              />
              <Text size={S.sub} color={it.red ? P.red : P.dark ? P.ink : '#3B4A54'}>
                {it.label}
              </Text>
            </Touchable>
          </View>
        ))}
      </View>
    </View>
  );
}

function ConfirmDialog({
  P,
  S,
  confirm,
  name,
  blocked,
  onCancel,
  onConfirm,
}: {
  P: Palette;
  S: Sizes;
  confirm: NonNullable<Confirm>;
  name: string;
  blocked: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const R = Math.round(24 * S.k);
  const PAD = Math.round(24 * S.k);
  const text = {
    block: blocked
      ? {
          title: `Desbloquear ${name}?`,
          body: 'Vocês voltam a trocar mensagens e ligações.',
          ok: 'Desbloquear',
        }
      : {
          title: `Bloquear ${name}?`,
          body: 'Contatos bloqueados não podem mais ligar nem mandar mensagens para o número da equipe.',
          ok: 'Bloquear',
        },
    clear: {
      title: `Limpar a conversa com ${name}?`,
      body: 'As mensagens somem desta conversa, mas a conversa continua na lista.',
      ok: 'Limpar conversa',
    },
    delete: {
      title: `Apagar a conversa com ${name}?`,
      body: 'A conversa e as mensagens saem da lista deste aparelho.',
      ok: 'Apagar conversa',
    },
  }[confirm.kind];
  const btn = Math.max(Math.round(40 * S.k), 72);
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: P.scrim }]}>
      <View
        style={{
          width: Math.round(440 * S.k),
          backgroundColor: P.menu,
          borderRadius: R,
          padding: PAD,
          gap: 14,
        }}
      >
        <Text size={S.name + 2} color={P.ink}>
          {text.title}
        </Text>
        <Text size={S.sub} color={P.sub}>
          {text.body}
        </Text>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 16 }}>
          <Touchable
            accessibilityRole="button"
            onPress={onCancel}
            scaleTo={0.97}
            style={[
              styles.center,
              { flex: 1, height: btn, borderRadius: btn / 2, backgroundColor: P.soft },
            ]}
          >
            <Text size={S.sub} weight="medium" color={P.ink}>
              Cancelar
            </Text>
          </Touchable>
          <Touchable
            accessibilityRole="button"
            onPress={onConfirm}
            scaleTo={0.97}
            style={[
              styles.center,
              {
                flex: 1,
                height: btn,
                borderRadius: btn / 2,
                backgroundColor: confirm.kind === 'block' && blocked ? P.green : P.red,
              },
            ]}
          >
            <Text size={S.sub} weight="medium" color="#FFFFFF">
              {text.ok}
            </Text>
          </Touchable>
        </View>
      </View>
    </View>
  );
}

/* ---------------- Dados do contato ---------------- */

function Profile({
  P,
  S,
  contact,
  chat,
  blocked,
  onClose,
  onCall,
  onFind,
  onFavorite,
  onAsk,
  onUnblock,
}: {
  P: Palette;
  S: Sizes;
  contact: SimContact;
  chat: SimChat;
  blocked: boolean;
  onClose: () => void;
  onCall: () => void;
  onFind: () => void;
  onFavorite: () => void;
  onAsk: (k: 'block' | 'clear' | 'delete') => void;
  onUnblock: () => void;
}) {
  const [muted, setMuted] = useState(false);
  const group = !!contact.members;
  const media = chat.messages.filter((m) => m.kind && m.kind !== 'call').length;
  const action = (icon: IconName, label: string, onPress?: () => void) => (
    <Touchable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.94}
      style={{ width: Math.round(76 * S.k), alignItems: 'center', gap: Math.round(8 * S.k) }}
    >
      <View
        style={[
          styles.center,
          {
            width: Math.round(60 * S.k),
            height: Math.round(60 * S.k),
            borderRadius: 30 * S.k,
            backgroundColor: P.soft,
          },
        ]}
      >
        <Icon name={icon} size={S.icon} color={P.ink} />
      </View>
      <Text size={Math.round(14 * S.k)} color={P.ink}>
        {label}
      </Text>
    </Touchable>
  );
  const line = (
    icon: IconName,
    title: string,
    sub?: string,
    opts: { red?: boolean; right?: ReactNode; onPress?: () => void } = {},
  ) => (
    <Row
      key={title}
      P={P}
      S={S}
      onPress={opts.onPress}
      left={
        <View style={{ width: 48, alignItems: 'center' }}>
          <Icon name={icon} size={S.icon * 0.85} color={opts.red ? P.red : P.sub} />
        </View>
      }
      title={title}
      titleColor={opts.red ? P.red : undefined}
      subtitle={sub}
      right={opts.right}
    />
  );
  const sep = (k: string) => (
    <View
      key={k}
      style={{ height: 1, backgroundColor: P.line, marginVertical: 12, marginHorizontal: S.pad }}
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: P.panel }}>
      <Header P={P} S={S} onBack={onClose} backIcon="close">
        <Text size={S.name} color={P.ink} style={{ flex: 1 }}>
          {group ? 'Dados do grupo' : 'Dados do contato'}
        </Text>
        <IconButton P={P} S={S} name="pencil" label="Editar contato" />
      </Header>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Appear style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
          <Avatar P={P} name={contact.name} size={Math.round(140 * S.k)} group={group} />
          <Text size={Math.round(24 * S.k)} color={P.ink} style={{ marginTop: 12 }}>
            {contact.name}
          </Text>
          <Text size={S.sub} color={P.sub}>
            {group ? `Grupo · ${contact.members?.length ?? 0} participantes` : contact.phone}
          </Text>
          <View style={{ flexDirection: 'row', gap: Math.round(16 * S.k), marginTop: 16 }}>
            {action('call-outline', 'Ligar', onCall)}
            {action('search', 'Pesquisar', onFind)}
          </View>
        </Appear>
        {sep('s0')}
        {!!contact.about && line('information-circle-outline', contact.about, 'Recado')}
        {line('images-outline', 'Mídia, links e docs', undefined, {
          right: (
            <Text size={S.sub} color={P.sub}>
              {media}
            </Text>
          ),
        })}
        {media > 0 && (
          <View
            style={{ flexDirection: 'row', gap: 12, paddingHorizontal: S.pad, paddingBottom: 12 }}
          >
            {chat.messages
              .filter((m) => m.kind && m.kind !== 'call')
              .map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.center,
                    { width: 150, height: 150, borderRadius: 20, backgroundColor: P.field },
                  ]}
                >
                  <Icon
                    name={m.kind === 'photo' ? 'image-outline' : 'document-text-outline'}
                    size={48}
                    color={P.sub}
                  />
                </View>
              ))}
          </View>
        )}
        {sep('s1')}
        {line('notifications-outline', 'Silenciar notificações', undefined, {
          right: <SimSwitch P={P} S={S} value={muted} onChange={setMuted} />,
        })}
        {line('timer-outline', 'Mensagens temporárias', 'Desativadas')}
        {line(
          'lock-closed-outline',
          'Criptografia',
          'As mensagens são protegidas com a criptografia de ponta a ponta.',
        )}
        {sep('s2')}
        {group ? (
          <>
            <Text
              size={S.small}
              color={P.sub}
              style={{ paddingHorizontal: S.pad, paddingVertical: 12 }}
            >
              {contact.members?.length} participantes
            </Text>
            {contact.members?.map((m) => (
              <Row
                key={m}
                P={P}
                S={S}
                left={<Avatar P={P} name={m === 'Você' ? ME.name : m} size={S.avatar - 8} />}
                title={m}
                subtitle={m === 'Você' ? ME.phone : 'Equipe'}
              />
            ))}
          </>
        ) : (
          <>
            <Text
              size={S.small}
              color={P.sub}
              style={{ paddingHorizontal: S.pad, paddingVertical: 12 }}
            >
              1 grupo em comum
            </Text>
            <Row
              P={P}
              S={S}
              left={<Avatar P={P} name="Clientes" size={S.avatar - 8} group />}
              title="Clientes da semana"
              subtitle={`${contact.name.split(' ')[0]}, Carla, Diego, Você`}
            />
          </>
        )}
        {sep('s3')}
        {line(
          contact.favorite ? 'heart' : 'heart-outline',
          contact.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
          undefined,
          {
            onPress: onFavorite,
          },
        )}
        {line('remove-circle-outline', 'Limpar conversa', undefined, {
          red: true,
          onPress: () => onAsk('clear'),
        })}
        {!group &&
          line(
            'ban-outline',
            blocked ? `Desbloquear ${contact.name}` : `Bloquear ${contact.name}`,
            undefined,
            {
              red: !blocked,
              onPress: blocked ? onUnblock : () => onAsk('block'),
            },
          )}
        {line('trash-outline', 'Apagar conversa', undefined, {
          red: true,
          onPress: () => onAsk('delete'),
        })}
      </ScrollView>
    </View>
  );
}

/* ---------------- Nova conversa e novo contato ---------------- */

function NewChat({
  P,
  S,
  contacts,
  onBack,
  onNewContact,
  onPick,
}: {
  P: Palette;
  S: Sizes;
  contacts: SimContact[];
  onBack: () => void;
  onNewContact: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const people = useMemo(
    () =>
      contacts
        .filter((c) => !c.members && (!q || norm(`${c.name} ${c.phone}`).includes(norm(q))))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [contacts, q],
  );
  const greenTile = (icon: IconName) => (
    <View
      style={[
        styles.center,
        { width: S.avatar, height: S.avatar, borderRadius: S.avatar / 2, backgroundColor: P.green },
      ]}
    >
      <Icon name={icon} size={S.avatar * 0.44} color="#FFFFFF" />
    </View>
  );
  return (
    <Appear axis="x" distance={-24} style={{ flex: 1 }}>
      <Header P={P} S={S} onBack={onBack}>
        <Text size={S.name} color={P.ink} style={{ flex: 1 }}>
          Nova conversa
        </Text>
      </Header>
      <SearchField P={P} S={S} value={q} onChange={setQ} placeholder="Pesquisar nome ou número" />
      <ScrollView
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {!q && (
          <>
            <Row P={P} S={S} left={greenTile('people')} title="Novo grupo" />
            <Row
              P={P}
              S={S}
              left={greenTile('person-add')}
              title="Novo contato"
              onPress={onNewContact}
            />
            <Row
              P={P}
              S={S}
              left={<Avatar P={P} name={ME.name} size={S.avatar} />}
              title={`${ME.name} (você)`}
              subtitle="Mensagens para mim"
            />
          </>
        )}
        {people.map((c, i) => {
          const letter = c.name[0]?.toUpperCase() ?? '#';
          const head = letter !== people[i - 1]?.name[0]?.toUpperCase();
          return (
            <View key={c.id}>
              {head && (
                <Text
                  size={S.small}
                  color={P.greenInk}
                  style={{ paddingHorizontal: S.pad, paddingTop: 22, paddingBottom: 8 }}
                >
                  {letter}
                </Text>
              )}
              <Row
                P={P}
                S={S}
                left={<Avatar P={P} name={c.name} size={S.avatar} />}
                title={c.name}
                subtitle={c.about ?? c.phone}
                onPress={() => onPick(c.id)}
              />
            </View>
          );
        })}
      </ScrollView>
    </Appear>
  );
}

function NewContact({
  P,
  S,
  onBack,
  onSave,
}: {
  P: Palette;
  S: Sizes;
  onBack: () => void;
  onSave: (c: SimContact) => void;
}) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [number, setNumber] = useState('');
  const [sync, setSync] = useState(true);
  const digits = number.replace(/\D/g, '');
  const ready = first.trim().length > 0 && digits.length >= 10;
  const field = (
    icon: IconName | null,
    label: string,
    value: string,
    onChange: (v: string) => void,
    numeric?: boolean,
  ) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 20 }}>
      <View style={{ width: 48, alignItems: 'center', paddingBottom: 16 }}>
        {icon && <Icon name={icon} size={S.icon * 0.85} color={P.sub} />}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text size={S.small} color={P.sub}>
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={numeric ? 'phone-pad' : 'default'}
          placeholderTextColor={P.sub}
          style={[
            styles.input,
            {
              flex: 0,
              color: P.ink,
              fontSize: S.name,
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: value ? P.green : P.line,
            },
          ]}
        />
      </View>
    </View>
  );
  const btn = S.phone ? 84 : 96;
  return (
    <Appear axis="x" distance={-24} style={{ flex: 1 }}>
      <Header P={P} S={S} onBack={onBack}>
        <Text size={S.name} color={P.ink} style={{ flex: 1 }}>
          Novo contato
        </Text>
      </Header>
      <ScrollView
        contentContainerStyle={{ padding: S.pad, gap: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {field('person-outline', 'Nome', first, setFirst)}
        {field(null, 'Sobrenome', last, setLast)}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 20 }}>
          <View style={{ width: 48, alignItems: 'center', paddingBottom: 16 }}>
            <Icon name="call-outline" size={S.icon * 0.85} color={P.sub} />
          </View>
          <View style={{ gap: 6 }}>
            <Text size={S.small} color={P.sub}>
              País
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor: P.line,
              }}
            >
              <Text size={S.name} color={P.ink}>
                BR +55
              </Text>
              <Icon name="chevron-down" size={S.small} color={P.sub} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            {field(null, 'Número de telefone', number, setNumber, true)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <View style={{ width: 48, alignItems: 'center' }}>
            <Icon name="sync-outline" size={S.icon * 0.85} color={P.sub} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text size={S.sub} color={P.ink}>
              Sincronizar contato com celular
            </Text>
            <Text size={S.small} color={P.sub}>
              O contato também vai para a agenda do celular dono do número.
            </Text>
          </View>
          <SimSwitch P={P} S={S} value={sync} onChange={setSync} />
        </View>
        <Touchable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={() => {
            const name = `${first.trim()} ${last.trim()}`.trim();
            onSave({
              id: `n-${Date.now()}`,
              name,
              phone: `+55 ${digits.slice(0, 2)} ${digits.slice(2, -4)}-${digits.slice(-4)}`,
            });
          }}
          scaleTo={0.97}
          style={[
            styles.center,
            {
              height: btn,
              borderRadius: btn / 2,
              backgroundColor: ready ? P.green : P.field,
              marginTop: 8,
            },
          ]}
        >
          <Text size={S.sub + 1} weight="semibold" color={ready ? '#FFFFFF' : P.sub}>
            Salvar contato
          </Text>
        </Touchable>
      </ScrollView>
    </Appear>
  );
}

/* ---------------- Ligações ---------------- */

const CALL_ICON: Record<SimCall['kind'], IconName> = {
  missed: 'arrow-down',
  in: 'arrow-down',
  out: 'arrow-up',
};

function CallsList({
  P,
  S,
  contacts,
  contactOf,
  selected,
  onSelect,
  onCall,
  unread,
  onToggle,
}: {
  P: Palette;
  S: Sizes;
  contacts: SimContact[];
  contactOf: (id: string) => SimContact | undefined;
  selected: string | null;
  onSelect: (id: string) => void;
  onCall: (id: string) => void;
  unread: number;
  onToggle: () => void;
}) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  // Favoritos vêm da agenda atual (quem foi favoritado nos dados do contato aparece aqui).
  const favorites = contacts.filter((c) => c.favorite);
  const recent = CALLS.filter(
    (k) => !q || norm(contactOf(k.contact)?.name ?? '').includes(norm(q)),
  );
  return (
    <View style={{ flex: 1 }}>
      <Header P={P} S={S}>
        {/* O título continua "WhatsApp" também nas Ligações (pedido do usuário). */}
        <Wordmark P={P} S={S} />
        <View>
          <IconButton
            P={P}
            S={S}
            name="chatbubble-ellipses-outline"
            label="Voltar para Conversas"
            onPress={onToggle}
          />
          {unread > 0 && (
            <View
              pointerEvents="none"
              style={[
                styles.badge,
                {
                  backgroundColor: P.green,
                  top: 4,
                  right: 4,
                  minWidth: Math.round(18 * S.k),
                  height: Math.round(18 * S.k),
                  borderRadius: 9 * S.k,
                  borderWidth: 2,
                  borderColor: P.panel,
                },
              ]}
            >
              <Text size={S.small - 2} weight="semibold" color={P.dark ? '#111B21' : '#FFFFFF'}>
                {unread}
              </Text>
            </View>
          )}
        </View>
        <IconButton P={P} S={S} name="call" label="Nova ligação" filled />
      </Header>
      <SearchField P={P} S={S} value={q} onChange={setQ} placeholder="Pesquisar nome ou número" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {!q && (
          <>
            <View style={[styles.section, { paddingHorizontal: S.pad }]}>
              <Text size={S.sub} weight="semibold" color={P.ink}>
                Favoritos
              </Text>
              <Pill
                P={P}
                S={S}
                label={all ? 'Mostrar menos' : 'Mostrar tudo'}
                onPress={() => setAll(!all)}
              />
            </View>
            {(all ? favorites : favorites.slice(0, 1)).map((c) => (
              <Row
                key={c.id}
                P={P}
                S={S}
                left={<Avatar P={P} name={c.name} size={S.avatar} />}
                title={c.name}
                right={
                  <View style={{ flexDirection: 'row' }}>
                    <IconButton
                      P={P}
                      S={S}
                      name="call-outline"
                      label={`Ligar para ${c.name}`}
                      onPress={() => onCall(c.id)}
                    />
                  </View>
                }
              />
            ))}
          </>
        )}
        <View style={[styles.section, { paddingHorizontal: S.pad }]}>
          <Text size={S.sub} weight="semibold" color={P.ink}>
            Recentes
          </Text>
        </View>
        {recent.map((k) => {
          const who = contactOf(k.contact);
          if (!who) return null;
          const missed = k.kind === 'missed';
          return (
            <Row
              key={k.id}
              P={P}
              S={S}
              selected={selected === k.id}
              onPress={() => onSelect(k.id)}
              left={<Avatar P={P} name={who.name} size={S.avatar} />}
              title={who.name}
              subtitle={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name={CALL_ICON[k.kind]} size={S.small} color={missed ? P.red : P.sub} />
                  <Text size={S.sub} color={missed ? P.red : P.sub}>
                    {missed
                      ? 'Ligação perdida'
                      : k.kind === 'out'
                        ? 'Ligação efetuada'
                        : 'Ligação recebida'}
                  </Text>
                </View>
              }
              right={
                <Text
                  size={S.small}
                  color={P.sub}
                  style={{ alignSelf: 'flex-start', paddingTop: 30 }}
                >
                  {k.when}
                </Text>
              }
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function CallsEmpty({ P, S }: { P: Palette; S: Sizes }) {
  return (
    <EmptyCard
      P={P}
      S={S}
      icon="call-outline"
      title="Ligações de voz"
      text="Ligue para clientes e para a equipe pelo número compartilhado."
      cta={{ label: 'Iniciar ligação' }}
      actions={[
        { icon: 'person-add-outline', label: 'Ligar para um contato' },
        { icon: 'link-outline', label: 'Novo link de ligação' },
        { icon: 'keypad-outline', label: 'Ligar para um número' },
      ]}
      footer="Suas ligações pessoais são protegidas com a criptografia de ponta a ponta"
    />
  );
}

function CallDetail({
  P,
  S,
  call,
  contactOf,
  onClose,
  onMessage,
  onCall,
}: {
  P: Palette;
  S: Sizes;
  call: SimCall;
  contactOf: (id: string) => SimContact | undefined;
  onClose: () => void;
  onMessage: (id: string) => void;
  onCall: (id: string) => void;
}) {
  const who = contactOf(call.contact);
  const R = 32;
  return (
    <View style={{ flex: 1, backgroundColor: P.panel }}>
      <Header P={P} S={S}>
        {S.phone && <IconButton P={P} S={S} name="arrow-back" label="Voltar" onPress={onClose} />}
        <Text size={S.name} color={P.ink} style={{ flex: 1 }}>
          Dados da ligação
        </Text>
        {!S.phone && <IconButton P={P} S={S} name="close" label="Fechar" onPress={onClose} />}
      </Header>
      <Appear key={call.id} style={{ paddingHorizontal: S.pad }}>
        <View style={{ borderWidth: 1, borderColor: P.line, borderRadius: R, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, padding: 20 }}>
            <Avatar P={P} name={who?.name ?? ''} size={S.avatar} />
            <Text size={S.name} color={P.ink} style={{ flex: 1 }} lines={1}>
              {who?.name}
            </Text>
            <IconButton
              P={P}
              S={S}
              name="chatbox-outline"
              label="Mensagem"
              onPress={() => onMessage(call.contact)}
            />
            <IconButton
              P={P}
              S={S}
              name="call-outline"
              label="Ligar"
              onPress={() => onCall(call.contact)}
            />
          </View>
          <View style={{ height: 1, backgroundColor: P.line }} />
          <View style={{ padding: 24, gap: 18 }}>
            <Text size={S.small} color={P.sub}>
              {call.day}
            </Text>
            {call.entries.map((e) => (
              <View key={e.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Icon
                  name={call.kind === 'out' ? 'arrow-up' : 'arrow-down'}
                  size={S.small + 2}
                  color={call.kind === 'missed' ? P.red : P.ink}
                />
                <Text size={S.sub} color={P.ink} style={{ flex: 1 }}>
                  {e.label}
                </Text>
                {!!e.duration && (
                  <Text size={S.small} color={P.sub}>
                    {e.duration}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </Appear>
    </View>
  );
}

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  center: { alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    fontFamily: FONT.displayRegular,
    paddingVertical: 0,
    // Web: sem o contorno azul do navegador.
    outlineStyle: 'none',
  } as object,
  badge: {
    position: 'absolute',
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 11,
  },
  // Sombra dos balões do WhatsApp: 0 1px 0.5px rgba(11,20,26,0.13).
  bubbleShadow: {
    shadowColor: '#0B141A',
    shadowOpacity: 0.13,
    shadowRadius: 0.5,
    shadowOffset: { width: 0, height: 1 },
  },
  footer: {
    position: 'absolute',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: 10,
  },
});
