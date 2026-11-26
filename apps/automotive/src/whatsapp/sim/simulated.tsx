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
import { Animated, Easing, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../kyte/ui';
import { usePhone } from '../../layout/form-factor';
import { concentric, FONT, useColors } from '../../theme';
import { Appear, Presence } from '../../ui/motion';
import { Switch, Touchable } from '../../ui/primitives';
import {
  CALLS,
  CHATS,
  CONTACTS,
  initials,
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
 */
type IconName = ComponentProps<typeof Ionicons>['name'];

/** Cores do WhatsApp (claro e escuro), para o simulado parecer o app de verdade. */
function usePalette() {
  const dark = useColors().mode === 'dark';
  return dark
    ? {
        dark,
        wall: '#0B141A',
        panel: '#111B21',
        bar: '#202C33',
        field: '#202C33',
        line: 'rgba(134,150,160,0.15)',
        ink: '#E9EDEF',
        sub: '#8696A0',
        green: '#00A884',
        greenInk: '#25D366',
        chipOn: '#0A332C',
        out: '#005C4B',
        in: '#202C33',
        red: '#F15C6D',
        press: '#2A3942',
        avatar: '#6A7175',
        avatarInk: '#CFD4D6',
        tick: '#53BDEB',
        scrim: 'rgba(0,0,0,0.5)',
      }
    : {
        dark,
        wall: '#EFEAE2',
        panel: '#FFFFFF',
        bar: '#F0F2F5',
        field: '#F0F2F5',
        line: '#E9EDEF',
        ink: '#111B21',
        sub: '#667781',
        green: '#00A884',
        greenInk: '#008069',
        chipOn: '#D9FDD3',
        out: '#D9FDD3',
        in: '#FFFFFF',
        red: '#EA0038',
        press: '#F5F6F6',
        avatar: '#DFE5E7',
        avatarInk: '#667781',
        tick: '#53BDEB',
        scrim: 'rgba(11,20,26,0.35)',
      };
}
type Palette = ReturnType<typeof usePalette>;

/** Medidas: multimídia (1600×900, alvos de toque grandes) e celular. */
function useSizes() {
  const phone = usePhone();
  return phone
    ? {
        phone,
        rail: 0,
        list: 0,
        title: 34,
        name: 25,
        sub: 21,
        small: 17,
        icon: 30,
        rowH: 104,
        avatar: 72,
        pad: 22,
        head: 96,
        radius: 24,
      }
    : {
        phone,
        rail: 112,
        list: 600,
        title: 40,
        name: 30,
        sub: 25,
        small: 21,
        icon: 36,
        rowH: 124,
        avatar: 88,
        pad: 28,
        head: 112,
        radius: 28,
      };
}
type Sizes = ReturnType<typeof useSizes>;

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

  if (loading) return <Loading P={P} S={S} />;

  // Celular (por enquanto): uma coluna por vez. A versão do celular será desenhada depois.
  const showRight = tab === 'chats' ? !!chat : !!call;
  const leftPane =
    tab === 'calls' ? (
      <CallsList P={P} S={S} contactOf={contactOf} selected={call} onSelect={setCall} />
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
        onCalls={() => setTab('calls')}
      />
    );

  return (
    <Appear distance={0} style={[styles.root, { backgroundColor: P.panel }]}>
      {!S.phone && (
        <Rail
          P={P}
          S={S}
          tab={tab}
          unread={unreadTotal}
          onTab={(t) => {
            setTab(t);
            setMenu(false);
          }}
        />
      )}
      {(!S.phone || !showRight) && (
        <View
          style={[
            S.phone ? { flex: 1 } : { width: S.list },
            { borderRightWidth: S.phone ? 0 : 1, borderRightColor: P.line },
          ]}
        >
          {S.phone && <PhoneTabs P={P} S={S} tab={tab} onTab={setTab} />}
          {leftPane}
        </View>
      )}
      {(!S.phone || showRight) && <View style={{ flex: 1 }}>{rightPane}</View>}

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
  const box = S.icon + 36;
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
        backgroundColor: filled ? P.green : 'transparent',
      }}
    >
      <Icon name={name} size={S.icon} color={filled ? '#FFFFFF' : (color ?? P.ink)} />
    </Touchable>
  );
}

function Avatar({
  P,
  name,
  size,
  group,
}: {
  P: Palette;
  name: string;
  size: number;
  group?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: group ? (P.dark ? '#103529' : '#D9FDD3') : P.avatar,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {group ? (
        <Icon name="people" size={size * 0.46} color={P.greenInk} />
      ) : (
        <Text size={size * 0.36} weight="semibold" color={P.avatarInk}>
          {initials(name)}
        </Text>
      )}
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
  const h = S.phone ? 64 : 76;
  return (
    <View
      style={{
        height: h,
        borderRadius: h / 2,
        backgroundColor: P.field,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        gap: 16,
        marginHorizontal: S.pad,
      }}
    >
      <Icon name="search" size={S.icon * 0.8} color={P.sub} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={P.sub}
        autoFocus={autoFocus}
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
        gap: 8,
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
        marginHorizontal: 12,
        paddingHorizontal: S.pad - 12,
        borderRadius: concentric(S.radius, 6),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: selected ? P.press : 'transparent',
      }}
    >
      {left}
      <View style={{ flex: 1, gap: 4 }}>
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
  const h = S.phone ? 52 : 60;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      scaleTo={0.94}
      style={{
        height: h,
        paddingHorizontal: 24,
        borderRadius: h / 2,
        justifyContent: 'center',
        backgroundColor: on ? P.chipOn : 'transparent',
        borderWidth: 1,
        borderColor: on ? 'transparent' : P.line,
      }}
    >
      <Text size={S.small + 1} weight="medium" color={on ? P.greenInk : P.sub}>
        {label}
      </Text>
    </Touchable>
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

/* ---------------- Trilho (Conversas, Ligações) ---------------- */

function Rail({
  P,
  S,
  tab,
  unread,
  onTab,
}: {
  P: Palette;
  S: Sizes;
  tab: Tab;
  unread: number;
  onTab: (t: Tab) => void;
}) {
  const box = S.rail - 28;
  const item = (key: Tab, icon: IconName, iconOn: IconName, label: string, badge?: number) => {
    const on = tab === key;
    return (
      <Touchable
        key={key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={() => onTab(key)}
        scaleTo={0.9}
        style={{
          width: box,
          height: box,
          borderRadius: box / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? P.press : 'transparent',
        }}
      >
        <Icon name={on ? iconOn : icon} size={S.icon} color={on ? P.ink : P.sub} />
        {!!badge && (
          <View style={[styles.badge, { backgroundColor: P.greenInk, right: 2, top: 2 }]}>
            <Text size={18} weight="semibold" color={P.dark ? '#111B21' : '#FFFFFF'}>
              {badge}
            </Text>
          </View>
        )}
      </Touchable>
    );
  };
  return (
    <View
      style={{
        width: S.rail,
        backgroundColor: P.bar,
        alignItems: 'center',
        paddingTop: 24,
        gap: 14,
        borderRightWidth: 1,
        borderRightColor: P.line,
      }}
    >
      {item('chats', 'chatbox-ellipses-outline', 'chatbox-ellipses', 'Conversas', unread)}
      {item('calls', 'call-outline', 'call', 'Ligações')}
    </View>
  );
}

/** Celular: Conversas e Ligações em cima da lista (o trilho não cabe). */
function PhoneTabs({
  P,
  S,
  tab,
  onTab,
}: {
  P: Palette;
  S: Sizes;
  tab: Tab;
  onTab: (t: Tab) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: S.pad, paddingTop: 12 }}>
      <Pill P={P} S={S} label="Conversas" on={tab === 'chats'} onPress={() => onTab('chats')} />
      <Pill P={P} S={S} label="Ligações" on={tab === 'calls'} onPress={() => onTab('calls')} />
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
}: {
  P: Palette;
  S: Sizes;
  chats: SimChat[];
  contactOf: (id: string) => SimContact | undefined;
  open: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
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
        <Text size={S.title} weight="bold" color={P.greenInk} style={{ flex: 1 }}>
          WhatsApp
        </Text>
        <IconButton P={P} S={S} name="ellipsis-vertical" label="Mais opções" />
        <IconButton P={P} S={S} name="add" label="Nova conversa" filled onPress={onNew} />
      </Header>
      <SearchField
        P={P}
        S={S}
        value={q}
        onChange={setQ}
        placeholder="Pesquisar ou começar uma nova conversa"
      />
      <View
        style={{ flexDirection: 'row', gap: 12, paddingHorizontal: S.pad, paddingVertical: 18 }}
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
      </View>
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
                  style={{ alignItems: 'flex-end', gap: 8, alignSelf: 'stretch', paddingTop: 26 }}
                >
                  <Text size={S.small} color={c.unread ? P.greenInk : P.sub}>
                    {last?.day === 'Hoje' ? last.time : (last?.day ?? '')}
                  </Text>
                  {c.unread > 0 && (
                    <View
                      style={[styles.badge, { backgroundColor: P.greenInk, position: 'relative' }]}
                    >
                      <Text size={18} weight="semibold" color={P.dark ? '#111B21' : '#FFFFFF'}>
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
        <Icon name={msg.kind === 'photo' ? 'camera' : 'document-text'} size={S.sub} color={P.sub} />
      )}
      <Text size={S.sub} color={P.sub} lines={1} style={{ flex: 1 }}>
        {msg.from ? `${msg.from}: ` : ''}
        {msg.text}
      </Text>
    </View>
  );
}

/* ---------------- Painel vazio ---------------- */

function EmptyCard({
  P,
  S,
  icon,
  title,
  text,
  actions,
  footer,
}: {
  P: Palette;
  S: Sizes;
  icon: IconName;
  title: string;
  text: string;
  actions: { icon: IconName; label: string; primary?: boolean; onPress?: () => void }[];
  footer: string;
}) {
  const R = 40;
  const tile = S.phone ? 84 : 100;
  return (
    <View style={[styles.center, { flex: 1, backgroundColor: P.bar, padding: 48 }]}>
      <Appear style={[styles.center, { gap: 48 }]}>
        <View
          style={{
            width: S.phone ? 520 : 620,
            backgroundColor: P.panel,
            borderRadius: R,
            padding: 48,
            alignItems: 'center',
            gap: 18,
          }}
        >
          <View
            style={{
              width: 128,
              height: 128,
              borderRadius: concentric(R, 8),
              backgroundColor: P.chipOn,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <Icon name={icon} size={64} color={P.greenInk} />
          </View>
          <Text size={S.title - 4} color={P.ink} style={{ textAlign: 'center' }}>
            {title}
          </Text>
          <Text size={S.sub} color={P.sub} style={{ textAlign: 'center' }}>
            {text}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {actions.map((a) => (
            <Touchable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={a.onPress}
              scaleTo={0.92}
              style={{ alignItems: 'center', gap: 14, width: 196 }}
            >
              <View
                style={{
                  width: tile,
                  height: tile,
                  borderRadius: tile / 2,
                  backgroundColor: a.primary ? P.green : P.panel,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={a.icon} size={S.icon} color={a.primary ? '#FFFFFF' : P.ink} />
              </View>
              <Text size={S.small - 1} color={P.ink} style={{ textAlign: 'center' }}>
                {a.label}
              </Text>
            </Touchable>
          ))}
        </View>
      </Appear>
      <View style={[styles.footer, { bottom: 28, left: 32, right: 32 }]}>
        <Icon name="lock-closed-outline" size={S.small - 2} color={P.sub} />
        <Text size={S.small - 3} color={P.sub} lines={1}>
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
      icon="chatbubbles"
      title="WhatsApp no GoClient"
      text="Converse com clientes e com a equipe pelo número compartilhado. O Lucas também avisa os clientes por aqui."
      actions={[
        { icon: 'create-outline', label: 'Nova conversa', primary: true, onPress: onNew },
        { icon: 'person-add-outline', label: 'Novo contato', onPress: onContact },
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
        {!S.phone && <IconButton P={P} S={S} name="videocam-outline" label="Ligação de vídeo" />}
        <IconButton P={P} S={S} name="call-outline" label="Ligação de voz" />
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
      <View style={{ backgroundColor: P.bar }}>{header}</View>
      <ScrollView
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{ padding: S.pad, gap: 10, flexGrow: 1, justifyContent: 'flex-end' }}
      >
        <View
          style={[styles.dayPill, { backgroundColor: P.in, alignSelf: 'center', maxWidth: 640 }]}
        >
          <Icon name="lock-closed" size={S.small - 2} color={P.dark ? '#FFD279' : '#54656F'} />
          <Text
            size={S.small - 2}
            color={P.dark ? '#FFD279' : '#54656F'}
            style={{ textAlign: 'center' }}
          >
            As mensagens são protegidas com a criptografia de ponta a ponta.
          </Text>
        </View>
        {msgs.map((m, i) => (
          <View key={m.id} style={{ gap: 10 }}>
            {m.day !== msgs[i - 1]?.day && (
              <View style={[styles.dayPill, { backgroundColor: P.in, alignSelf: 'center' }]}>
                <Text size={S.small} color={P.sub}>
                  {m.day}
                </Text>
              </View>
            )}
            <Bubble
              P={P}
              S={S}
              msg={m}
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
        ))}
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
  selected,
  selecting,
  onPress,
}: {
  P: Palette;
  S: Sizes;
  msg: SimMessage;
  group: boolean;
  selected?: boolean;
  selecting: boolean;
  onPress?: () => void;
}) {
  const R = 22;
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
          style={{
            maxWidth: '72%',
            backgroundColor: msg.out ? P.out : P.in,
            borderRadius: R,
            paddingHorizontal: 18,
            paddingTop: 12,
            paddingBottom: 10,
            gap: 6,
            shadowColor: '#000',
            shadowOpacity: P.dark ? 0 : 0.06,
            shadowRadius: 1,
            shadowOffset: { width: 0, height: 1 },
          }}
        >
          {group && !msg.out && msg.from && (
            <Text size={S.small} weight="semibold" color={P.greenInk}>
              {msg.from}
            </Text>
          )}
          {msg.kind === 'photo' && (
            <View
              style={{
                width: S.phone ? 360 : 440,
                height: S.phone ? 240 : 290,
                borderRadius: concentric(R, 10),
                backgroundColor: P.dark ? '#2A3942' : '#E9EDEF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="image-outline" size={72} color={P.sub} />
            </View>
          )}
          {msg.kind === 'doc' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 14,
                borderRadius: concentric(R, 10),
                backgroundColor: P.dark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.04)',
              }}
            >
              <Icon name="document-text" size={44} color={P.red} />
              <View>
                <Text size={S.sub} color={P.ink}>
                  {msg.text}.pdf
                </Text>
                <Text size={S.small - 2} color={P.sub}>
                  PDF · 2 páginas
                </Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            {msg.kind !== 'doc' && (
              <Text size={S.sub} color={P.ink} style={{ flexShrink: 1 }}>
                {msg.text}
              </Text>
            )}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
            >
              <Text size={S.small - 3} color={P.sub}>
                {msg.time}
              </Text>
              {msg.out && <Icon name="checkmark-done" size={S.small} color={P.tick} />}
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
  const h = S.phone ? 80 : 96;
  const has = value.trim().length > 0;
  return (
    <View style={{ padding: 16, paddingHorizontal: S.pad, backgroundColor: 'transparent' }}>
      <View
        style={{
          minHeight: h,
          borderRadius: h / 2,
          backgroundColor: P.in,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          gap: 4,
          shadowColor: '#000',
          shadowOpacity: P.dark ? 0 : 0.08,
          shadowRadius: 6,
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
  const R = 28;
  const PAD = 10;
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
          top: S.head - 8,
          right: S.pad,
          width: S.phone ? 440 : 500,
          backgroundColor: P.dark ? '#233138' : '#FFFFFF',
          borderRadius: R,
          padding: PAD,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
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
                  marginVertical: 6,
                  marginHorizontal: 16,
                }}
              />
            )}
            <Touchable
              accessibilityRole="menuitem"
              accessibilityLabel={it.label}
              onPress={() => onPick(it.k)}
              scaleTo={0.98}
              style={{
                height: S.phone ? 84 : 96,
                borderRadius: concentric(R, PAD),
                flexDirection: 'row',
                alignItems: 'center',
                gap: 22,
                paddingHorizontal: 22,
              }}
            >
              <Icon name={it.icon} size={S.icon * 0.85} color={it.red ? P.red : P.ink} />
              <Text size={S.sub + 1} color={it.red ? P.red : P.ink}>
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
  const R = 36;
  const PAD = 28;
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
  const btn = S.phone ? 80 : 92;
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: P.scrim }]}>
      <View
        style={{
          width: S.phone ? 600 : 680,
          backgroundColor: P.dark ? '#233138' : '#FFFFFF',
          borderRadius: R,
          padding: PAD,
          gap: 14,
        }}
      >
        <Text size={S.name + 2} weight="semibold" color={P.ink}>
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
              { flex: 1, height: btn, borderRadius: concentric(R, PAD), backgroundColor: P.field },
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
                borderRadius: concentric(R, PAD),
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
  onFind: () => void;
  onFavorite: () => void;
  onAsk: (k: 'block' | 'clear' | 'delete') => void;
  onUnblock: () => void;
}) {
  const [muted, setMuted] = useState(false);
  const group = !!contact.members;
  const media = chat.messages.filter((m) => m.kind).length;
  const R = 28;
  const action = (icon: IconName, label: string, onPress?: () => void) => (
    <Touchable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.94}
      style={{
        width: S.phone ? 140 : 168,
        paddingVertical: 20,
        borderRadius: R,
        borderWidth: 1,
        borderColor: P.line,
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Icon name={icon} size={S.icon} color={P.greenInk} />
      <Text size={S.small} color={P.ink}>
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
          <Avatar P={P} name={contact.name} size={S.phone ? 180 : 210} group={group} />
          <Text size={S.title} color={P.ink} style={{ marginTop: 12 }}>
            {contact.name}
          </Text>
          <Text size={S.sub} color={P.sub}>
            {group ? `Grupo · ${contact.members?.length ?? 0} participantes` : contact.phone}
          </Text>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 20 }}>
            {action('call-outline', 'Ligar')}
            {action('videocam-outline', 'Vídeo')}
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
              .filter((m) => m.kind)
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
          right: <Switch value={muted} onChange={setMuted} />,
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
        <Text size={S.name + 2} weight="semibold" color={P.ink} style={{ flex: 1 }}>
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
        <Text size={S.name + 2} weight="semibold" color={P.ink} style={{ flex: 1 }}>
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
          <Switch value={sync} onChange={setSync} />
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
  contactOf,
  selected,
  onSelect,
}: {
  P: Palette;
  S: Sizes;
  contactOf: (id: string) => SimContact | undefined;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const favorites = CONTACTS.filter((c) => c.favorite);
  const recent = CALLS.filter(
    (k) => !q || norm(contactOf(k.contact)?.name ?? '').includes(norm(q)),
  );
  return (
    <View style={{ flex: 1 }}>
      <Header P={P} S={S}>
        <Text size={S.title} weight="semibold" color={P.ink} style={{ flex: 1 }}>
          Ligações
        </Text>
        <IconButton P={P} S={S} name="ellipsis-vertical" label="Mais opções" />
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
                    <IconButton P={P} S={S} name="videocam-outline" label={`Vídeo com ${c.name}`} />
                    <IconButton P={P} S={S} name="call-outline" label={`Ligar para ${c.name}`} />
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
                  <Icon
                    name={k.video ? 'videocam' : CALL_ICON[k.kind]}
                    size={S.small}
                    color={missed ? P.red : P.sub}
                  />
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
      icon="call"
      title="Ligações de voz e vídeo"
      text="Ligue para clientes e para a equipe pelo número compartilhado."
      actions={[
        { icon: 'videocam', label: 'Iniciar ligação', primary: true },
        { icon: 'link', label: 'Novo link de ligação' },
        { icon: 'keypad', label: 'Ligar para um telefone' },
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
}: {
  P: Palette;
  S: Sizes;
  call: SimCall;
  contactOf: (id: string) => SimContact | undefined;
  onClose: () => void;
  onMessage: (id: string) => void;
}) {
  const who = contactOf(call.contact);
  const R = 32;
  return (
    <View style={{ flex: 1, backgroundColor: P.panel }}>
      <Header P={P} S={S}>
        {S.phone && <IconButton P={P} S={S} name="arrow-back" label="Voltar" onPress={onClose} />}
        <Text size={S.name + 2} weight="semibold" color={P.ink} style={{ flex: 1 }}>
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
            <IconButton P={P} S={S} name="videocam-outline" label="Vídeo" />
            <IconButton P={P} S={S} name="call-outline" label="Ligar" />
          </View>
          <View style={{ height: 1, backgroundColor: P.line }} />
          <View style={{ padding: 24, gap: 18 }}>
            <Text size={S.small} color={P.sub}>
              {call.day}
            </Text>
            {call.entries.map((e) => (
              <View key={e.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Icon
                  name={
                    call.video
                      ? 'videocam-outline'
                      : call.kind === 'out'
                        ? 'arrow-up'
                        : 'arrow-down'
                  }
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
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
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
