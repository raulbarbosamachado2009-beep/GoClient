import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { nativeDriver, useColors } from '../theme';

/**
 * Janela sobreposta (estilo "form sheet" do iOS): fundo escurece e a janela sobe com mola.
 * Tocar fora fecha.
 */
export function Sheet({
  children,
  onClose,
  style,
}: {
  children: ReactNode;
  onClose?: () => void;
  style?: ViewStyle;
}) {
  const c = useColors();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: nativeDriver }).start();
    Animated.spring(rise, {
      toValue: 1,
      damping: 24,
      stiffness: 240,
      useNativeDriver: nativeDriver,
    }).start();
  }, [fade, rise]);

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Pressable
          accessibilityLabel="Fechar janela"
          style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: c.mode === 'dark' ? '#1C1C1E' : '#F2F2F7' },
          style,
          {
            opacity: fade,
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: {
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
});
