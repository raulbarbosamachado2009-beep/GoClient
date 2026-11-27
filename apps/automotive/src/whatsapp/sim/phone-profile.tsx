import { type ReactNode, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { PHONE_SCROLL_END, useSystemInsets } from '../../layout/form-factor';
import { Blur, Touchable } from '../../ui/primitives';
import type { SimChat, SimContact } from './data';
import { Glass } from './phone-chat';
import { Avatar, grouped, Icon, type IconName, type Palette, Text, u } from './phone-kit';

/**
 * Dados do contato (celular), copiado do WhatsApp do iPhone (prints do usuário, 27/11/2026):
 * botão de voltar e "Editar" de vidro, foto grande, nome em negrito, telefone, botões de ação
 * arredondados com o nome embaixo e cartões agrupados (mídia, notificações, mensagens
 * temporárias, criptografia, grupos em comum, ações em verde e em vermelho). Ao rolar, o
 * título troca de "Dados do contato" para o nome. Sem vídeo e só dados fictícios.
 */
export function ProfileScreen({
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
  const headH = insets.top + u(60);
  const first = contact.name.split(' ')[0] ?? contact.name;
  // O título vira o nome quando o nome grande passa por baixo do cabeçalho.
  const swap = y.interpolate({
    inputRange: [u(190), u(230)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const veil = y.interpolate({ inputRange: [0, u(40)], outputRange: [0, 1], extrapolate: 'clamp' });
  const card = P.dark ? '#1C1D1D' : '#FFFFFF';
  const line = P.dark ? '#2A2B2B' : '#E5E5EA';
  const actionBg = P.dark ? '#1F2020' : '#FFFFFF';

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
          { width: u(76), height: u(60), borderRadius: u(30), backgroundColor: actionBg },
        ]}
      >
        <Icon name={icon} pt={25} color={P.ink} />
      </View>
      <Text pt={15} color={P.ink}>
        {label}
      </Text>
    </Touchable>
  );

  const box = (key: string, children: ReactNode) => (
    <View key={key} style={[styles.card, { backgroundColor: card }]}>
      {children}
    </View>
  );
  const row = (
    label: string,
    o: {
      icon?: IconName;
      circle?: boolean;
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
      onPress={o.onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? (P.dark ? '#262727' : '#E5E5EA') : 'transparent' },
      ]}
    >
      {o.icon &&
        (o.circle ? (
          <View
            style={[
              styles.center,
              {
                width: u(40),
                height: u(40),
                borderRadius: u(20),
                backgroundColor: P.dark ? '#2C2D2D' : '#F2F2F7',
                marginRight: u(4),
              },
            ]}
          >
            <Icon name={o.icon} pt={22} color={P.ink} />
          </View>
        ) : (
          <View style={{ width: u(36) }}>
            <Icon name={o.icon} pt={24} color={o.color ?? P.ink} />
          </View>
        ))}
      <View
        style={[
          styles.rowBody,
          {
            marginLeft: o.icon ? u(12) : 0,
            minHeight: o.circle ? u(60) : u(54),
            borderBottomWidth: o.last ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: line,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text pt={17} color={o.color ?? P.ink} lines={o.sub ? 1 : 2}>
            {label}
          </Text>
          {!!o.sub && (
            <Text pt={14} color={P.sub}>
              {o.sub}
            </Text>
          )}
        </View>
        {!!o.right && (
          <Text pt={17} color={P.sub}>
            {o.right}
          </Text>
        )}
        {o.chevron && <Icon name="chevron-forward" pt={17} color={P.sub} />}
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
        <View style={{ alignItems: 'center', paddingTop: u(14), paddingBottom: u(6) }}>
          <Avatar P={P} pt={150} group={group} />
          <Text pt={30} weight="bold" color={P.ink} style={{ marginTop: u(16) }} lines={1}>
            {contact.name}
          </Text>
          <Text pt={18} color={P.sub} style={{ marginTop: u(2) }}>
            {group ? `Grupo · ${contact.members?.length ?? 0} participantes` : contact.phone}
          </Text>
        </View>
        <View style={styles.actions}>
          {action('call-outline', 'Ligar', onCall)}
          {action('chatbubble-outline', 'Mensagem', onMessage)}
          {action(contact.favorite ? 'star' : 'star-outline', 'Favorito', onFavorite)}
          {action('search-outline', 'Pesquisar')}
        </View>

        {!!contact.about && box('about', row(contact.about, { sub: 'Recado', last: true }))}
        {box(
          'media',
          <>
            {row('Mídia, links e docs', {
              icon: 'image-outline',
              right: String(media),
              chevron: true,
            })}
            {row('Favoritas', {
              icon: 'star-outline',
              right: contact.favorite ? 'Sim' : 'Nenhuma',
              chevron: true,
              last: true,
              onPress: onFavorite,
            })}
          </>,
        )}
        {box(
          'prefs',
          <>
            {row('Notificações', { icon: 'notifications-outline', chevron: true })}
            {row('Tema da conversa', { icon: 'color-palette-outline', chevron: true })}
            {row('Salvar no Fotos', {
              icon: 'download-outline',
              right: 'Padrão',
              chevron: true,
              last: true,
            })}
          </>,
        )}
        {box(
          'privacy',
          <>
            {row('Mensagens temporárias', {
              icon: 'timer-outline',
              right: 'Desativadas',
              chevron: true,
            })}
            {row('Criptografia', {
              icon: 'lock-closed-outline',
              sub: 'As mensagens e as ligações são protegidas com a criptografia de ponta a ponta.',
              chevron: true,
              last: true,
            })}
          </>,
        )}
        {!group &&
          box(
            'card',
            row('Dados do contato', {
              icon: 'person-circle-outline',
              chevron: true,
              last: true,
            }),
          )}

        {group ? (
          <>
            <Text pt={22} weight="bold" color={P.ink} style={styles.section}>
              {`${contact.members?.length ?? 0} participantes`}
            </Text>
            {box(
              'members',
              (contact.members ?? []).map((m, i, all) =>
                row(m, { icon: 'person', circle: true, last: i === all.length - 1 }),
              ),
            )}
          </>
        ) : (
          <>
            <Text pt={22} weight="bold" color={P.ink} style={styles.section}>
              Nenhum grupo em comum
            </Text>
            {box(
              'groups',
              <>
                {row(`Criar grupo com ${first}`, { icon: 'add', circle: true })}
                {row('Adicionar ao grupo', { icon: 'people-outline', circle: true, last: true })}
              </>,
            )}
          </>
        )}

        {box(
          'actions',
          <>
            {!group && row('Compartilhar contato', { color: P.greenInk })}
            {row(contact.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos', {
              color: P.greenInk,
              onPress: onFavorite,
            })}
            {row('Adicionar à lista', { color: P.greenInk })}
            {row('Exportar conversa', { color: P.greenInk })}
            {row('Limpar conversa', { color: P.red, last: true, onPress: onClear })}
          </>,
        )}
        {!group &&
          box(
            'block',
            <>
              {row(blocked ? `Desbloquear ${first}` : `Bloquear ${first}`, {
                color: P.red,
                onPress: onBlock,
              })}
              {row(`Denunciar ${first}`, { color: P.red, last: true })}
            </>,
          )}
      </Animated.ScrollView>

      {/* Cabeçalho: vidro que aparece ao rolar; o título troca para o nome. */}
      <View style={[styles.head, { height: headH, paddingTop: insets.top }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: veil }]}>
          <Blur radius={24} tint={P.dark ? 'dark' : 'light'} />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: P.dark ? 'rgba(11,11,11,0.72)' : 'rgba(242,242,247,0.78)',
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: line,
              },
            ]}
          />
        </Animated.View>
        <Glass P={P} label="Voltar" onPress={onBack}>
          <Icon name="chevron-back" pt={24} color={P.ink} />
        </Glass>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={{ opacity: swap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}
          >
            <Text pt={17} weight="semibold" color={P.ink} lines={1}>
              {group ? 'Dados do grupo' : 'Dados do contato'}
            </Text>
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute',
              opacity: swap,
              transform: [
                { translateY: swap.interpolate({ inputRange: [0, 1], outputRange: [u(8), 0] }) },
              ],
            }}
          >
            <Text pt={17} weight="semibold" color={P.ink} lines={1}>
              {contact.name}
            </Text>
          </Animated.View>
        </View>
        <Glass P={P} label="Editar" width={u(76)}>
          <Text pt={17} color={P.ink}>
            Editar
          </Text>
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: u(12),
    marginTop: u(18),
    marginBottom: u(22),
  },
  card: {
    marginHorizontal: u(16),
    marginBottom: u(18),
    borderRadius: u(26),
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: u(18) },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: u(10),
    paddingRight: u(16),
    gap: u(8),
  },
  section: { marginHorizontal: u(20), marginTop: u(6), marginBottom: u(10) },
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
});
