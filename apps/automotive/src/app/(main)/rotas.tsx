import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CLIENTS, REGIONS } from '../../mocks/data';
import { usePrototype } from '../../prototype/state';
import { colors, nativeDriver, spacing } from '../../theme';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  PageHeader,
  SearchField,
  Tag,
  Text,
  Touchable,
} from '../../ui/primitives';

/**
 * Página de Rotas: escolher os clientes do dia (esquerda), ver a seleção (direita) e
 * calcular a rota. A seleção é apenas estado visual; o "cálculo" é uma animação que
 * leva ao mapa com uma rota de exemplo.
 */
export default function RoutesScreen() {
  const { setOverlay } = usePrototype();
  const router = useRouter();
  const [region, setRegion] = useState<string>('Todas');
  const [selected, setSelected] = useState<string[]>(['c7', 'c1', 'c6']);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const calculate = () => {
    setOverlay(
      <Calculating
        count={selected.length}
        onDone={() => {
          setOverlay(null);
          router.replace({ pathname: '/mapa', params: { rota: 'dia' } });
        }}
      />,
    );
  };

  const chosen = selected
    .map((id) => CLIENTS.find((c) => c.id === id))
    .filter((c) => c !== undefined);

  return (
    <View style={styles.page}>
      <PageHeader title="Rotas" subtitle="Selecione os clientes que você vai visitar hoje" />
      <SearchField placeholder="Buscar cliente para adicionar à rota" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[3] }}
        style={{ flexGrow: 0, flexShrink: 0 }}
      >
        {REGIONS.map((r) => (
          <Chip key={r} label={r} selected={region === r} onPress={() => setRegion(r)} />
        ))}
      </ScrollView>

      <View style={styles.columns}>
        <View style={{ flex: 1 }}>
          <FlatList
            data={CLIENTS}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ gap: spacing[2], paddingBottom: spacing[6] }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const on = selected.includes(item.id);
              return (
                <Touchable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(item.id)}
                  style={[styles.pickRow, on && styles.pickRowOn]}
                >
                  <Avatar name={item.name} size={68} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {item.tradeName}
                    </Text>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {item.address} · {item.region}
                    </Text>
                  </View>
                  <View style={[styles.check, on && styles.checkOn]}>
                    {on && <Icon name="checkmark" size={30} color="#FFFFFF" />}
                  </View>
                </Touchable>
              );
            }}
          />
        </View>

        <Card style={styles.selection}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View>
              <Text variant="label" tone="tertiary">
                ROTA DE HOJE
              </Text>
              <Text variant="headline">
                {chosen.length}{' '}
                {chosen.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}
              </Text>
            </View>
            <Tag label="Qua, 18 nov" icon="calendar-outline" />
          </View>

          <ScrollView
            contentContainerStyle={{ gap: spacing[2] }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            {chosen.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="git-network-outline" size={56} color={colors.textTertiary} />
                <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
                  Toque nos clientes à esquerda para montar a rota do dia.
                </Text>
              </View>
            ) : (
              chosen.map((c, i) => (
                <View key={c.id} style={styles.stop}>
                  <View style={styles.stopNumber}>
                    <Text variant="bodyStrong">{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {c.tradeName}
                    </Text>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {c.district}
                    </Text>
                  </View>
                  <IconButton
                    icon="close"
                    variant="plain"
                    iconSize={28}
                    accessibilityLabel="Remover"
                    onPress={() => toggle(c.id)}
                  />
                </View>
              ))
            )}
          </ScrollView>

          <Button
            label="Calcular rota"
            icon="navigate"
            onPress={calculate}
            disabled={chosen.length === 0}
            style={chosen.length === 0 && { opacity: 0.4 }}
          />
        </Card>
      </View>
    </View>
  );
}

/** Quadrado arredondado com animação de carregamento — "Calculando rota". */
function Calculating({ count, onDone }: { count: number; onDone: () => void }) {
  const spin = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: nativeDriver }).start();
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: nativeDriver,
      }),
    );
    loop.start();
    const t = setTimeout(onDone, 2400);
    return () => {
      loop.stop();
      clearTimeout(t);
    };
  }, [spin, appear, onDone]);

  return (
    <Animated.View style={[styles.loadingRoot, { opacity: appear }]}>
      <Animated.View
        style={[
          styles.loadingBox,
          {
            transform: [
              { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        >
          <Svg width={112} height={112} viewBox="0 0 112 112">
            <Circle
              cx="56"
              cy="56"
              r="46"
              stroke={colors.surfaceOverlay}
              strokeWidth="10"
              fill="none"
            />
            <Circle
              cx="56"
              cy="56"
              r="46"
              stroke={colors.accent}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="90 300"
            />
          </Svg>
        </Animated.View>
        <View style={{ alignItems: 'center', gap: spacing[1] }}>
          <Text variant="title">Calculando rota</Text>
          <Text variant="callout" tone="secondary">
            Organizando {count} paradas pela melhor sequência
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 48, paddingTop: 40, gap: spacing[6] },
  columns: { flex: 1, flexDirection: 'row', gap: spacing[6] },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[3],
    paddingRight: spacing[5],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickRowOn: { backgroundColor: 'rgba(10,132,255,0.10)', borderColor: 'rgba(10,132,255,0.45)' },
  check: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  selection: { width: 560, padding: spacing[6], gap: spacing[5], marginBottom: spacing[6] },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[3],
    borderRadius: 20,
    backgroundColor: colors.panelHigh,
  },
  stopNumber: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    width: 520,
    height: 400,
    borderRadius: 40,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
});
