import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { type MockProduct, PRODUCT_CATEGORIES, PRODUCTS } from '../../mocks/data';
import { colors, spacing } from '../../theme';
import {
  Chip,
  Divider,
  Icon,
  PageHeader,
  SearchField,
  Segmented,
  Text,
  Touchable,
} from '../../ui/primitives';

type View_ = 'cards' | 'list';

/**
 * Página de Produtos: busca, categorias e alternância entre cartões e lista.
 * Categoria e modo de exibição mudam apenas o estado visual (sem filtrar dados).
 */
export default function ProductsScreen() {
  const [category, setCategory] = useState<string>('Todos');
  const [mode, setMode] = useState<View_>('cards');

  return (
    <View style={styles.page}>
      <PageHeader
        title="Produtos"
        subtitle={`${PRODUCTS.length} produtos no catálogo · atualizado hoje às 08:12`}
        right={
          <Segmented<View_>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'cards', icon: 'grid-outline', label: 'Cartões' },
              { value: 'list', icon: 'list-outline', label: 'Lista' },
            ]}
          />
        }
      />
      <SearchField placeholder="Buscar por nome ou código" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[3] }}
        style={{ flexGrow: 0, flexShrink: 0 }}
      >
        {PRODUCT_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {mode === 'cards' ? (
        <FlatList
          key="cards"
          data={PRODUCTS}
          numColumns={4}
          keyExtractor={(p) => p.id}
          columnWrapperStyle={{ gap: spacing[5] }}
          contentContainerStyle={{ gap: spacing[5], paddingBottom: spacing[8] }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      ) : (
        <FlatList
          key="list"
          data={PRODUCTS}
          keyExtractor={(p) => p.id}
          ItemSeparatorComponent={() => <Divider inset={120} />}
          contentContainerStyle={{ paddingBottom: spacing[8] }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ProductRow product={item} />}
        />
      )}
    </View>
  );
}

function ProductImage({ product, size }: { product: MockProduct; size: number | '100%' }) {
  return (
    <View
      style={{
        width: size,
        height: size === '100%' ? 200 : size,
        borderRadius: size === '100%' ? 22 : 18,
        backgroundColor: product.tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={product.icon} size={size === '100%' ? 88 : 44} color="rgba(255,255,255,0.86)" />
    </View>
  );
}

function Stock({ stock }: { stock: number }) {
  const low = stock < 30;
  return (
    <Text variant="caption" tone={low ? 'danger' : 'secondary'}>
      {low ? `Restam ${stock}` : `${stock} em estoque`}
    </Text>
  );
}

function ProductCard({ product }: { product: MockProduct }) {
  return (
    <Touchable accessibilityRole="button" style={styles.card}>
      <ProductImage product={product} size="100%" />
      <View style={{ gap: 2, paddingHorizontal: spacing[1] }}>
        <Text variant="label" tone="tertiary">
          {product.category.toUpperCase()} · {product.sku}
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          {product.name}
        </Text>
      </View>
      <View style={styles.cardFoot}>
        <Text variant="headline">{product.price}</Text>
        <Stock stock={product.stock} />
      </View>
    </Touchable>
  );
}

function ProductRow({ product }: { product: MockProduct }) {
  return (
    <Touchable accessibilityRole="button" style={styles.row}>
      <ProductImage product={product} size={96} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{product.name}</Text>
        <Text variant="callout" tone="secondary">
          {product.category} · {product.sku}
        </Text>
      </View>
      <View style={{ width: 200 }}>
        <Stock stock={product.stock} />
      </View>
      <Text variant="headline" style={{ width: 180, textAlign: 'right' }}>
        {product.price}
      </Text>
      <Icon name="chevron-forward" size={30} color={colors.textTertiary} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 48, paddingTop: 40, gap: spacing[6] },
  card: {
    flex: 1,
    maxWidth: '25%',
    padding: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[3],
    borderRadius: 28,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[6], paddingVertical: spacing[3] },
});
