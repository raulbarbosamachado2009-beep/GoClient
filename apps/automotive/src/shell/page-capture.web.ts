import { toPng } from 'html-to-image';
import type { ComponentRef } from 'react';
import type { View } from 'react-native';

/** Web (Preview): a mesma foto pequena da página, a partir do DOM. */
export async function capturePage(
  node: ComponentRef<typeof View>,
  width: number,
  height: number,
): Promise<string> {
  const el = node as unknown as HTMLElement;
  const scale = width / Math.max(1, el.offsetWidth);
  return toPng(el, {
    pixelRatio: scale,
    skipFonts: true,
    cacheBust: false,
    height: el.offsetHeight,
    width: el.offsetWidth,
    canvasHeight: height,
    canvasWidth: width,
  });
}
