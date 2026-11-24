import { dropIndex, moveItem } from '@goclient/core';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';
import type { MockClient } from '../mocks/data';
import { useFrameScale } from '../preview/automotive-frame';
import { nativeDriver, spacing, useColors } from '../theme';
import { Avatar, Icon, Text } from '../ui/primitives';
import { SheetLock, Tap } from './sheet-context';

/** Altura fixa de cada linha (o arrasto calcula a posição por ela). */
const ROW = 116;
const SPRING = {
  stiffness: 320,
  damping: 30,
  mass: 1,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 0.5,
};
const WEB = Platform.OS === 'web';
/** Navegador: a alça não rola a página nem seleciona texto, e mostra o cursor de arrastar. */
const HANDLE_WEB = (WEB ? { touchAction: 'none', cursor: 'grab', userSelect: 'none' } : null) as
  | object
  | null;
/** Vira o atributo `REORDER_HANDLE` no navegador: a aba deixa esse gesto para a lista. */
const HANDLE_DATA = { dataSet: { reorderHandle: 'true' } } as object;

/**
 * Lista "Rota" do cartão do cliente: os clientes escolhidos para visitar, na ordem da
 * visita. Arrasta-se pela alça (≡) para mudar a ordem, como a fila do Spotify; as outras
 * linhas abrem espaço com mola. Tocar numa linha vai até aquela parada.
 */
export function RouteQueue({
  clients,
  currentId,
  onReorder,
  onPick,
}: {
  clients: MockClient[];
  currentId?: string;
  onReorder: (ids: string[]) => void;
  onPick: (id: string) => void;
}) {
  const c = useColors();
  const lockSheet = useContext(SheetLock);
  const scale = useFrameScale();
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Ordem mostrada: muda na hora ao soltar (sem esperar o Mapa recalcular).
  const incoming = clients.map((x) => x.id);
  const [ids, setIds] = useState(incoming);
  const key = incoming.join('|');
  // biome-ignore lint/correctness/useExhaustiveDependencies: sincroniza só quando a lista de fora muda
  useEffect(() => setIds(incoming), [key]);
  const byId = new Map(clients.map((x) => [x.id, x]));

  // Deslocamento de cada linha (por id).
  const offsets = useRef(new Map<string, Animated.Value>()).current;
  const offsetOf = (id: string) => {
    let v = offsets.get(id);
    if (!v) {
      v = new Animated.Value(0);
      offsets.set(id, v);
    }
    return v;
  };
  const lift = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState<string | null>(null);
  const drag = useRef({ id: '', from: 0, to: 0 });
  const idsRef = useRef(ids);
  idsRef.current = ids;

  // A nova ordem é gravada assim que o dedo solta. Antes de pintar, as outras linhas já
  // estão no lugar novo (deslocamento zero) e a solta desliza o que falta até a vaga.
  const settling = useRef<{ id: string; rest: number } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda a cada nova ordem
  useLayoutEffect(() => {
    for (const v of offsets.values()) v.setValue(0);
    const s = settling.current;
    if (!s) return;
    settling.current = null;
    settle(s.id, s.rest);
  }, [ids]);
  const settle = (id: string, rest: number) => {
    const v = offsetOf(id);
    v.setValue(rest);
    Animated.spring(v, { toValue: 0, ...SPRING, useNativeDriver: nativeDriver }).start(() =>
      setActive((cur) => (cur === id ? null : cur)),
    );
  };

  const shiftOthers = (from: number, to: number) => {
    idsRef.current.forEach((id, j) => {
      if (j === from) return;
      const shift =
        from < to && j > from && j <= to ? -ROW : to < from && j >= to && j < from ? ROW : 0;
      Animated.spring(offsetOf(id), {
        toValue: shift,
        ...SPRING,
        useNativeDriver: nativeDriver,
      }).start();
    });
  };

  const begin = (id: string) => {
    const from = idsRef.current.indexOf(id);
    if (from < 0) return;
    drag.current = { id, from, to: from };
    lockSheet(true);
    setActive(id);
    Animated.spring(lift, { toValue: 1, ...SPRING, useNativeDriver: nativeDriver }).start();
  };
  const move = (dy: number) => {
    const { id, from } = drag.current;
    if (!id) return;
    const y = dy / scaleRef.current;
    const count = idsRef.current.length;
    // Não passa do primeiro nem do último lugar.
    const clamped = Math.min(Math.max(y, -from * ROW), (count - 1 - from) * ROW);
    offsetOf(id).setValue(clamped);
    const to = dropIndex(from, clamped, ROW, count);
    if (to !== drag.current.to) {
      drag.current.to = to;
      shiftOthers(from, to);
    }
  };
  const end = () => {
    const { id, from, to } = drag.current;
    if (!id) return;
    drag.current = { id: '', from: 0, to: 0 };
    lockSheet(false);
    Animated.spring(lift, { toValue: 0, ...SPRING, useNativeDriver: nativeDriver }).start();
    const v = offsetOf(id);
    v.stopAnimation((current) => {
      const rest = current - (to - from) * ROW;
      if (to === from) return settle(id, rest);
      settling.current = { id, rest };
      const next = moveItem(idsRef.current, from, to);
      setIds(next);
      onReorderRef.current(next);
    });
  };
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const handlers = useRef({ begin, move, end });
  handlers.current = { begin, move, end };

  // Se a lista sumir no meio de um arrasto, solta a aba.
  useEffect(() => () => lockSheet(false), [lockSheet]);

  if (ids.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: c.fill }]}>
        <Icon name="trail-sign" size={44} color={c.textTertiary} />
        <Text variant="headline" style={{ textAlign: 'center' }}>
          Nenhum cliente na rota
        </Text>
        <Text variant="callout" tone="secondary" style={{ textAlign: 'center' }}>
          Monte a rota do dia ou coloque clientes na rota pela ficha do Kyte.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.list, { height: ids.length * ROW, backgroundColor: c.fill }]}>
      {ids.map((id, i) => {
        const client = byId.get(id);
        if (!client) return null;
        const isActive = active === id;
        return (
          <QueueRow
            key={id}
            client={client}
            index={i}
            last={i === ids.length - 1}
            current={id === currentId}
            active={isActive}
            offset={offsetOf(id)}
            lift={isActive ? lift : null}
            handlers={handlers}
            onPress={() => onPick(id)}
          />
        );
      })}
    </View>
  );
}

function QueueRow({
  client,
  index,
  last,
  current,
  active,
  offset,
  lift,
  handlers,
  onPress,
}: {
  client: MockClient;
  index: number;
  last: boolean;
  current: boolean;
  active: boolean;
  offset: Animated.Value;
  lift: Animated.Value | null;
  handlers: {
    current: { begin: (id: string) => void; move: (dy: number) => void; end: () => void };
  };
  onPress: () => void;
}) {
  const c = useColors();
  const idRef = useRef(client.id);
  idRef.current = client.id;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => handlers.current.begin(idRef.current),
      onPanResponderMove: (_e, g) => handlers.current.move(g.dy),
      onPanResponderRelease: () => handlers.current.end(),
      onPanResponderTerminate: () => handlers.current.end(),
    }),
  ).current;
  const district = client.district.split(' · ')[0];
  // Linha levantada: cresce um pouco e ganha sombra, como na fila do Spotify.
  const lifted = lift
    ? {
        transform: [
          { translateY: offset },
          { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
        ],
      }
    : { transform: [{ translateY: offset }] };

  return (
    <Animated.View
      style={[
        styles.row,
        { top: index * ROW, zIndex: active ? 10 : 1 },
        active && styles.rowLifted,
        lifted,
      ]}
    >
      <View style={[styles.rowInner, active && { backgroundColor: c.elevated }]}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`Parada ${index + 1}: ${client.tradeName || client.name}`}
          onPress={onPress}
          scaleTo={0.98}
          style={styles.rowTap}
        >
          <View style={[styles.badge, { backgroundColor: current ? c.accent : c.fillStrong }]}>
            <Text variant="headline" color={current ? '#FFFFFF' : c.text}>
              {index + 1}
            </Text>
          </View>
          <Avatar name={client.name} size={64} square />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline" numberOfLines={1}>
              {client.tradeName || client.name}
            </Text>
            <Text variant="callout" tone={current ? 'accent' : 'secondary'} numberOfLines={1}>
              {current ? 'Destino atual' : [client.address, district].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </Tap>
        <View
          {...pan.panHandlers}
          {...HANDLE_DATA}
          accessibilityRole="adjustable"
          accessibilityLabel={`Mover ${client.tradeName || client.name}`}
          style={[styles.handle, HANDLE_WEB]}
        >
          <Icon name="reorder-three" size={44} color={c.textTertiary} />
        </View>
      </View>
      {!last && !active && <View style={[styles.sep, { backgroundColor: c.separator }]} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Cartão único (como "Detalhes"); a linha arrastada sai dele com fundo próprio.
  list: { borderRadius: 30 },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    shadowOpacity: 0,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // Mesmo raio do cartão: a linha levantada encaixa nos cantos dele.
    borderRadius: 30,
  },
  rowLifted: { shadowOpacity: 0.3, elevation: 10 },
  rowTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingLeft: spacing[4],
    height: '100%',
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 88,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: {
    position: 'absolute',
    left: 140,
    right: 24,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  empty: {
    borderRadius: 30,
    padding: spacing[8],
    alignItems: 'center',
    gap: spacing[3],
  },
});
