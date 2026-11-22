import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTabBarSpace } from '../../layout/form-factor';
import { Touchable } from '../../ui/primitives';
import { brl, dayLabel, hhmm } from '../model';
import { useKyteList, useKyteSummary } from '../store';
import { GreenButton, Header, IconButton, KIcon, KY, Text, useKySize } from '../ui';
import { useKyteNav } from './nav';

/**
 * Início (prints 1 e 5): vendas de hoje em destaque, ontem e o mês, e "Registrar venda".
 * Celular: o cartão escuro em cima e, embaixo, produtos e as últimas vendas.
 */
export function HomeScreen() {
  const s = useKySize();
  const nav = useKyteNav();
  const sales = useKyteList('sale');
  const products = useKyteList('product');
  const sum = useKyteSummary(sales.list);
  const [hidden, setHidden] = useState(false);
  const tabSpace = useTabBarSpace();
  const money = (v: string) => (hidden ? 'R$ ••••' : v);

  const hero = (
    <View
      style={{
        backgroundColor: s.phone ? KY.navy : KY.night,
        borderBottomLeftRadius: s.phone ? 28 : 0,
        borderBottomRightRadius: s.phone ? 28 : 0,
        paddingBottom: s.phone ? 30 : 0,
        flex: s.phone ? undefined : 1,
      }}
    >
      <Header
        title="Início"
        dark
        onMenu={nav.menu}
        right={
          <IconButton
            icon={hidden ? 'eye-off-outline' : 'eye-outline'}
            color={KY.green}
            label={hidden ? 'Mostrar valores' : 'Esconder valores'}
            onPress={() => setHidden((h) => !h)}
          />
        }
      />
      <View
        style={{
          alignItems: 'center',
          paddingHorizontal: s.pad + 10,
          flex: s.phone ? undefined : 1,
          justifyContent: 'center',
          gap: s.phone ? 6 : 10,
        }}
      >
        <Text size={s.phone ? 26 : 40} weight="semibold" color={KY.green}>
          HOJE
        </Text>
        <Text size={s.phone ? 76 : 120} weight="bold" color="#FFFFFF" lines={1}>
          {money(sum.today.total)}
        </Text>
        {sum.today.count != null && (
          <Text size={s.phone ? 26 : 40} weight="medium" color={KY.green}>
            em {sum.today.count} {sum.today.count === 1 ? 'venda concluída' : 'vendas concluídas'}
          </Text>
        )}
        <View
          style={{
            height: 2,
            alignSelf: 'stretch',
            backgroundColor: 'rgba(255,255,255,.18)',
            marginVertical: s.phone ? 14 : 18,
            marginHorizontal: s.phone ? 40 : 160,
          }}
        />
        <Line label="Ontem:" value={money(sum.yesterday.total)} size={s.phone ? 28 : 44} />
        <Line label="Esse mês:" value={money(sum.month.total)} size={s.phone ? 28 : 44} />
        <GreenButton
          label="Registrar venda"
          onPress={() => nav.go('vender')}
          style={{
            alignSelf: 'stretch',
            marginTop: s.phone ? 26 : 30,
            marginHorizontal: s.phone ? 0 : 120,
            marginBottom: s.phone ? 0 : 50,
          }}
          height={s.phone ? 96 : 128}
        />
      </View>
    </View>
  );

  if (!s.phone) return <View style={{ flex: 1, backgroundColor: KY.night }}>{hero}</View>;

  const recent = (sales.list ?? []).filter((x) => x.date != null).slice(0, 4);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: KY.bg }}
      contentContainerStyle={{ paddingBottom: tabSpace + 30 }}
    >
      {hero}
      <View style={{ padding: s.pad, gap: s.pad }}>
        <View style={{ backgroundColor: KY.card, borderRadius: 20, padding: 26, gap: 20 }}>
          <Text size={s.big} weight="semibold">
            Produtos
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: KY.chip,
              borderRadius: 18,
              padding: 22,
              gap: 22,
            }}
          >
            <Touchable style={{ alignItems: 'center', flex: 1 }} onPress={() => nav.go('produtos')}>
              <Text size={40} weight="bold">
                {products.list ? products.list.length : '—'}
              </Text>
              <Text size={s.small} weight="semibold" color={KY.ink} style={{ textAlign: 'center' }}>
                PRODUTOS CADASTRADOS
              </Text>
            </Touchable>
            <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: KY.line }} />
            <GreenButton
              label="Produto"
              icon="add"
              onPress={nav.havena}
              style={{ flex: 1.3 }}
              height={78}
            />
          </View>
        </View>
        {recent.length > 0 && (
          <View style={{ backgroundColor: KY.card, borderRadius: 20, padding: 26, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text size={s.big} weight="semibold" style={{ flex: 1 }}>
                Últimas vendas
              </Text>
              <Touchable onPress={() => nav.go('historico')}>
                <Text size={s.sub} weight="semibold" color={KY.greenInk}>
                  Ver todas
                </Text>
              </Touchable>
            </View>
            {recent.map((v) => (
              <Touchable
                key={v.id}
                onPress={() => nav.open({ type: 'sale', id: v.id })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  gap: 16,
                  borderTopWidth: 1,
                  borderTopColor: KY.line,
                }}
              >
                <KIcon name="cash-outline" size={30} color={KY.ink} />
                <View style={{ flex: 1 }}>
                  <Text size={s.row} weight="semibold">
                    {money(brl(v.total))}
                  </Text>
                  <Text size={s.small} color={KY.sub} lines={1}>
                    {v.customer?.name || 'Sem cliente'}
                  </Text>
                </View>
                <Text size={s.small} color={KY.sub}>
                  {v.date ? `${dayLabel(v.date)} ${hhmm(v.date)}` : ''}
                </Text>
              </Touchable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Line({ label, value, size }: { label: string; value: string; size: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
      <Text size={size} weight="semibold" color={KY.green}>
        {label}
      </Text>
      <Text size={size} weight="semibold" color="#FFFFFF">
        {value}
      </Text>
    </View>
  );
}
