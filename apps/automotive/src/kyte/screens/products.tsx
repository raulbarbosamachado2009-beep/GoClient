import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTabBarSpace } from '../../layout/form-factor';
import { brl, fmtQty, type KyteProduct, norm } from '../model';
import { useKyteList } from '../store';
import { Header, KY, PlusButton, SearchField, State, Tabs, Text, Thumb, useKySize } from '../ui';
import { useKyteNav } from './nav';

/** Produtos (print 6): abas Itens/Estoque, busca e a lista com foto, nome e preço. */
export function ProductsScreen() {
  const s = useKySize();
  const nav = useKyteNav();
  const data = useKyteList('product');
  const [tab, setTab] = useState<'itens' | 'estoque'>('itens');
  const [q, setQ] = useState('');
  const tabSpace = useTabBarSpace();

  const list = useMemo(() => {
    const all = [...(data.list ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const t = norm(q);
    return t ? all.filter((p) => norm(`${p.name} ${p.code}`).includes(t)) : all;
  }, [data.list, q]);

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header
        title={`Produtos${data.list ? ` (${data.list.length})` : ''}`}
        onMenu={nav.menu}
        right={<PlusButton label="Cadastrar produto com a Havena" onPress={nav.havena} />}
      />
      <View style={{ paddingHorizontal: s.pad, gap: 14, paddingBottom: 14 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'itens', label: 'ITENS', icon: 'cube-outline' },
            { key: 'estoque', label: 'ESTOQUE', icon: 'storefront-outline' },
          ]}
        />
        <SearchField value={q} onChange={setQ} placeholder="Item ou código" />
      </View>
      {!data.list ? (
        <State
          loading={data.loading}
          error={data.error}
          onRetry={data.refresh}
          onOpenKyte={() => nav.go('vender')}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id || p.name}
          initialNumToRender={12}
          windowSize={7}
          contentContainerStyle={{ paddingHorizontal: s.pad, paddingBottom: tabSpace + 24, gap: 8 }}
          onRefresh={data.refresh}
          refreshing={data.busy}
          ListEmptyComponent={
            <State
              empty={q ? `Nenhum produto com "${q}".` : 'Nenhum produto encontrado no Kyte.'}
            />
          }
          renderItem={({ item }) => <ProductRow p={item} stock={tab === 'estoque'} />}
        />
      )}
    </View>
  );
}

function ProductRow({ p, stock }: { p: KyteProduct; stock: boolean }) {
  const s = useKySize();
  const thumb = s.phone ? 76 : 64;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        backgroundColor: KY.card,
        borderRadius: 14,
        paddingHorizontal: 22,
        height: s.rowH,
      }}
    >
      <Thumb image={p.image} name={p.name} size={thumb} />
      <Text size={s.row} weight="medium" lines={1} style={{ flex: 1 }}>
        {p.name}
      </Text>
      {stock ? (
        <Text size={s.row} color={p.stock != null && p.stock <= 0 ? KY.red : KY.ink}>
          {p.stock == null ? 'Sem controle' : `${fmtQty(p.stock)} un.`}
        </Text>
      ) : (
        <Text size={s.row}>{brl(p.price)}</Text>
      )}
    </View>
  );
}
