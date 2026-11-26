import { automotive } from '@goclient/design-tokens';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormFactorProvider, PHONE_WIDTH, SystemInsetsProvider } from '../layout/form-factor';

const { width: BASE_W, height: BASE_H } = automotive.viewport;

/** Escala aplicada à moldura (1 = tamanho de referência). Gestos usam para compensar. */
const FrameScaleContext = createContext(1);
/**
 * Altura mínima (dp) da área de baixo que indica a barra de 3 botões do Android (~48 dp);
 * a de gestos fica entre 16 e 24 dp.
 */
const NAV_BUTTONS_MIN = 36;

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

  // Tela inteira, de ponta a ponta (o Android desenha o app por baixo das barras do sistema).
  // Só fica de fora o que o app não pode cobrir:
  //  - barra de navegação de 3 botões (voltar/início/abas): o app termina acima dela;
  //  - laterais com entalhe ou botões (celular deitado), onde ficaria a barra lateral.
  // Com navegação por gestos o app vai até a borda de baixo; só os controles se afastam
  // da área do gesto (ver SystemInsets).
  const navButtons = !web && insets.bottom >= NAV_BUTTONS_MIN;
  const left = web ? 0 : insets.left;
  const right = web ? 0 : insets.right;
  const top = 0;
  const bottom = navButtons ? insets.bottom : 0;
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
  const system = useMemo(
    () => ({
      top: web ? 0 : insets.top / scale,
      bottom: web || navButtons ? 0 : insets.bottom / scale,
    }),
    [web, navButtons, insets.top, insets.bottom, scale],
  );

  return (
    <View style={{ flex: 1, backgroundColor: web ? '#0B0B0C' : background, overflow: 'hidden' }}>
      <View
        testID="automotive-frame"
        style={
          web
            ? // Navegador: `zoom` em vez de `transform: scale`. Com a escala por transformação,
              // o Safari redesenha a tela inteira a cada quadro de qualquer animação (a aba do
              // Mapa caía para ~16 fps); com zoom, o conteúdo é desenhado já no tamanho final.
              ({
                position: 'absolute',
                width,
                height,
                left: 0,
                top: 0,
                zoom: scale,
                backgroundColor: background,
                overflow: 'hidden',
              } as object)
            : {
                position: 'absolute',
                width,
                height,
                // A escala do React Native é feita em torno do centro: posiciona para que o
                // centro da área de desenho caia no centro da área útil.
                left: left + (availW - width) / 2,
                top: top + (availH - height) / 2,
                backgroundColor: background,
                transform: [{ scale }],
                overflow: 'hidden',
              }
        }
      >
        <FormFactorProvider value={phone ? 'phone' : 'car'}>
          <SystemInsetsProvider value={system}>
            <FrameScaleContext.Provider value={scale}>{children}</FrameScaleContext.Provider>
          </SystemInsetsProvider>
        </FormFactorProvider>
      </View>
    </View>
  );
}
