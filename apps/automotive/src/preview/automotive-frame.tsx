import { automotive } from '@goclient/design-tokens';
import { createContext, type ReactNode, useContext } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormFactorProvider, PHONE_WIDTH } from '../layout/form-factor';

const { width: BASE_W, height: BASE_H } = automotive.viewport;

/** Escala aplicada à moldura (1 = tamanho de referência). Gestos usam para compensar. */
const FrameScaleContext = createContext(1);
export const useFrameScale = () => useContext(FrameScaleContext);

/**
 * Em pé (celular), a referência é 720 de largura (ver layout/form-factor.tsx).
 *
 * O app é desenhado para uma tela de referência de 1600×900. Em qualquer aparelho (celular,
 * multimídia com outra densidade, navegador) ele é montado nesse tamanho e reduzido por igual
 * para caber na área útil. Se a tela for mais larga (celular) ou mais alta (tablet) que 16:9,
 * a área de desenho cresce nessa direção em vez de deixar barras pretas.
 */
export function AutomotiveFrame({
  children,
  background,
}: {
  children: ReactNode;
  background: string;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';

  // Área útil: sem entalhe nem barras do sistema (no navegador, a janela inteira).
  const left = web ? 0 : insets.left;
  const right = web ? 0 : insets.right;
  const top = web ? 0 : insets.top;
  const bottom = web ? 0 : insets.bottom;
  const availW = Math.max(1, window.width - left - right);
  const availH = Math.max(1, window.height - top - bottom);

  // Em pé (mais alta que larga) vira a versão de celular: 720 de largura de referência.
  const phone = availH > availW;
  // Nunca maior que o tamanho de referência; menor quando a tela é menor.
  const scale = phone
    ? Math.min(availW / PHONE_WIDTH, 1)
    : Math.min(availW / BASE_W, availH / BASE_H, 1);
  const width = availW / scale;
  const height = availH / scale;

  return (
    <View style={{ flex: 1, backgroundColor: web ? '#0B0B0C' : background, overflow: 'hidden' }}>
      <View
        testID="automotive-frame"
        style={{
          position: 'absolute',
          width,
          height,
          // A escala do React Native é feita em torno do centro: posiciona para que o centro
          // da área de desenho caia no centro da área útil.
          left: left + (availW - width) / 2,
          top: top + (availH - height) / 2,
          backgroundColor: background,
          transform: [{ scale }],
          overflow: 'hidden',
        }}
      >
        <FormFactorProvider value={phone ? 'phone' : 'car'}>
          <FrameScaleContext.Provider value={scale}>{children}</FrameScaleContext.Provider>
        </FormFactorProvider>
      </View>
    </View>
  );
}
