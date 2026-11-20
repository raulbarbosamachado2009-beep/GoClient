import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { KYTE_SECTIONS, type KyteMessage, sectionByKey, sectionByPath } from '../../kyte/bridge';
import { KyteConnect } from '../../kyte/connect';
import { KyteWindow, type KyteWindowHandle } from '../../kyte/window';
import { usePhone } from '../../layout/form-factor';
import { usePrototype } from '../../prototype/state';
import { layout, spacing, useColors } from '../../theme';
import { Appear } from '../../ui/motion';
import { Chip, IconButton, SearchField, Text } from '../../ui/primitives';

/**
 * Kyte: o sistema real do Kyte Web com a interface do GoClient.
 * - Antes do login: a página de login do próprio Kyte, em tela cheia.
 * - Depois do login: título e subtítulo da seção, barra de busca e os botões de seção
 *   (Clientes, Produtos, Rotas, Pedidos...) do GoClient; embaixo, a tela correspondente do
 *   Kyte, com o menu dele escondido e o visual do app (ver kyte/bridge.ts).
 * `?secao=clientes` abre direto numa seção (usado pelos atalhos do Mapa).
 */
export default function KyteScreen() {
  const c = useColors();
  const router = useRouter();
  const phone = usePhone();
  const { secao } = useLocalSearchParams<{ secao?: string }>();
  const { kyteOpen, setKyteOpen } = usePrototype();
  const win = useRef<KyteWindowHandle>(null);
  const [logged, setLogged] = useState<boolean | null>(null);
  const [path, setPath] = useState('/');
  const [query, setQuery] = useState('');
  const [searchMiss, setSearchMiss] = useState(false);
  const wanted = useRef<string | undefined>(secao);

  // Atalho vindo de fora (ex.: Mapa → Clientes) abre a janela do Kyte direto.
  useEffect(() => {
    if (secao) {
      wanted.current = secao;
      setKyteOpen(true);
    }
  }, [secao, setKyteOpen]);

  // Logado: vai para a seção pedida pelo atalho.
  useEffect(() => {
    const s = sectionByKey(wanted.current);
    if (logged && s?.path) {
      wanted.current = undefined;
      win.current?.go(s.path);
      setPath(s.path);
    }
  }, [logged]);

  // Busca: repassa o texto (com uma pequena espera enquanto a pessoa digita).
  useEffect(() => {
    if (!logged) return;
    const t = setTimeout(() => win.current?.search(query), 350);
    return () => clearTimeout(t);
  }, [query, logged]);

  if (!kyteOpen) return <KyteConnect onOpen={() => setKyteOpen(true)} />;

  const section = sectionByPath(path) ?? KYTE_SECTIONS[0];
  const onMessage = (m: KyteMessage) => {
    if (m.type === 'route') {
      setLogged(m.logged);
      if (m.logged) setPath(m.path);
    } else if (m.type === 'search') {
      setSearchMiss(!m.ok);
    }
  };
  const open = (key: string) => {
    const s = sectionByKey(key);
    if (!s) return;
    if (s.app) {
      router.replace(s.app);
      return;
    }
    if (s.path) {
      setQuery('');
      setSearchMiss(false);
      setPath(s.path);
      win.current?.go(s.path);
    }
  };
  const pad = phone ? 32 : 48;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {logged ? (
        <Appear
          distance={10}
          style={{ paddingHorizontal: pad, paddingTop: phone ? 28 : 32, gap: spacing[5] }}
        >
          <View style={styles.head}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="largeTitle" numberOfLines={1}>
                {section?.label === 'Início' ? 'Kyte' : section?.label}
              </Text>
              <Text variant="callout" tone="secondary" numberOfLines={1}>
                {section?.subtitle}
              </Text>
            </View>
            <IconButton
              icon="refresh"
              iconSize={34}
              accessibilityLabel="Recarregar o Kyte"
              onPress={() => win.current?.reload()}
            />
            <IconButton
              icon="close"
              iconSize={38}
              accessibilityLabel="Fechar o Kyte"
              onPress={() => setKyteOpen(false)}
            />
          </View>
          <SearchField
            placeholder={
              section?.searchable
                ? (section.placeholder ?? 'Buscar')
                : 'Escolha Clientes, Produtos, Pedidos ou Vendas para buscar'
            }
            value={query}
            onChangeText={setQuery}
          />
          {searchMiss && query !== '' && (
            <Text variant="caption" tone="secondary">
              Esta tela do Kyte não tem campo de busca.
            </Text>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginHorizontal: -pad }}
            contentContainerStyle={{ gap: spacing[3], paddingHorizontal: pad }}
          >
            {KYTE_SECTIONS.filter((s) => s.key !== 'inicio').map((s) => (
              <Chip
                key={s.key}
                label={s.label}
                icon={s.icon}
                selected={section?.key === s.key}
                onPress={() => open(s.key)}
              />
            ))}
          </ScrollView>
        </Appear>
      ) : (
        <View style={[styles.loginBar, { borderBottomColor: c.separator }]}>
          <Text variant="headline" style={{ flex: 1 }}>
            {logged === null ? 'Kyte' : 'Entrar no Kyte'}
          </Text>
          <IconButton
            icon="refresh"
            iconSize={34}
            accessibilityLabel="Recarregar o Kyte"
            onPress={() => win.current?.reload()}
          />
          <IconButton
            icon="close"
            iconSize={38}
            accessibilityLabel="Fechar o Kyte"
            onPress={() => setKyteOpen(false)}
          />
        </View>
      )}

      {/* O sistema do Kyte (logado: num cartão arredondado, abaixo dos botões do app). */}
      <View
        style={[
          { flex: 1 },
          logged && {
            margin: pad,
            marginTop: spacing[5],
            borderRadius: layout.radius.lg,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.separator,
          },
        ]}
      >
        <KyteWindow ref={win} dark={c.mode === 'dark'} phone={phone} onMessage={onMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  loginBar: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingLeft: spacing[6],
    paddingRight: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
