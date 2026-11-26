import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFrameScale } from '../preview/automotive-frame';

/**
 * Desfaz a redução da moldura (o app é desenhado num tamanho de referência e reduzido para
 * caber no aparelho). Para janelas web (mapa, Kyte): sem isso, a página é
 * desenhada pequena e as letras saem miúdas, principalmente com o celular deitado.
 */
export function Unscaled({ children }: { children: ReactNode }) {
  const scale = useFrameScale();
  const inset = `${((1 - scale) / 2) * 100}%` as const;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={{
          position: 'absolute',
          top: inset,
          bottom: inset,
          left: inset,
          right: inset,
          transform: [{ scale: 1 / scale }],
        }}
      >
        {children}
      </View>
    </View>
  );
}
