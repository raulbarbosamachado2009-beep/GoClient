import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Image, StyleSheet, View } from 'react-native';
import { useColors } from '../theme';
import { capturePage } from './page-capture';

/**
 * Fundo da multimídia atrás das páginas com moldura (pedido do usuário em 28/11/2026): uma foto
 * pequena da própria página, ampliada até cobrir a tela toda e bem desfocada, como um
 * "ambiente" da página. A foto é refeita ao trocar de página e a cada poucos segundos.
 * Sem foto (ou se a captura falhar), fica a cor de fundo da página.
 */
type Node = ComponentRef<typeof View>;

const W = 192;
const H = 112;
const EVERY = 3000;

export function PageBackdrop({ target, page }: { target: () => Node | null; page: string }) {
  const c = useColors();
  const [shots, setShots] = useState<{ a: string | null; b: string | null }>({ a: null, b: null });
  const fade = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);
  const latest = useRef(target);
  latest.current = target;

  // biome-ignore lint/correctness/useExhaustiveDependencies: page e tema disparam nova foto
  useEffect(() => {
    let alive = true;
    const take = async () => {
      const node = latest.current();
      if (!node || busy.current || AppState.currentState !== 'active') return;
      busy.current = true;
      try {
        const uri = await capturePage(node, W, H);
        if (alive && uri) {
          // A nova entra por cima da anterior, devagar (sem piscar).
          setShots((s) => ({ a: s.b ?? s.a, b: uri }));
          fade.setValue(0);
          Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        }
      } catch {
        // Captura indisponível: segue com a cor de fundo.
      } finally {
        busy.current = false;
      }
    };
    // Espera a troca de página terminar antes da primeira foto.
    const first = setTimeout(take, 450);
    const timer = setInterval(take, EVERY);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
    };
    // Recomeça a cada troca de página e de tema.
  }, [page, c.mode, fade]);

  const veil = c.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)';
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]} pointerEvents="none">
      {shots.a && <Image source={{ uri: shots.a }} blurRadius={24} style={styles.shot} />}
      {shots.b && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Image source={{ uri: shots.b }} blurRadius={24} style={styles.shot} />
        </Animated.View>
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: veil }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Um pouco maior que a tela: as bordas do desfoque ficam de fora.
  shot: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '120%',
    height: '120%',
    resizeMode: 'cover',
  } as object,
});
