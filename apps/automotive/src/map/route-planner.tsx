import { useMemo, useState } from 'react';
import { FlatList, Platform, TextInput, View } from 'react-native';
import { kyteAgentAvailable, kyteLogged } from '../kyte/agent';
import { customerAddress, useKyteList } from '../kyte/store';
import { CLIENTS } from '../mocks/data';
import { FONT, spacing, useColors } from '../theme';
import { Button, Icon, Text, Touchable } from '../ui/primitives';
import { Spinner } from '../ui/spinner';
import { type ExternalStop, routeName, useStops } from './stops';

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Montar a rota do dia sem sair do Mapa (dentro da aba puxável no celular e do cartão na
 * multimídia): marca os clientes do Kyte e "Calcular" traça uma rota só, na melhor ordem.
 * No Preview usa os clientes de exemplo.
 */
export function RoutePlanner({
  onClose,
  big = false,
  embedded = false,
}: {
  onClose: () => void;
  big?: boolean;
  /**
   * Dentro da aba puxável do celular: a lista não rola sozinha (quem rola é a aba — uma
   * rolagem só) e "Calcular" fica no topo, ao lado do título, sempre acima da barra de abas.
   */
  embedded?: boolean;
}) {
  const c = useColors();
  const stops = useStops();
  const real = Platform.OS !== 'web';
  const kyte = useKyteList('customer', real && kyteAgentAvailable() && kyteLogged());
  const [q, setQ] = useState('');
  // Nome da rota (aparece em "Rotas montadas", no celular e na multimídia).
  const [name, setName] = useState('');
  const [suggested] = useState(routeName);
  const [picked, setPicked] = useState<Record<string, ExternalStop>>(() =>
    Object.fromEntries(
      stops.extra.map((x) => [
        x.tradeName,
        { name: x.tradeName, address: x.address, phone: x.phone },
      ]),
    ),
  );

  const all: ExternalStop[] = useMemo(
    () =>
      real
        ? (kyte.list ?? [])
            .map((k) => ({ name: k.name, address: customerAddress(k), phone: k.phone }))
            .filter((k) => k.address)
        : CLIENTS.map((x) => ({ name: x.tradeName, address: x.address, phone: x.phone })),
    [real, kyte.list],
  );
  const shown = useMemo(() => {
    const t = norm(q);
    const list = t ? all.filter((x) => norm(`${x.name} ${x.address}`).includes(t)) : all;
    // Os marcados primeiro.
    return [...list].sort((a, b) => Number(!!picked[b.name]) - Number(!!picked[a.name]));
  }, [all, q, picked]);
  const count = Object.keys(picked).length;
  const calculate = () => {
    stops.setDay(Object.values(picked), name || suggested);
    stops.showDay();
    onClose();
  };
  const row = (item: ExternalStop) => {
    const on = !!picked[item.name];
    return (
      <Touchable
        scaleTo={0.98}
        onPress={() =>
          setPicked((p) => {
            const n = { ...p };
            if (on) delete n[item.name];
            else n[item.name] = item;
            return n;
          })
        }
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          minHeight: size.h,
          paddingVertical: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="headline" style={{ fontSize: size.row }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="callout" tone="secondary" style={{ fontSize: size.sub }} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        <Icon
          name={on ? 'checkmark-circle' : 'ellipse-outline'}
          size={44}
          color={on ? c.accent : c.textTertiary}
        />
      </Touchable>
    );
  };
  const size = big ? { row: 26, sub: 20, h: 92 } : { row: 30, sub: 24, h: 104 };

  return (
    <View style={{ flex: embedded ? undefined : 1, gap: spacing[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <Text variant="title2" style={{ flex: 1 }}>
          Nova rota
        </Text>
        {embedded && (
          <Button
            label={count ? `Calcular (${count})` : 'Calcular'}
            icon="navigate"
            size="md"
            disabled={!count}
            style={{ borderRadius: 999, paddingHorizontal: spacing[6] }}
            onPress={calculate}
          />
        )}
        <Touchable accessibilityLabel="Fechar" onPress={onClose} style={{ padding: 8 }}>
          <Icon name="close" size={38} color={c.textSecondary} />
        </Touchable>
      </View>
      <View style={{ gap: spacing[2] }}>
        <Text variant="footnote" tone="secondary" style={{ fontSize: size.sub - 2 }}>
          Nome da rota
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            height: 76,
            borderRadius: 22,
            paddingHorizontal: 20,
            backgroundColor: c.fill,
          }}
        >
          <Icon name="pencil" size={28} color={c.textSecondary} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={suggested}
            placeholderTextColor={c.textTertiary}
            maxLength={40}
            accessibilityLabel="Nome da rota"
            style={[
              {
                flex: 1,
                minWidth: 0,
                width: 0,
                color: c.text,
                fontFamily: FONT.textRegular,
                fontSize: size.sub + 4,
              },
              (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object,
            ]}
          />
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          height: 76,
          borderRadius: 22,
          paddingHorizontal: 20,
          backgroundColor: c.fill,
        }}
      >
        <Icon name="search" size={32} color={c.textSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar cliente"
          placeholderTextColor={c.textTertiary}
          style={{
            flex: 1,
            minWidth: 0,
            width: 0,
            color: c.text,
            fontFamily: FONT.textRegular,
            fontSize: size.sub + 4,
          }}
        />
      </View>
      {real && !kyte.list ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          {kyte.error ? (
            <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
              {kyte.error}
            </Text>
          ) : (
            <>
              <Spinner color={c.accent} />
              <Text variant="body" tone="secondary">
                Lendo os clientes do Kyte…
              </Text>
            </>
          )}
        </View>
      ) : embedded ? (
        <View>
          {shown.length ? (
            shown.map((item) => <View key={item.name}>{row(item)}</View>)
          ) : (
            <Text variant="body" tone="secondary" style={{ textAlign: 'center', padding: 20 }}>
              Nenhum cliente com endereço no Kyte.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(x) => x.name}
          initialNumToRender={10}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text variant="body" tone="secondary" style={{ textAlign: 'center', padding: 20 }}>
              Nenhum cliente com endereço no Kyte.
            </Text>
          }
          renderItem={({ item }) => row(item)}
        />
      )}
      {!embedded && (
        <Button
          label={count ? `Calcular rota (${count})` : 'Escolha os clientes'}
          icon="navigate"
          disabled={!count}
          onPress={calculate}
        />
      )}
    </View>
  );
}
