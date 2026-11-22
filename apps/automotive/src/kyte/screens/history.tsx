import { useMemo, useState } from 'react';
import { ScrollView, SectionList, View } from 'react-native';
import { Touchable } from '../../ui/primitives';
import { brl, dayLabel, hhmm, itemsLine, type KyteSale, norm } from '../model';
import { useKyteList, useKyteSummary } from '../store';
import {
  FooterBar,
  Header,
  type IconName,
  KIcon,
  KY,
  PlusButton,
  SearchField,
  State,
  Text,
  useKySize,
} from '../ui';
import { useKyteNav } from './nav';

export const payIcon = (p: string): IconName =>
  /cart[aã]o|cr[eé]dito|d[eé]bito|card/i.test(p)
    ? 'card-outline'
    : /pix/i.test(p)
      ? 'flash-outline'
      : /fiado|conta|prazo/i.test(p)
        ? 'time-outline'
        : 'cash-outline';

/** Histórico (prints 4 e 8): vendas por dia, busca, vendedores e o total dos 30 dias. */
export function HistoryScreen() {
  const s = useKySize();
  const nav = useKyteNav();
  const data = useKyteList('sale');
  const sum = useKyteSummary(data.list);
  const [q, setQ] = useState('');
  const [seller, setSeller] = useState<string | null>(null);
  const [pickSeller, setPickSeller] = useState(false);

  const sellers = useMemo(
    () => [...new Set((data.list ?? []).map((v) => v.seller).filter(Boolean))].sort(),
    [data.list],
  );

  const sections = useMemo(() => {
    const t = norm(q).replace(/^#/, '');
    const rows = (data.list ?? [])
      .filter((v) => v.date != null)
      .filter((v) => !seller || v.seller === seller)
      .filter(
        (v) =>
          !t ||
          v.number.includes(t) ||
          norm(v.customer?.name ?? '').includes(t) ||
          v.items.some((i) => norm(i.name).includes(t)),
      )
      .sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
    const groups: { title: string; count: number; total: number; data: KyteSale[] }[] = [];
    for (const v of rows) {
      const title = dayLabel(v.date ?? 0);
      let g = groups[groups.length - 1];
      if (!g || g.title !== title) {
        g = { title, count: 0, total: 0, data: [] };
        groups.push(g);
      }
      g.data.push(v);
      if (!v.canceled) {
        g.count++;
        g.total += v.total ?? 0;
      }
    }
    return groups;
  }, [data.list, q, seller]);

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header
        title="Histórico"
        onMenu={nav.menu}
        right={<PlusButton label="Registrar venda" onPress={() => nav.go('vender')} />}
      />
      <View style={{ paddingHorizontal: s.pad, paddingBottom: 10, gap: 12 }}>
        <View
          style={{
            flexDirection: s.phone ? 'column' : 'row',
            gap: 12,
            alignItems: s.phone ? 'stretch' : 'center',
          }}
        >
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Item, cliente ou código"
            style={{ flex: s.phone ? undefined : 1 }}
          />
          {sellers.length > 0 && (
            <Touchable
              onPress={() => setPickSeller((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 12,
                height: 64,
              }}
            >
              <KIcon name="people-outline" size={s.icon} />
              <Text size={s.sub} weight="medium">
                {seller ?? 'Vendedores'}
              </Text>
              <KIcon name={pickSeller ? 'chevron-up' : 'chevron-down'} size={s.icon - 6} />
            </Touchable>
          )}
        </View>
        {pickSeller && (
          <ScrollView
            horizontal
            contentContainerStyle={{ gap: 10 }}
            showsHorizontalScrollIndicator={false}
          >
            {[null, ...sellers].map((name) => (
              <Touchable
                key={name ?? '*'}
                onPress={() => {
                  setSeller(name);
                  setPickSeller(false);
                }}
                style={{
                  paddingHorizontal: 22,
                  height: 54,
                  borderRadius: 999,
                  justifyContent: 'center',
                  backgroundColor: seller === name ? KY.ink : KY.card,
                }}
              >
                <Text size={s.small} weight="semibold" color={seller === name ? '#FFFFFF' : KY.ink}>
                  {name ?? 'Todos'}
                </Text>
              </Touchable>
            ))}
          </ScrollView>
        )}
      </View>
      {!data.list ? (
        <State
          loading={data.loading}
          error={data.error}
          onRetry={data.refresh}
          onOpenKyte={() => nav.go('vender')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(v) => v.id || v.number}
          initialNumToRender={12}
          windowSize={7}
          stickySectionHeadersEnabled={false}
          onRefresh={data.refresh}
          refreshing={data.busy}
          contentContainerStyle={{ paddingHorizontal: s.pad, paddingBottom: 18 }}
          ListEmptyComponent={
            <State empty={q ? `Nenhuma venda com "${q}".` : 'Nenhuma venda encontrada.'} />
          }
          renderSectionHeader={({ section }) => (
            <View style={{ paddingTop: 18, paddingBottom: 10 }}>
              <Text size={s.title} weight="semibold">
                {section.title}
              </Text>
              <Text size={s.sub} weight="medium" color={KY.faint}>
                {section.count} {section.count === 1 ? 'venda' : 'vendas'}, {brl(section.total)}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <SaleRow v={item} onOpen={() => nav.open({ type: 'sale', id: item.id })} />
          )}
        />
      )}
      <View>
        <FooterBar>
          <KIcon name="calendar-outline" size={s.icon + 6} color="#FFFFFF" />
          <View style={{ width: 2, height: 54, backgroundColor: 'rgba(255,255,255,.2)' }} />
          <View>
            <Text size={s.sub} weight="bold" color="#FFFFFF">
              Últimos 30 dias
            </Text>
            <Text size={s.sub} color="#FFFFFF">
              {sum.last30.total} em {sum.last30.count} {sum.last30.count === 1 ? 'venda' : 'vendas'}
            </Text>
          </View>
        </FooterBar>
      </View>
    </View>
  );
}

export function SaleRow({ v, onOpen }: { v: KyteSale; onOpen: () => void }) {
  const s = useKySize();
  return (
    <Touchable
      onPress={onOpen}
      scaleTo={0.99}
      style={{
        flexDirection: 'row',
        gap: 22,
        backgroundColor: KY.card,
        borderRadius: 14,
        paddingHorizontal: 26,
        paddingVertical: s.phone ? 20 : 16,
        opacity: v.canceled ? 0.6 : 1,
      }}
    >
      <KIcon name={payIcon(v.payment)} size={s.icon + 10} color={KY.ink} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Text
            size={s.row}
            weight="bold"
            style={v.canceled ? { textDecorationLine: 'line-through' } : undefined}
          >
            {brl(v.total)}
          </Text>
          {v.canceled && (
            <Text size={s.small} weight="semibold" color={KY.red}>
              CANCELADA
            </Text>
          )}
        </View>
        {v.items.length > 0 && (
          <Text size={s.sub} color={KY.ink} lines={1}>
            {itemsLine(v.items)}
          </Text>
        )}
        {v.customer?.name ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <KIcon name="person-outline" size={s.sub} color={KY.ink} />
            <Text size={s.sub} weight="medium" lines={1}>
              {v.customer.name}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text size={s.sub} weight="semibold" color={KY.ink}>
          {v.date ? hhmm(v.date) : ''}
        </Text>
        {v.number ? (
          <Text size={s.sub} color={KY.sub}>
            #{v.number}
          </Text>
        ) : null}
      </View>
    </Touchable>
  );
}
