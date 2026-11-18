import { automotiveScale, ScaleProvider } from '@goclient/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AutomotiveFrame } from '../preview/automotive-frame';
import { PrototypeProvider } from '../prototype/state';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <ScaleProvider scale={automotiveScale}>
      <PrototypeProvider>
        <StatusBar style="light" hidden />
        <AutomotiveFrame>
          <Stack
            screenOptions={{
              headerShown: false,
              // Transições curtas e sem gesto de "voltar" por deslize, que gera toques acidentais.
              animation: 'fade',
              gestureEnabled: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="player" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
        </AutomotiveFrame>
      </PrototypeProvider>
    </ScaleProvider>
  );
}
