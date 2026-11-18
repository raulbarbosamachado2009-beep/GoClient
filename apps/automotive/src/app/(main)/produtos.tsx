import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { type MockProduct, PRODUCT_CATEGORIES, PRODUCTS } from '../../mocks/data';
import { layout, spacing, useColors } from '../../theme';
import { Appear } from '../../ui/motion';
import {
  Chip,
  Group,
  Icon,
  PageHeader,
  Row,
  SearchField,
  Segmented,
  Text,
  Touchable,
} from '../../ui/primitives';

type ViewMode = 'cards' | 'list';

/**
 * Página de Produtos: busca, categorias e alternância entre cartões e lista.
 * Categoria e modo mudam apenas o estado visual (sem filtrar dados).
 */
export default function ProductsScreen() {
  const [category, setCategory] = useState<string>('Todos');
  const [mode, setMode] = useState<ViewMode>('cards');

  return (
    <View style={styles.page}>
      <PageHeader
        title="Produtos"
        subtitle={`${PRODUCTS.length} produtos no catálogo`}
        right={
          <Segmented<ViewMode>
            value={mode}
            onChange={setMode}
            segmentWidth={150}
            options={[
              { value: 'cards', icon: 'grid', label: 'Cartões' },
              { value: 'list', icon: 'list', label: 'Lista' },
            ]}
          />
        }
      />
      <SearchField placeholder="Buscar por nome ou código" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ gap: spacing[3], alignItems: 'center' }}
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
          contentContainerStyle={{ gap: spacing[5], paddingBottom: spacing[10] }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Appear delay={index * 30} distance={12} style={{ flex: 1, maxWidth: '25%' }}>
              <ProductCard product={item} />
            </Appear>
          )}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing[10] }}
        >
          <Group inset={136}>
            {PRODUCTS.map((p, i) => (
              <Appear key={p.id} delay={i * 25} distance={10}>
                <Row
                  leading={<ProductImage product={p} size={88} />}
                  title={p.name}
                  subtitle={`${p.category} · ${p.sku} · ${p.stock} em estoque`}
                  value={p.price}
                  chevron
                  onPress={() => {}}
                />
              </Appear>
            ))}
          </Group>
        </ScrollView>
      )}
    </View>
  );
}

function ProductImage({ product, size }: { product: MockProduct; size: number | 'fill' }) {
  const c = useColors();
  const fill = size === 'fill';
  return (
    <View
      style={{
        width: fill ? '100%' : size,
        height: fill ? 210 : size,
        borderRadius: fill ? 20 : 16,
        backgroundColor: c.fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        name={product.icon.replace('-outline', '') as typeof product.icon}
        size={fill ? 84 : 40}
        color={c.textSecondary}
      />
    </View>
  );
}

function ProductCard({ product }: { product: MockProduct }) {
  const c = useColors();
  const low = product.stock < 30;
  return (
    <Touchable accessibilityRole="button" style={[styles.card, { backgroundColor: c.grouped }]}>
      <ProductImage product={product} size="fill" />
      <View style={{ gap: 2, paddingHorizontal: spacing[2] }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {product.name}
        </Text>
        <Text variant="caption" tone="secondary">
          {product.category} · {product.sku}
        </Text>
      </View>
      <View style={styles.cardFoot}>
        <Text variant="headline">{product.price}</Text>
        <Text variant="caption" tone={low ? 'danger' : 'secondary'}>
          {low ? `Restam ${product.stock}` : `${product.stock} un.`}
        </Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 48, paddingTop: 36, gap: spacing[5] },
  card: {
    padding: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[3],
    borderRadius: layout.radius.lg,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
  },
});
