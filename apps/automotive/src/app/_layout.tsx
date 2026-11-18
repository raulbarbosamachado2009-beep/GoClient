import { automotiveScale, ScaleProvider } from '@goclient/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { fontAssets } from '../fonts';
import { AutomotiveFrame } from '../preview/automotive-frame';
import { PrototypeProvider } from '../prototype/state';
import { ThemeProvider, useColors } from '../theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  return (
    <ScaleProvider scale={automotiveScale}>
      <ThemeProvider>
        <PrototypeProvider>
          <StatusBar hidden />
          <Frame>{fontsLoaded ? <Routes /> : null}</Frame>
        </PrototypeProvider>
      </ThemeProvider>
    </ScaleProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const c = useColors();
  return <AutomotiveFrame background={c.background}>{children}</AutomotiveFrame>;
}

function Routes() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        // Sem gesto de deslizar para voltar: evita toques acidentais no carro.
        gestureEnabled: false,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="player" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
