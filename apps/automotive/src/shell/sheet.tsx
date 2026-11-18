import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { nativeDriver, useColors } from '../theme';
import { useTween } from '../ui/motion';
import { BlurBackdrop } from '../ui/primitives';

const DURATION = 340;

/** Fecha a janela atual com a animação de saída; `after` roda quando ela termina. */
const SheetCloseContext = createContext<(after?: () => void) => void>(() => {});
export const useSheetClose = () => useContext(SheetCloseContext);

/**
 * Janela sobreposta (estilo "form sheet" do iOS). Ao abrir, o desfoque do fundo cresce
 * gradualmente enquanto a janela sobe com mola; ao fechar, o caminho é o inverso.
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
  const [open, setOpen] = useState(true);
  const blur = useTween(open ? 1 : 0, DURATION);
  const rise = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.spring(rise, {
      toValue: 1,
      damping: 24,
      stiffness: 240,
      useNativeDriver: nativeDriver,
    }).start();
  }, [rise]);

  const close = useCallback(
    (after?: () => void) => {
      if (closing.current) return;
      closing.current = true;
      setOpen(false);
      Animated.timing(rise, {
        toValue: 0,
        duration: DURATION - 60,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: nativeDriver,
      }).start(() => {
        onClose?.();
        after?.();
      });
    },
    [rise, onClose],
  );

  return (
    <SheetCloseContext.Provider value={close}>
      <View style={styles.root}>
        <BlurBackdrop progress={blur} onPress={() => close()} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: c.mode === 'dark' ? '#1C1C1E' : '#F2F2F7' },
            style,
            {
              opacity: rise,
              transform: [
                { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
                { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </SheetCloseContext.Provider>
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
