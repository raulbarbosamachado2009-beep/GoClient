import { colors } from '@goclient/design-tokens';
import { automotiveScale, ScaleProvider } from '@goclient/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AutomotiveFrame } from '../preview/automotive-frame';

export default function RootLayout() {
  return (
    <ScaleProvider scale={automotiveScale}>
      <StatusBar style="light" hidden />
      <AutomotiveFrame>
        <Stack
          screenOptions={{
            headerShown: false,
            // Transições curtas e sem gestos de "voltar" por deslize, que geram toques acidentais.
            animation: 'fade',
            gestureEnabled: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </AutomotiveFrame>
    </ScaleProvider>
  );
}
