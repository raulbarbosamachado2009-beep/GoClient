import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { type AppGlyph, OutlineGlyph } from '../../shell/app-icons';
import { spacing } from '../../theme';
import { Appear } from '../../ui/motion';
import { Group, PageHeader, Row } from '../../ui/primitives';

const ITEMS: { label: string; subtitle: string; href: Href; glyph: AppGlyph; color: string }[] = [
  {
    label: 'Produtos',
    subtitle: 'Catálogo, preços e estoque',
    href: '/produtos',
    glyph: 'produtos',
    color: '#FF9F0A',
  },
  {
    label: 'Rotas',
    subtitle: 'Visitas do dia e regiões',
    href: '/rotas',
    glyph: 'rotas',
    color: '#30D158',
  },
  {
    label: 'Kyte',
    subtitle: 'Vendas e estoque no Kyte Web',
    href: '/kyte',
    glyph: 'kyte',
    color: '#AC8E68',
  },
  {
    label: 'Ajustes',
    subtitle: 'Conta, tema e integrações',
    href: '/configuracoes',
    glyph: 'ajustes',
    color: '#8E8E93',
  },
];

/** Aba "Mais" do celular: o que não cabe na barra de abas. */
export default function MoreScreen() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <PageHeader title="Mais" subtitle="Catálogo, rotas, Kyte e ajustes" />
      <Appear distance={10}>
        <Group inset={128}>
          {ITEMS.map((i) => (
            <Row
              key={i.label}
              leading={
                <View style={[styles.icon, { backgroundColor: i.color }]}>
                  <OutlineGlyph glyph={i.glyph} size={40} color="#FFFFFF" />
                </View>
              }
              title={i.label}
              subtitle={i.subtitle}
              chevron
              onPress={() => router.replace(i.href)}
            />
          ))}
        </Group>
      </Appear>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 32, paddingTop: 36, paddingBottom: spacing[10], gap: spacing[6] },
  icon: { width: 68, height: 68, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
