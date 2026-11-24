import { can } from '@goclient/core';
import { StyleSheet, View } from 'react-native';
import { usePhone } from '../layout/form-factor';
import { concentric, spacing, useColors } from '../theme';
import { Icon, type IconName, Text, Touchable } from '../ui/primitives';
import { useStops } from './stops';

/**
 * Regra 3 (`can()` em `@goclient/core`): rotas são montadas só no celular. A multimídia só
 * lista e começa as rotas já montadas. A API aplica a mesma regra.
 */
export function useCanBuildRoutes(): boolean {
  const phone = usePhone();
  return can(
    { role: 'seller', platform: phone ? 'mobile' : 'automotive', channel: 'manual' },
    'route',
    'create',
  ).allowed;
}

/** Tom das opções: tudo no azul do app (círculo azul translúcido e ícone azul), em harmonia. */
export function useTint() {
  const c = useColors();
  return {
    soft: c.mode === 'dark' ? 'rgba(10,132,255,0.2)' : 'rgba(0,122,255,0.12)',
    ink: c.accent,
    group: c.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
  };
}

/**
 * Linha de opção no estilo dos cartões do Apple Maps: ícone em círculo, título, legenda e
 * seta. `big` = multimídia (linha de 140, ícone de 84).
 */
export function OptionRow({
  icon,
  title,
  sub,
  onPress,
  big,
  first,
  strong,
}: {
  icon: IconName;
  title: string;
  sub?: string;
  onPress: () => void;
  big: boolean;
  first?: boolean;
  /** Ação principal: círculo azul cheio com ícone branco. */
  strong?: boolean;
}) {
  const c = useColors();
  const t = useTint();
  const dot = big ? 80 : 72;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      scaleTo={0.98}
      style={[
        styles.row,
        { minHeight: big ? 140 : 116 },
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: strong ? t.ink : t.soft,
          },
        ]}
      >
        <Icon name={icon} size={big ? 42 : 36} color={strong ? '#FFFFFF' : t.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          variant="headline"
          numberOfLines={1}
          style={big ? { fontSize: 30, lineHeight: 36 } : { fontSize: 29, lineHeight: 35 }}
        >
          {title}
        </Text>
        {sub ? (
          <Text
            variant="callout"
            tone="secondary"
            numberOfLines={1}
            style={big ? { fontSize: 24, lineHeight: 30 } : { fontSize: 25, lineHeight: 31 }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={30} color={c.textTertiary} />
    </Touchable>
  );
}

/** Grupo das linhas (raio concêntrico com o cartão em volta). */
export function OptionGroup({
  children,
  outerRadius,
  outerPadding,
}: {
  children: React.ReactNode;
  outerRadius: number;
  outerPadding: number;
}) {
  const t = useTint();
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: t.group, borderRadius: concentric(outerRadius, outerPadding) },
      ]}
    >
      {children}
    </View>
  );
}

/**
 * "Rotas": no celular, "Montar nova rota" + as rotas montadas; na multimídia, só as rotas
 * montadas (tocar começa a rota).
 */
export function SavedRoutes({
  onBuild,
  outerRadius,
  outerPadding,
}: {
  /** Só no celular (Regra 3). */
  onBuild?: () => void;
  outerRadius: number;
  outerPadding: number;
}) {
  const c = useColors();
  const stops = useStops();
  const phone = usePhone();
  const canBuild = useCanBuildRoutes();
  const big = !phone;
  const name = (id: string) => stops.find(id)?.tradeName ?? '';
  return (
    <View style={{ gap: spacing[5] }}>
      {canBuild && onBuild && (
        <OptionGroup outerRadius={outerRadius} outerPadding={outerPadding}>
          <OptionRow
            first
            strong
            big={big}
            icon="add"
            title="Montar nova rota"
            sub="Escolha os clientes; o GoClient ordena"
            onPress={onBuild}
          />
        </OptionGroup>
      )}
      <Text
        variant="title2"
        style={big ? { fontSize: 30, lineHeight: 36 } : { fontSize: 34, lineHeight: 40 }}
      >
        Rotas montadas
      </Text>
      {stops.saved.length === 0 ? (
        <Text variant="body" tone="secondary">
          {canBuild
            ? 'As rotas que você montar aparecem aqui.'
            : 'Monte uma rota no GoClient do celular e ela aparece aqui para começar.'}
        </Text>
      ) : (
        <OptionGroup outerRadius={outerRadius} outerPadding={outerPadding}>
          {stops.saved.map((r, i) => {
            const count = r.ids.length + r.stops.length;
            const first = r.ids[0] ? name(r.ids[0]) : (r.stops[0]?.name ?? '');
            return (
              <OptionRow
                key={r.id}
                first={i === 0}
                big={big}
                icon="trail-sign"
                title={r.name}
                sub={`${count === 1 ? '1 parada' : `${count} paradas`} · ${r.when}${first ? ` · ${first}` : ''}`}
                onPress={() => stops.startSaved(r.id)}
              />
            );
          })}
        </OptionGroup>
      )}
      {!canBuild && (
        <View style={styles.note}>
          <Icon name="phone-portrait-outline" size={28} color={c.textSecondary} />
          <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
            Para montar ou mudar uma rota, use o GoClient no celular.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingRight: spacing[5],
    paddingVertical: spacing[3],
  },
  dot: { alignItems: 'center', justifyContent: 'center' },
  group: { paddingLeft: spacing[5], overflow: 'hidden' },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
});
