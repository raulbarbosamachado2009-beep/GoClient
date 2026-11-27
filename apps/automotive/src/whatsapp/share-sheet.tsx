import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { usePhone, useSystemInsets } from '../layout/form-factor';
import { usePrototype } from '../prototype/state';
import { FONT } from '../theme';
import { appleEase } from '../ui/motion';
import { Touchable } from '../ui/primitives';
import { Avatar, Icon, norm, Text, u, usePalette } from './sim/phone-kit';

/**
 * "Enviar para" do WhatsApp (prints do usuário, 27/11/2026): sobe de baixo para cima com
 * "×", o título, "Novo grupo", a busca e as seções "Contatos frequentes" e "Conversas
 * recentes", cada contato com o círculo de seleção (vira o ✓ verde). Com alguém escolhido,
 * aparece embaixo a miniatura do que vai, "Adicione uma mensagem…", os nomes e "Enviar".
 * Na multimídia é o mesmo cartão, centrado e com largura de folha.
 */
export type ShareTarget = { id: string; name: string; sub?: string; group?: boolean };

export function SendToSheet({
  frequent,
  recent,
  single,
  thumb,
  onSend,
  onClose,
}: {
  frequent: ShareTarget[];
  recent: ShareTarget[];
  /** Só um destinatário (o WhatsApp de verdade no app abre uma conversa por vez). */
  single?: boolean;
  /** Miniatura do que vai ser enviado (ex.: o recibo). */
  thumb: React.ReactNode;
  onSend: (ids: string[], caption: string) => void;
  onClose: () => void;
}) {
  const P = usePalette();
  const phone = usePhone();
  const insets = useSystemInsets();
  const { height } = useWindowDimensions();
  const { setCovered } = usePrototype();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [caption, setCaption] = useState('');
  // Altura da área (a folha vai do topo dela até o fim, com altura explícita).
  const [areaH, setAreaH] = useState(0);
  const v = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;

  // No celular, a barra de abas some enquanto a folha está aberta (a barra de envio fica
  // no lugar dela, como no WhatsApp).
  useEffect(() => {
    if (!phone) return;
    setCovered(true);
    return () => setCovered(false);
  }, [phone, setCovered]);
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      easing: appleEase,
      useNativeDriver: false,
    }).start();
  }, [v]);
  const any = picked.length > 0;
  useEffect(() => {
    Animated.spring(bar, {
      toValue: any ? 1 : 0,
      damping: 22,
      stiffness: 260,
      useNativeDriver: false,
    }).start();
  }, [any, bar]);

  const close = (then?: () => void) =>
    Animated.timing(v, {
      toValue: 0,
      duration: 300,
      easing: appleEase,
      useNativeDriver: false,
    }).start(() => {
      onClose();
      then?.();
    });

  const toggle = (id: string) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : single ? [id] : [...cur, id],
    );
  const q = norm(query.trim());
  const match = (t: ShareTarget) => !q || norm(`${t.name} ${t.sub ?? ''}`).includes(q);
  const all = useMemo(() => [...frequent, ...recent], [frequent, recent]);
  const names = picked
    .map((id) => all.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  const sheetBg = P.dark ? '#1C1D1D' : '#F2F2F7';
  const card = P.dark ? '#262727' : '#FFFFFF';
  const line = P.dark ? '#333434' : '#E5E5EA';
  const top = phone ? insets.top + u(10) : u(18);
  const travel = height;

  const section = (title: string, list: ShareTarget[]) => {
    const shown = list.filter(match);
    if (!shown.length) return null;
    return (
      <View key={title}>
        <Text pt={20} weight="semibold" color={P.sub} style={styles.section}>
          {title}
        </Text>
        <View style={[styles.card, { backgroundColor: card }]}>
          {shown.map((t, i) => {
            const on = picked.includes(t.id);
            return (
              <Pressable
                key={t.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t.name}
                onPress={() => toggle(t.id)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: P.dark ? '#2E2F2F' : '#ECECEC' },
                ]}
              >
                <Avatar P={P} pt={40} group={t.group} />
                <View
                  style={[
                    styles.rowBody,
                    {
                      borderBottomWidth: i === shown.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: line,
                    },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text pt={17} color={P.ink} lines={1}>
                      {t.name}
                    </Text>
                    {!!t.sub && (
                      <Text pt={14} color={P.sub} lines={1}>
                        {t.sub}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.check,
                      on
                        ? { backgroundColor: P.green, borderColor: P.green }
                        : { borderColor: P.dark ? '#5A5B5B' : '#C7C7CC' },
                    ]}
                  >
                    {on && <Icon name="checkmark" pt={16} color="#FFFFFF" />}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: v }]}
      >
        <Pressable
          accessibilityLabel="Fechar"
          onPress={() => close()}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            top,
            height: areaH > 0 ? areaH - top : undefined,
            opacity: areaH > 0 ? 1 : 0,
            backgroundColor: sheetBg,
            width: phone ? '100%' : u(520),
            alignSelf: 'center',
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.head}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={() => close()}
            scaleTo={0.9}
            style={[styles.round, { backgroundColor: card }]}
          >
            <Icon name="close" pt={26} color={P.ink} />
          </Touchable>
          <Text pt={20} weight="semibold" color={P.ink} style={{ flex: 1 }}>
            Enviar para
          </Text>
          <View style={[styles.pill, { backgroundColor: card }]}>
            <Text pt={17} weight="medium" color={P.ink}>
              Novo grupo
            </Text>
          </View>
        </View>
        <View style={[styles.search, { backgroundColor: P.dark ? '#3A3B3B' : '#E3E3E8' }]}>
          <Icon name="search" pt={19} color={P.sub} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Pesquisar"
            placeholderTextColor={P.sub}
            accessibilityLabel="Pesquisar"
            style={[styles.input, { color: P.ink }]}
          />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: u(200) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {section('Contatos frequentes', frequent)}
          {section('Conversas recentes', recent)}
        </ScrollView>

        {/* Barra de envio: sobe quando há alguém escolhido. */}
        <Animated.View
          pointerEvents={any ? 'auto' : 'none'}
          style={[
            styles.bar,
            {
              backgroundColor: P.dark ? '#2C2D2D' : '#FFFFFF',
              borderTopColor: line,
              paddingBottom: (phone ? Math.max(insets.bottom, u(14)) : u(14)) + u(4),
              opacity: bar,
              transform: [
                { translateY: bar.interpolate({ inputRange: [0, 1], outputRange: [u(160), 0] }) },
              ],
            },
          ]}
        >
          <View style={{ flexDirection: 'row', gap: u(10) }}>
            <View style={styles.thumb}>{thumb}</View>
            <View style={[styles.caption, { backgroundColor: P.dark ? '#1C1D1D' : '#F2F2F7' }]}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Adicione uma mensagem…"
                placeholderTextColor={P.sub}
                multiline
                accessibilityLabel="Mensagem"
                style={[styles.input, { color: P.ink, height: '100%' }]}
              />
            </View>
          </View>
          <View style={styles.sendRow}>
            <Text pt={17} color={P.ink} lines={1} style={{ flex: 1 }}>
              {names}
            </Text>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              sound
              onPress={() => {
                const ids = picked;
                const text = caption.trim();
                close(() => onSend(ids, text));
              }}
              scaleTo={0.92}
            >
              <Text pt={20} weight="semibold" color={P.green}>
                Enviar
              </Text>
            </Touchable>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    borderTopLeftRadius: u(30),
    borderTopRightRadius: u(30),
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: u(14),
    paddingHorizontal: u(16),
    paddingTop: u(16),
    paddingBottom: u(12),
  },
  round: {
    width: u(46),
    height: u(46),
    borderRadius: u(23),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    height: u(46),
    paddingHorizontal: u(18),
    borderRadius: u(23),
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: u(8),
    height: u(46),
    borderRadius: u(23),
    marginHorizontal: u(16),
    paddingHorizontal: u(14),
    marginBottom: u(8),
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONT.displayRegular,
    fontSize: u(17),
    paddingVertical: 0,
    outlineStyle: 'none',
  } as object,
  section: { marginHorizontal: u(36), marginTop: u(18), marginBottom: u(8) },
  card: { marginHorizontal: u(16), borderRadius: u(26), overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: u(16), gap: u(14) },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: u(60),
    paddingRight: u(18),
    gap: u(10),
  },
  check: {
    width: u(26),
    height: u(26),
    borderRadius: u(13),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: u(14),
    paddingHorizontal: u(16),
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: u(12),
  },
  thumb: { width: u(72), height: u(72), borderRadius: u(10), overflow: 'hidden' },
  caption: {
    flex: 1,
    height: u(72),
    borderRadius: u(16),
    paddingHorizontal: u(14),
    paddingVertical: u(10),
  },
  sendRow: { flexDirection: 'row', alignItems: 'center', gap: u(12) },
});
