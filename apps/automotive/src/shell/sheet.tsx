import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, nativeDriver } from '../theme';

/**
 * Janela sobreposta com fundo escurecido e entrada suave. Tocar fora fecha.
 * Renderizada pela camada de sobreposição do layout principal (cobre o menu lateral).
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
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 240,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: nativeDriver,
    }).start();
  }, [v]);

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: v }]}>
        <Pressable
          accessibilityLabel="Fechar janela"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          style,
          {
            opacity: v,
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) },
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
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
    backgroundColor: colors.panel,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
});
