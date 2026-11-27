import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { PHONE_SCROLL_END, useSystemInsets } from '../../layout/form-factor';
import { usePrototype } from '../../prototype/state';
import { FONT, nativeDriver } from '../../theme';
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
import { ChatScreen, pushEase, type SendStatus, STATUS_STEPS } from './phone-chat';
import {
  Avatar,
  Icon,
  type IconName,
  lastOf,
  norm,
  type Palette,
  Round,
  Text,
  u,
  usePalette,
  whenOf,
} from './phone-kit';
import { ProfileScreen } from './phone-profile';

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
  // Mensagens enviadas agora: relógio → ✓ → ✓✓ (as antigas aparecem lidas).
  const [status, setStatus] = useState<Record<string, SendStatus>>({});
  // Não lidas de cada conversa no momento em que foi aberta (faixa "Mensagens não lidas").
  const [unreadAt, setUnreadAt] = useState<Record<string, number>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const top = stack[stack.length - 1] as Screen;
  // Dentro de uma conversa (e das telas que saem dela) a barra de abas do app some e a
  // conversa ocupa a tela inteira (pedido de 26/11/2026). Volta ao sair do WhatsApp.
  const { setImmersive } = usePrototype();
  const deep = top.kind !== 'root';
  useEffect(() => {
    setImmersive(deep);
  }, [deep, setImmersive]);
  useEffect(() => () => setImmersive(false), [setImmersive]);

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
    const n = chats.find((c) => c.id === id)?.unread ?? 0;
    setUnreadAt((cur) => ({ ...cur, [id]: n }));
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
        unreadFrom={unreadAt[top.id] ?? 0}
        statusOf={(id) => status[id] ?? 'read'}
        onBack={pop}
        onProfile={() => push({ kind: 'profile', id: top.id, from: 'chat' })}
        onCall={() => ring(top.id)}
        onSend={(text) => {
          const id = `n${Date.now()}`;
          setStatus((cur) => ({ ...cur, [id]: 'sending' }));
          for (const step of STATUS_STEPS)
            timers.current.push(
              setTimeout(() => setStatus((cur) => ({ ...cur, [id]: step.status })), step.after),
            );
          append(top.id, { id, out: true, text, time: now(), day: 'Hoje' });
        }}
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
      <PushStack id={key} back={back} depth={stack.length} dim={P.dark ? 0.5 : 0.12}>
        {screen}
      </PushStack>
    </View>
  );
}

/**
 * Empilhar e voltar como no iPhone (vídeo do usuário, 27/11/2026): a tela nova entra inteira
 * pela direita, por cima, e a de baixo recua um terço para a esquerda e escurece; ao voltar,
 * a de cima sai pela direita e a de baixo volta. Trocar de aba (Conversas ↔ Ligações) só
 * troca, sem deslizar. As duas telas ficam montadas durante a animação.
 */
function PushStack({
  id,
  back,
  depth,
  dim,
  children,
}: {
  id: string;
  back: boolean;
  depth: number;
  dim: number;
  children: ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const v = useRef(new Animated.Value(1)).current;
  const shown = useRef({ id, node: children, depth });
  const [leaving, setLeaving] = useState<{
    id: string;
    node: ReactNode;
    back: boolean;
  } | null>(null);
  if (shown.current.id !== id) {
    const moved = shown.current.depth !== depth;
    if (moved && width > 0) {
      // Estado derivado na renderização: guarda a tela que sai para animar as duas juntas.
      setLeaving({ id: shown.current.id, node: shown.current.node, back });
    }
    shown.current = { id, node: children, depth };
  } else shown.current.node = children;

  useEffect(() => {
    if (!leaving) return;
    v.setValue(0);
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      easing: pushEase,
      useNativeDriver: nativeDriver,
    }).start(({ finished }) => finished && setLeaving(null));
  }, [leaving, v]);

  const W = width || 1;
  // Tela de cima (a que entra ao empilhar; a que sai ao voltar).
  const topX = leaving?.back
    ? v.interpolate({ inputRange: [0, 1], outputRange: [0, W] })
    : v.interpolate({ inputRange: [0, 1], outputRange: [W, 0] });
  // Tela de baixo (a que fica ao empilhar; a que volta ao voltar).
  const underX = leaving?.back
    ? v.interpolate({ inputRange: [0, 1], outputRange: [-W * 0.3, 0] })
    : v.interpolate({ inputRange: [0, 1], outputRange: [0, -W * 0.3] });
  const underDim = leaving?.back
    ? v.interpolate({ inputRange: [0, 1], outputRange: [dim, 0] })
    : v.interpolate({ inputRange: [0, 1], outputRange: [0, dim] });

  const layer = (
    key: string,
    node: ReactNode,
    x: Animated.AnimatedInterpolation<number> | 0,
    shade?: Animated.AnimatedInterpolation<number>,
    onTop?: boolean,
  ) => (
    <Animated.View
      key={key}
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ translateX: x }], zIndex: onTop ? 2 : 1 },
        onTop && leaving ? styles.edge : null,
      ]}
    >
      {node}
      {shade && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: shade }]}
        />
      )}
    </Animated.View>
  );

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* Sempre uma lista com chave: a tela de cima continua montada quando vira "a que sai". */}
      {!leaving
        ? [layer(id, children, 0)]
        : leaving.back
          ? [
              layer(id, children, underX, underDim),
              layer(leaving.id, leaving.node, topX, undefined, true),
            ]
          : [
              layer(leaving.id, leaving.node, underX, underDim),
              layer(id, children, topX, undefined, true),
            ]}
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
      {/* Título no topo, com Ligações e "+" juntos à direita (pedido de 26/11/2026). */}
      <View style={styles.head}>
        <Text pt={34} weight="bold" color={P.ink} lines={1} style={{ flex: 1 }}>
          Conversas
        </Text>
        <Round P={P} icon="call-outline" label="Ir para Ligações" onPress={onToggle} />
        <Round P={P} icon="add" label="Nova conversa" filled onPress={onNew} />
      </View>
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
      <View style={styles.head}>
        <Text pt={34} weight="bold" color={P.ink} lines={1} style={{ flex: 1 }}>
          Ligações
        </Text>
        <Round
          P={P}
          icon="chatbubble-ellipses-outline"
          label="Voltar para Conversas"
          onPress={onToggle}
          badge={unread}
        />
        <Round P={P} icon="add" label="Nova ligação" filled onPress={onNew} />
      </View>

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
  // Sombra na borda esquerda da tela que desliza por cima (como no iPhone).
  edge: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
  },
  input: {
    fontFamily: FONT.displayRegular,
    paddingVertical: 0,
    // Web: sem o contorno azul do navegador.
    outlineStyle: 'none',
  } as object,
  center: { alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: u(12), height: u(52) },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: u(12),
    paddingHorizontal: u(16),
    paddingTop: u(2),
    paddingBottom: u(10),
  },
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
