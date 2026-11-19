import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { type MockProduct, PRODUCT_CATEGORIES, PRODUCTS } from '../../mocks/data';
import { usePrototype } from '../../prototype/state';
import { Sheet, useSheetClose } from '../../shell/sheet';
import { layout, spacing, useColors } from '../../theme';
import { useEdgeFade } from '../../ui/edge-fade';
import { Appear } from '../../ui/motion';
import {
  Button,
  Chip,
  Group,
  Icon,
  IconButton,
  PageHeader,
  Row,
  SearchField,
  Segmented,
  Text,
  Touchable,
} from '../../ui/primitives';

type ViewMode = 'cards' | 'list';

/**
 * Página de Produtos: busca, categorias e alternância entre cartões e lista. As
 * categorias filtram a lista (apenas no protótipo); tocar num produto abre a ficha.
 */
export default function ProductsScreen() {
  const [category, setCategory] = useState<string>('Todos');
  const { setOverlay } = usePrototype();
  const products =
    category === 'Todos' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
  const open = (product: MockProduct) => setOverlay(<ProductDetails product={product} />);
  const [mode, setMode] = useState<ViewMode>('cards');

  const fade = useEdgeFade();
  return (
    <View style={styles.page}>
      <PageHeader
        title="Produtos"
        subtitle={`${products.length} ${products.length === 1 ? 'produto' : 'produtos'}${category === 'Todos' ? ' no catálogo' : ` em ${category}`}`}
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

      <View style={{ flex: 1 }}>
        {mode === 'cards' ? (
          <FlatList
            {...fade.scrollProps}
            key={`cards-${category}`}
            data={products}
            numColumns={4}
            keyExtractor={(p) => p.id}
            columnWrapperStyle={{ gap: spacing[5] }}
            contentContainerStyle={{ gap: spacing[5], paddingBottom: spacing[10] }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Appear delay={index * 30} distance={12} style={{ flex: 1, maxWidth: '25%' }}>
                <ProductCard product={item} onPress={() => open(item)} />
              </Appear>
            )}
          />
        ) : (
          <ScrollView
            {...fade.scrollProps}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing[10] }}
          >
            <Group key={category} inset={136}>
              {products.map((p, i) => (
                <Appear key={p.id} delay={i * 25} distance={10}>
                  <Row
                    leading={<ProductImage product={p} size={88} />}
                    title={p.name}
                    subtitle={`${p.category} · ${p.sku} · ${p.stock} em estoque`}
                    value={p.price}
                    chevron
                    onPress={() => open(p)}
                  />
                </Appear>
              ))}
            </Group>
          </ScrollView>
        )}
        {fade.edges}
      </View>
    </View>
  );
}

function ProductImage({
  product,
  size,
  height,
}: {
  product: MockProduct;
  size: number | 'fill';
  height?: number;
}) {
  const c = useColors();
  const fill = size === 'fill';
  return (
    <View
      style={{
        width: fill ? '100%' : size,
        height: height ?? (fill ? 210 : size),
        borderRadius: fill ? 20 : 16,
        backgroundColor: c.fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        name={product.icon.replace('-outline', '') as typeof product.icon}
        size={height ? 160 : fill ? 84 : 40}
        color={c.textSecondary}
      />
    </View>
  );
}

function ProductCard({ product, onPress }: { product: MockProduct; onPress: () => void }) {
  const c = useColors();
  const low = product.stock < 30;
  return (
    <Touchable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: c.grouped }]}
    >
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

/* ---------------- Ficha do produto ---------------- */

const DESCRIPTIONS: Record<string, string> = {
  Masculino: 'Modelagem regular, tecido de toque macio e acabamento reforçado nas costuras.',
  Feminino: 'Caimento leve e fluido, pensado para uso diário com conforto.',
  Infantil: 'Tecido antialérgico e costuras planas para não irritar a pele.',
  Acessórios: 'Acabamento premium e embalagem individual para revenda.',
};

function sizesFor(product: MockProduct): { size: string; stock: number }[] {
  if (product.category === 'Acessórios') return [{ size: 'Único', stock: product.stock }];
  if (product.icon === 'footsteps-outline')
    return ['38', '39', '40', '41', '42'].map((size, i) => ({
      size,
      stock: Math.max(0, Math.round(product.stock / 5) - i * 3),
    }));
  if (product.category === 'Infantil')
    return ['2', '4', '6', '8'].map((size, i) => ({
      size,
      stock: Math.max(0, Math.round(product.stock / 4) - i * 2),
    }));
  return ['P', 'M', 'G', 'GG'].map((size, i) => ({
    size,
    stock: Math.max(0, Math.round(product.stock / 4) + (i === 1 ? 6 : -i * 4)),
  }));
}

/** Ficha do produto — mesmo padrão da ficha de cliente, com desfoque animado. */
function ProductDetails({ product }: { product: MockProduct }) {
  const { setOverlay } = usePrototype();
  return (
    <Sheet onClose={() => setOverlay(null)} style={{ width: 1180, height: 760 }}>
      <ProductDetailsContent product={product} />
    </Sheet>
  );
}

function ProductDetailsContent({ product }: { product: MockProduct }) {
  const c = useColors();
  const close = useSheetClose();
  const low = product.stock < 30;
  return (
    <View style={styles.sheet}>
      <View style={{ width: 460, gap: spacing[4] }}>
        <ProductImage product={product} size="fill" height={460} />
        <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
          Imagem ilustrativa
        </Text>
      </View>

      <View style={{ flex: 1, gap: spacing[6] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text variant="subhead" tone="secondary">
              {product.category} · {product.sku}
            </Text>
            <Text variant="title">{product.name}</Text>
          </View>
          <IconButton
            icon="close"
            variant="gray"
            size={64}
            iconSize={30}
            accessibilityLabel="Fechar"
            onPress={() => close()}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[5] }}>
          <Text variant="largeTitle">{product.price}</Text>
          <Text variant="callout" tone={low ? 'danger' : 'success'}>
            {low ? `Últimas ${product.stock} unidades` : `${product.stock} em estoque`}
          </Text>
        </View>

        <View style={{ gap: spacing[3] }}>
          <Text variant="subhead" tone="secondary">
            Estoque por tamanho
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            {sizesFor(product).map((s) => (
              <View key={s.size} style={[styles.size, { backgroundColor: c.grouped }]}>
                <Text variant="headline">{s.size}</Text>
                <Text variant="caption" tone={s.stock === 0 ? 'danger' : 'secondary'}>
                  {s.stock === 0 ? 'Esgotado' : `${s.stock} un.`}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text variant="subhead" tone="secondary">
            Descrição
          </Text>
          <Text variant="callout">{DESCRIPTIONS[product.category] ?? DESCRIPTIONS.Masculino}</Text>
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <Button label="Enviar ao cliente" icon="logo-whatsapp" style={{ flex: 1 }} />
          <Button label="Compartilhar" icon="share-outline" variant="gray" style={{ width: 240 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, flexDirection: 'row', gap: spacing[10], padding: spacing[10] },
  size: {
    minWidth: 120,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: layout.radius.md,
    alignItems: 'center',
  },
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
