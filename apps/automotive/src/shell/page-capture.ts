import type { ComponentRef } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Foto pequena da página aberta (para o fundo desfocado da multimídia). No Android/iOS usa o
 * react-native-view-shot; na Web, `page-capture.web.ts`. Sai bem pequena (o fundo é
 * borrado), em PNG para os cantos arredondados da moldura ficarem transparentes (em JPG viravam pretos).
 */
export async function capturePage(
  node: ComponentRef<typeof View>,
  width: number,
  height: number,
): Promise<string> {
  return captureRef(node as unknown as number, {
    format: 'png',
    width,
    height,
    result: 'data-uri',
  });
}
