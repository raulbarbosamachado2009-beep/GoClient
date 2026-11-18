import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { nativeDriver, useColors } from '../theme';
import { useTween } from '../ui/motion';
import { HavenaOrb, type OrbState } from './orb';

const DURATION = 420;
const ORB = 300;

/** Sequência de estados ao tocar no círculo (só para ver as animações no protótipo). */
const NEXT: Record<OrbState, OrbState> = {
  idle: 'listen',
  listen: 'think',
  think: 'speak',
  speak: 'listen',
};

/**
 * Havena: só o círculo, no canto direito da tela. Atrás dele, um desfoque que nasce na
 * borda direita e esvanece para a esquerda. Tocar fora fecha; tocar no círculo alterna os
 * estados (ouvindo → pensando → falando). Protótipo: não há comando de voz.
 */
export function HavenaPanel({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const progress = useTween(open ? 1 : 0, DURATION);
  const enter = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const [state, setState] = useState<OrbState>('listen');

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      damping: 18,
      stiffness: 170,
      useNativeDriver: nativeDriver,
    }).start();
  }, [enter]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setOpen(false);
    Animated.timing(enter, {
      toValue: 0,
      duration: DURATION - 60,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start(onClose);
  }, [enter, onClose]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Fechar Havena"
        onPress={close}
        style={StyleSheet.absoluteFill}
      />
      <FadingBlur progress={progress} />

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.orbWrap,
          {
            opacity: enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [180, 0] }) },
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
            ],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Havena"
          accessibilityHint="Alterna os estados da animação"
          onPress={() => setState((s) => NEXT[s])}
        >
          <HavenaOrb size={ORB} state={state} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Desfoque que "sufoca" o fundo a partir da borda direita e some em direção à esquerda.
 * Web: um único `backdrop-filter` recortado por uma máscara em degradê.
 * Android/iOS: faixas de desfoque sobrepostas, cada vez mais estreitas, que somam mais
 * desfoque perto da borda direita (o BlurView não aceita máscara em degradê).
 */
function FadingBlur({ progress }: { progress: number }) {
  const c = useColors();
  const dark = c.mode === 'dark';
  const shade = dark ? `rgba(0,0,0,${0.62 * progress})` : `rgba(225,228,236,${0.6 * progress})`;
  const mask = 'linear-gradient(to left, #000 0%, #000 30%, transparent 100%)';

  return (
    <View pointerEvents="none" style={styles.fadeRegion}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backdropFilter: `blur(${(40 * progress).toFixed(1)}px) saturate(${100 + 30 * progress}%)`,
              WebkitBackdropFilter: `blur(${(40 * progress).toFixed(1)}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            } as object,
          ]}
        />
      ) : (
        [1, 0.78, 0.58, 0.4].map((w) => (
          <BlurView
            key={w}
            tint={dark ? 'dark' : 'light'}
            intensity={24 * progress}
            experimentalBlurMethod="dimezisBlurView"
            style={[styles.band, { width: `${w * 100}%` }]}
          />
        ))
      )}
      <LinearGradient
        colors={['transparent', shade]}
        locations={[0, 0.7]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fadeRegion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '72%',
  },
  band: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  orbWrap: {
    position: 'absolute',
    right: 110,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
