import { useRouter } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { CLIENTS, type MockClient } from '../mocks/data';
import { concentric, layout, spacing, type, useColors } from '../theme';
import { appleEase, Swap } from '../ui/motion';
import { Blur, Icon, type IconName, Text, Touchable } from '../ui/primitives';
import { OptionGroup, OptionRow, SavedRoutes, useTint } from './saved-routes';
import { useStops } from './stops';

/** Fechada: pílula de busca. Aberta: cartão grande com as opções da aba do celular. */
const CLOSED = { w: 520, h: 84, r: 42 };
const OPEN = { w: 620, r: 52 };
const PAD = 24;
/** Raio de dentro (borda concêntrica): 52 − 24 = 28. */
const INNER = concentric(OPEN.r, PAD);
const DURATION = 520;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Busca do Mapa na multimídia, no estilo da Apple. Tocar na pílula faz a forma dela crescer
 * suavemente até virar um cartão grande (largura, altura e cantos animados juntos) com as
 * mesmas opções da aba puxável do celular: atalhos, recentes e as rotas montadas. Os
 * elementos entram e saem com fade, e um desfoque de movimento passa pelo cartão enquanto
 * ele muda de forma (abrindo e fechando).
 */
export function CarSearch({ maxHeight }: { maxHeight: number }) {
  const c = useColors();
  const t = useTint();
  const router = useRouter();
  const stops = useStops();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const p = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  // Conteúdo do cartão: início (atalhos e recentes) ou a lista de rotas montadas.
  const [view, setView] = useState<'home' | 'routes'>('home');
  const [query, setQuery] = useState('');

  const animate = (to: 0 | 1, done?: () => void) =>
    Animated.timing(p, {
      toValue: to,
      duration: DURATION,
      easing: appleEase,
      // Largura, altura e cantos não andam no driver nativo.
      useNativeDriver: false,
    }).start(done);

  const show = () => {
    if (open) return;
    setOpen(true);
    animate(1, () => input.current?.focus());
  };
  const hide = () => {
    Keyboard.dismiss();
    input.current?.blur();
    animate(0, () => {
      setOpen(false);
      setView('home');
      setQuery('');
    });
  };
  useEffect(() => () => p.stopAnimation(), [p]);

  const go = (id: string) => {
    hide();
    router.replace({ pathname: '/mapa', params: { rota: 'cliente', id } });
  };

  const q = norm(query.trim());
  const results: MockClient[] = q
    ? CLIENTS.filter((x) => norm(`${x.tradeName} ${x.name} ${x.address} ${x.district}`).includes(q))
    : [];
  const recent = CLIENTS.slice(0, 3);

  const openH = maxHeight;
  const width = p.interpolate({ inputRange: [0, 1], outputRange: [CLOSED.w, OPEN.w] });
  const height = p.interpolate({ inputRange: [0, 1], outputRange: [CLOSED.h, openH] });
  const radius = p.interpolate({ inputRange: [0, 1], outputRange: [CLOSED.r, OPEN.r] });
  // Os elementos de dentro: só aparecem no fim da abertura e somem logo no começo do fechar.
  const bodyOpacity = p.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0, 1] });
  const bodyShift = p.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const cancelOpacity = p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });
  // Desfoque de movimento: máximo no meio da mudança de forma, nenhum nas pontas.
  const blurOpacity = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const webBlur =
    Platform.OS === 'web'
      ? {
          filter: p.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['blur(0px)', 'blur(6px)', 'blur(0px)'],
          }),
        }
      : null;

  return (
    <Animated.View
      style={[
        styles.shell,
        { width, height, borderRadius: radius, borderColor: c.material.border },
      ]}
    >
      <Blur radius={44} tint={c.material.tint} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.material.fallback }]} />

      <Animated.View style={[{ flex: 1 }, webBlur as object]}>
        {/* Campo de busca: o mesmo na pílula e no topo do cartão. */}
        <Touchable
          accessibilityRole="search"
          accessibilityLabel="Buscar cliente ou endereço"
          onPress={show}
          disabled={open}
          scaleTo={open ? 1 : 0.98}
          style={styles.field}
        >
          <Icon name="search" size={34} color={c.textSecondary} />
          {open ? (
            <TextInput
              ref={input}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar cliente ou endereço"
              placeholderTextColor={c.textSecondary}
              autoCorrect={false}
              style={[
                type.body,
                styles.input,
                { color: c.text },
                (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object,
              ]}
            />
          ) : (
            <Text variant="body" tone="secondary" style={styles.placeholder} numberOfLines={1}>
              Buscar cliente ou endereço
            </Text>
          )}
          {open && (
            <Animated.View style={{ opacity: cancelOpacity }}>
              <Touchable accessibilityRole="button" onPress={hide} style={styles.cancel}>
                <Text variant="headline" tone="accent" style={{ fontSize: 28, lineHeight: 34 }}>
                  Cancelar
                </Text>
              </Touchable>
            </Animated.View>
          )}
        </Touchable>

        {open && (
          <Animated.View
            style={[styles.body, { opacity: bodyOpacity, transform: [{ translateY: bodyShift }] }]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: spacing[5], paddingBottom: PAD }}
            >
              {/* Trocar de conteúdo (início, rotas, resultados) tem a transição da aba do celular. */}
              <Swap
                id={q ? 'results' : view}
                dir={!q && view === 'home' ? -1 : 1}
                style={{ gap: spacing[5] }}
              >
                {q ? (
                  results.length === 0 ? (
                    <Text variant="body" tone="secondary">
                      Nenhum cliente encontrado para "{query.trim()}".
                    </Text>
                  ) : (
                    <OptionGroup outerRadius={OPEN.r} outerPadding={PAD}>
                      {results.map((x, i) => (
                        <OptionRow
                          key={x.id}
                          first={i === 0}
                          big
                          icon="storefront"
                          title={x.tradeName}
                          sub={x.address}
                          onPress={() => go(x.id)}
                        />
                      ))}
                    </OptionGroup>
                  )
                ) : view === 'routes' ? (
                  <>
                    <Touchable
                      accessibilityRole="button"
                      onPress={() => setView('home')}
                      style={styles.back}
                    >
                      <Icon name="chevron-back" size={32} color={c.accent} />
                      <Text variant="headline" tone="accent" style={{ fontSize: 28 }}>
                        Voltar
                      </Text>
                    </Touchable>
                    <SavedRoutes outerRadius={OPEN.r} outerPadding={PAD} />
                  </>
                ) : (
                  <>
                    <Text variant="title2" style={styles.section}>
                      Atalhos
                    </Text>
                    <View style={styles.shortcuts}>
                      <Shortcut
                        icon="people"
                        label="Clientes"
                        tint={t}
                        onPress={() => {
                          hide();
                          router.replace({ pathname: '/kyte', params: { secao: 'clientes' } });
                        }}
                      />
                      <Shortcut
                        icon="pricetag"
                        label="Produtos"
                        tint={t}
                        onPress={() => {
                          hide();
                          router.replace({ pathname: '/kyte', params: { secao: 'produtos' } });
                        }}
                      />
                      <Shortcut
                        icon="trail-sign"
                        label="Rotas"
                        tint={t}
                        onPress={() => setView('routes')}
                      />
                    </View>

                    <Text variant="title2" style={styles.section}>
                      Recentes
                    </Text>
                    <OptionGroup outerRadius={OPEN.r} outerPadding={PAD}>
                      {recent.map((x, i) => (
                        <OptionRow
                          key={x.id}
                          first={i === 0}
                          big
                          icon="location"
                          title={x.tradeName}
                          sub={x.address}
                          onPress={() => go(x.id)}
                        />
                      ))}
                    </OptionGroup>

                    {stops.saved.length > 0 && (
                      <OptionGroup outerRadius={OPEN.r} outerPadding={PAD}>
                        <OptionRow
                          first
                          big
                          strong
                          icon="play"
                          title={`Começar: ${stops.saved[0]?.name ?? ''}`}
                          sub="Última rota montada no celular"
                          onPress={() => {
                            const id = stops.saved[0]?.id;
                            hide();
                            if (id) stops.startSaved(id);
                          }}
                        />
                      </OptionGroup>
                    )}
                  </>
                )}
              </Swap>
            </ScrollView>
          </Animated.View>
        )}
      </Animated.View>

      {/* Desfoque de movimento por cima de tudo durante a mudança de forma. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}
      >
        <Blur radius={18} tint={c.material.tint} />
      </Animated.View>
    </Animated.View>
  );
}

function Shortcut({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: IconName;
  label: string;
  tint: ReturnType<typeof useTint>;
  onPress: () => void;
}) {
  return (
    <Touchable accessibilityRole="button" onPress={onPress} scaleTo={0.94} style={styles.shortcut}>
      <View style={[styles.circle, { backgroundColor: tint.soft }]}>
        <Icon name={icon} size={48} color={tint.ink} />
      </View>
      <Text variant="headline" numberOfLines={1} style={{ fontSize: 26, lineHeight: 32 }}>
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    top: layout.gutter,
    left: layout.gutter,
    overflow: 'hidden',
    borderWidth: 1,
  },
  field: {
    height: CLOSED.h,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingLeft: spacing[6],
    paddingRight: spacing[3],
  },
  placeholder: { flex: 1, fontSize: 28, lineHeight: 34 },
  input: { flex: 1, minWidth: 0, height: '100%', fontSize: 28 },
  cancel: { height: 72, justifyContent: 'center', paddingHorizontal: spacing[3] },
  body: { flex: 1, paddingHorizontal: PAD, paddingTop: spacing[2] },
  section: { fontSize: 30, lineHeight: 36, marginTop: spacing[2] },
  shortcuts: { flexDirection: 'row', gap: spacing[4] },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: INNER,
  },
  circle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', height: 64 },
});
