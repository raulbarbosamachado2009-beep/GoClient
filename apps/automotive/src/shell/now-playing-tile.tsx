import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';

/** Altura de repouso de cada barra (fração da altura máxima): o "desenho" do equalizador. */
const SHAPE = [0.42, 0.82, 1, 0.68, 0.9, 0.5, 0.3];
const BAR_W = 6;
const BAR_GAP = 5;
const MAX_H = 40;

/**
 * Bloco do Spotify na barra lateral enquanto uma música toca e o usuário está em outra
 * tela: a capa desfocada preenche o quadrado arredondado e, na frente, barras de
 * equalizador se mexem. Protótipo: não há áudio; o movimento é gerado (ruído suave) e
 * para quando a música está pausada.
 */
export function NowPlayingTile({
  cover,
  playing,
  width,
  height,
  radius,
}: {
  cover: ImageSourcePropType;
  playing: boolean;
  width: number;
  height: number;
  radius: number;
}) {
  const bars = useRef(SHAPE.map((s) => new Animated.Value(s * 0.35))).current;
  const live = useRef(playing);
  live.current = playing;

  useEffect(() => {
    // Cada barra persegue um alvo novo a intervalos curtos; a suavização deixa o
    // movimento orgânico, como um equalizador de verdade.
    const value = SHAPE.map((s) => s * 0.35);
    const goal = [...value];
    const next = SHAPE.map(() => 0);
    let last = Date.now();
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      SHAPE.forEach((s, i) => {
        if (live.current) {
          if (now >= (next[i] ?? 0)) {
            goal[i] = s * (0.35 + Math.random() * 0.65);
            next[i] = now + 90 + Math.random() * 160;
          }
        } else {
          goal[i] = 0.14;
        }
        const k = 1 - Math.exp(-dt * (live.current ? 14 : 6));
        value[i] = (value[i] ?? 0) + ((goal[i] ?? 0) - (value[i] ?? 0)) * k;
        bars[i]?.setValue(value[i] ?? 0);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [bars]);

  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }}>
      <Image
        source={cover}
        blurRadius={14}
        resizeMode="cover"
        style={[styles.fill, { transform: [{ scale: 1.3 }] }]}
      />
      <View style={[styles.fill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
      <View style={styles.center}>
        <View style={styles.bars}>
          {bars.map((v, i) => (
            <Animated.View
              // biome-ignore lint/suspicious/noArrayIndexKey: barras fixas, a posição é a identidade.
              key={i}
              style={[
                styles.bar,
                // Anima a altura (e não a escala) para as pontas continuarem redondas.
                { height: v.interpolate({ inputRange: [0, 1], outputRange: [BAR_W, MAX_H] }) },
              ]}
            >
              <LinearGradient colors={['#A78BFA', '#6366F1']} style={StyleSheet.absoluteFill} />
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: { flexDirection: 'row', alignItems: 'center', gap: BAR_GAP, height: MAX_H },
  bar: { width: BAR_W, borderRadius: BAR_W / 2, overflow: 'hidden' },
});
