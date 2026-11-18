import { automotive, colors } from '@goclient/design-tokens';
import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

const { width: FRAME_W, height: FRAME_H } = automotive.viewport;

/**
 * No navegador (Preview), renderiza o app numa moldura fixa de 1600×900 escalada para
 * caber na janela — o layout é calculado exatamente como na central multimídia de
 * referência. No Android, ocupa a tela inteira normalmente.
 */
export function AutomotiveFrame({ children }: { children: ReactNode }) {
  const window = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>;
  }

  const scale = Math.min(window.width / FRAME_W, window.height / FRAME_H, 1);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B0B0C',
        overflow: 'hidden',
      }}
    >
      <View
        testID="automotive-frame"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          backgroundColor: colors.background,
          transform: [{ scale }],
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}
