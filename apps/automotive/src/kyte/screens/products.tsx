import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Share, View } from 'react-native';
import { useTabBarSpace } from '../../layout/form-factor';
import { concentric } from '../../theme';
import { Swap } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import { brl, fmtQty, type KyteProduct, norm } from '../model';
import { useKyteList } from '../store';
import {
  Header,
  IconButton,
  KY,
  PlusButton,
  SearchField,
  State,
  Tabs,
  Text,
  Thumb,
  useKySize,
} from '../ui';
import { useCanCreate } from './create';
import { useKyteNav } from './nav';

/** Produtos (print 6): abas Itens/Estoque, busca e a lista com foto, nome e preço. */
export function ProductsScreen() {
  const s = useKySize();
  const nav = useKyteNav();
  const canCreate = useCanCreate('product');
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
        right={
          // Celular: abre o cadastro. Multimídia (Regra 1): cadastro só pelo Lucas.
          canCreate ? (
            <PlusButton label="Novo produto" onPress={() => nav.open({ type: 'newProduct' })} />
          ) : (
            <PlusButton label="Cadastrar produto com o Lucas" onPress={nav.havena} />
          )
        }
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
          renderItem={({ item }) => (
            <ProductRow
              p={item}
              stock={tab === 'estoque'}
              onOpen={() => nav.open({ type: 'product', id: item.id || item.name })}
            />
          )}
        />
      )}
    </View>
  );
}

function ProductRow({ p, stock, onOpen }: { p: KyteProduct; stock: boolean; onOpen: () => void }) {
  const s = useKySize();
  // Miniatura concêntrica com a linha: raio da linha − (altura da linha − miniatura) / 2.
  const inset = (s.rowH - s.thumb) / 2;
  return (
    <Touchable
      onPress={onOpen}
      scaleTo={0.99}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        backgroundColor: KY.card,
        borderRadius: s.radius,
        paddingLeft: inset,
        paddingRight: s.pad,
        height: s.rowH,
      }}
    >
      <Thumb image={p.image} name={p.name} size={s.thumb} radius={concentric(s.radius, inset, 6)} />
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
    </Touchable>
  );
}

/** Produto aberto (prints 15 e 16): Cadastro e Estoque, só para consulta. */
export function ProductDetail({ id }: { id: string }) {
  const s = useKySize();
  const nav = useKyteNav();
  const data = useKyteList('product');
  const [tab, setTab] = useState<'cadastro' | 'estoque'>('cadastro');
  const p = (data.list ?? []).find((x) => (x.id || x.name) === id);
  if (!p)
    return (
      <View style={{ flex: 1, backgroundColor: KY.bg }}>
        <Header title="Produto" onBack={nav.back} />
        <State empty="Produto não encontrado." />
      </View>
    );
  const field = (label: string, value: string) => (
    <View
      style={{
        backgroundColor: KY.card,
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 16,
        flex: 1,
      }}
    >
      <Text size={s.small} weight="semibold" color={KY.faint}>
        {label}
      </Text>
      <Text size={s.row}>{value}</Text>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header
        title={p.name}
        onBack={nav.back}
        right={
          <IconButton
            icon="share-social-outline"
            label="Compartilhar"
            onPress={() => Share.share({ message: `${p.name} — ${brl(p.price)}` })}
          />
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: s.pad, gap: 14, paddingBottom: 40 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'cadastro', label: 'CADASTRO', icon: 'create-outline' },
            { key: 'estoque', label: 'ESTOQUE', icon: 'storefront-outline' },
          ]}
        />
        <View
          style={{
            backgroundColor: '#E4E8ED',
            borderRadius: 18,
            padding: 22,
            alignItems: 'center',
          }}
        >
          {p.image ? (
            <Thumb image={p.image} name={p.name} size={s.phone ? 240 : 180} />
          ) : (
            <View
              style={{
                width: s.phone ? 300 : 280,
                borderRadius: 14,
                overflow: 'hidden',
                backgroundColor: '#525D6E',
              }}
            >
              <View
                style={{
                  height: s.phone ? 150 : 140,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                }}
              >
                <Text size={s.big} weight="bold" color="#FFFFFF" lines={1}>
                  {p.name}
                </Text>
              </View>
              <View style={{ backgroundColor: '#46505F', padding: 14 }}>
                <Text size={s.sub} weight="semibold" color="#FFFFFF" lines={1}>
                  {p.name}
                </Text>
                <Text size={s.sub} color="#FFFFFF">
                  {brl(p.price)}
                </Text>
              </View>
            </View>
          )}
        </View>
        <Swap id={tab} index={tab === 'cadastro' ? 0 : 1} style={{ gap: 14 }}>
          {tab === 'cadastro' ? (
            <>
              <View style={{ flexDirection: s.phone ? 'column' : 'row', gap: 14 }}>
                {field('Nome do Produto', p.name)}
                {field('Preço de Venda', brl(p.price))}
              </View>
              <View style={{ flexDirection: s.phone ? 'column' : 'row', gap: 14 }}>
                {field('Categoria', p.category || '—')}
                {field('Código', p.code || '—')}
              </View>
            </>
          ) : (
            field(
              'Estoque atual',
              p.stock == null ? 'Sem controle de estoque' : `${fmtQty(p.stock)} un.`,
            )
          )}
        </Swap>
        <Text size={s.small} color={KY.sub}>
          Só consulta: para mudar o cadastro use o Kyte.
        </Text>
      </ScrollView>
    </View>
  );
}
