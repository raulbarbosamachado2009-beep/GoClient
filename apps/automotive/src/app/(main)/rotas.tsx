import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { usePhone } from '../../layout/form-factor';
import { CLIENTS, REGIONS } from '../../mocks/data';
import { usePrototype } from '../../prototype/state';
import { layout, nativeDriver, spacing, useColors } from '../../theme';
import { Appear, useTween } from '../../ui/motion';
import {
  Avatar,
  BlurBackdrop,
  Button,
  Chip,
  Group,
  Icon,
  IconButton,
  Material,
  PageHeader,
  Row,
  SearchField,
  Text,
} from '../../ui/primitives';
import { Spinner } from '../../ui/spinner';

/**
 * Página de Rotas: escolher os clientes do dia (esquerda), revisar a seleção (direita) e
 * calcular a rota. A seleção é apenas estado visual; o cálculo é uma animação que leva ao
 * mapa com uma rota de exemplo.
 */
export default function RoutesScreen() {
  const c = useColors();
  const { setOverlay } = usePrototype();
  const router = useRouter();
  const [region, setRegion] = useState<string>('Todas');
  const [selected, setSelected] = useState<string[]>(['c7', 'c1', 'c6']);
  const phone = usePhone();

  // Filtro por região (apenas no protótipo).
  const visibleClients = region === 'Todas' ? CLIENTS : CLIENTS.filter((x) => x.region === region);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chosen = selected
    .map((id) => CLIENTS.find((x) => x.id === id))
    .filter((x) => x !== undefined);

  const calculate = () =>
    setOverlay(
      <Calculating
        count={chosen.length}
        onDone={() => {
          setOverlay(null);
          router.replace({ pathname: '/mapa', params: { rota: 'dia' } });
        }}
      />,
    );

  return (
    <View style={styles.page}>
      <PageHeader title="Rotas" subtitle="Escolha os clientes que você vai visitar hoje" />
      <SearchField placeholder="Buscar cliente" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ gap: spacing[3], alignItems: 'center' }}
      >
        {REGIONS.map((r) => (
          <Chip key={r} label={r} selected={region === r} onPress={() => setRegion(r)} />
        ))}
      </ScrollView>

      <View style={[styles.columns, phone && { flexDirection: 'column', gap: spacing[4] }]}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing[10] }}
        >
          <Group inset={136}>
            {visibleClients.map((item, i) => {
              const on = selected.includes(item.id);
              return (
                <Appear key={item.id} delay={i * 30} distance={10}>
                  <Row
                    leading={<Avatar name={item.name} size={80} />}
                    title={item.tradeName}
                    subtitle={`${item.address} · ${item.region}`}
                    onPress={() => toggle(item.id)}
                    trailing={
                      <Icon
                        name={on ? 'checkmark-circle' : 'ellipse-outline'}
                        size={58}
                        color={on ? c.accent : c.textTertiary}
                      />
                    }
                  />
                </Appear>
              );
            })}
          </Group>
        </ScrollView>

        {/* Celular em pé: no lugar do painel lateral, um resumo fixo embaixo. */}
        {phone ? (
          <View style={[styles.phoneBar, { backgroundColor: c.grouped }]}>
            <View style={{ flex: 1 }}>
              <Text variant="headline">Rota de hoje</Text>
              <Text variant="callout" tone="secondary">
                {chosen.length === 0
                  ? 'Toque nos clientes para escolher'
                  : `${chosen.length} ${chosen.length === 1 ? 'cliente' : 'clientes'}`}
              </Text>
            </View>
            <Button
              label="Calcular"
              icon="navigate"
              onPress={calculate}
              disabled={chosen.length === 0}
            />
          </View>
        ) : (
          <View style={[styles.selection, { backgroundColor: c.grouped }]}>
            <View>
              <Text variant="title2">Rota de hoje</Text>
              <Text variant="callout" tone="secondary">
                {chosen.length === 0
                  ? 'Nenhum cliente'
                  : `${chosen.length} ${chosen.length === 1 ? 'cliente' : 'clientes'} · qua, 18 nov`}
              </Text>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing[2] }}
            >
              {chosen.length === 0 ? (
                <View style={styles.empty}>
                  <Icon name="git-network" size={56} color={c.textTertiary} />
                  <Text variant="callout" tone="secondary" style={{ textAlign: 'center' }}>
                    Toque nos clientes ao lado para montar a rota do dia.
                  </Text>
                </View>
              ) : (
                chosen.map((x, i) => (
                  <Appear key={x.id} axis="x" distance={20}>
                    <View style={[styles.stop, { backgroundColor: c.fill }]}>
                      <View style={[styles.num, { backgroundColor: c.accent }]}>
                        <Text
                          variant="bodyStrong"
                          color="#FFFFFF"
                          style={{ fontSize: 28, lineHeight: 34 }}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="bodyStrong"
                          numberOfLines={1}
                          style={{ fontSize: 27, lineHeight: 33 }}
                        >
                          {x.tradeName}
                        </Text>
                        <Text
                          variant="caption"
                          tone="secondary"
                          numberOfLines={1}
                          style={{ fontSize: 20, lineHeight: 26 }}
                        >
                          {x.district}
                        </Text>
                      </View>
                      <IconButton
                        icon="close-circle"
                        iconSize={42}
                        color={c.textTertiary}
                        accessibilityLabel="Remover"
                        onPress={() => toggle(x.id)}
                      />
                    </View>
                  </Appear>
                ))
              )}
            </ScrollView>

            <Button
              label="Calcular rota"
              size="xl"
              icon="navigate"
              onPress={calculate}
              disabled={chosen.length === 0}
            />
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Quadro arredondado de carregamento (estilo HUD do iOS) — "Calculando rota". O desfoque
 * do fundo cresce aos poucos e o quadro entra com mola (sem animar a opacidade, que
 * desligaria o desfoque durante a transição).
 */
function Calculating({ count, onDone }: { count: number; onDone: () => void }) {
  const c = useColors();
  const blur = useTween(1, 360);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, {
      toValue: 1,
      damping: 16,
      stiffness: 200,
      useNativeDriver: nativeDriver,
    }).start();
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [v, onDone]);

  return (
    <View style={styles.hudRoot}>
      <BlurBackdrop progress={blur} />
      <Animated.View
        style={{
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }}
      >
        <Material style={styles.hud}>
          <Spinner size={104} color={c.text} />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text variant="title2">Calculando rota</Text>
            <Text variant="callout" tone="secondary">
              {count} paradas
            </Text>
          </View>
        </Material>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 48, paddingTop: 36, gap: spacing[5] },
  phoneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    padding: spacing[5],
    borderRadius: layout.radius.lg,
    marginBottom: spacing[5],
  },
  columns: { flex: 1, flexDirection: 'row', gap: spacing[6] },
  selection: {
    width: 540,
    borderRadius: layout.radius.lg,
    padding: spacing[6],
    gap: spacing[5],
    marginBottom: spacing[8],
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    minHeight: 104,
    padding: spacing[4],
    paddingLeft: spacing[5],
    borderRadius: layout.radius.md,
  },
  num: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  empty: {
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
  },
  hudRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hud: {
    width: 360,
    height: 360,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[10],
  },
});
