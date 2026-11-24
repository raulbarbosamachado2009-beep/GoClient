import { automotiveScale, ScaleProvider } from '@goclient/native';
import { useFonts } from 'expo-font';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { fontAssets } from '../fonts';
import { useSystemInsets } from '../layout/form-factor';
import { MapWarmup } from '../map/live-map';
import { AutomotiveFrame } from '../preview/automotive-frame';
import { PrototypeProvider } from '../prototype/state';
import { SpotifyLoginHost } from '../spotify/login';
import { SpotifyNotice } from '../spotify/notice';
import { SpotifyProvider } from '../spotify/provider';
import { ThemeProvider, useColors } from '../theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  return (
    <ScaleProvider scale={automotiveScale}>
      <ThemeProvider>
        <SpotifyProvider>
          <PrototypeProvider>
            <StatusBar hidden />
            <Frame>
              {fontsLoaded ? (
                <>
                  <Routes />
                  <SpotifyNotice />
                  <SpotifyLoginHost />
                  <MapWarmup />
                </>
              ) : null}
            </Frame>
          </PrototypeProvider>
        </SpotifyProvider>
      </ThemeProvider>
    </ScaleProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <>
      {/* Botões do Android no tom do app (escuro no tema escuro). */}
      <NavigationBar style={c.mode === 'dark' ? 'dark' : 'light'} />
      <AutomotiveFrame background={c.background}>{children}</AutomotiveFrame>
    </>
  );
}

function Routes() {
  const c = useColors();
  // Telas soltas (boas-vindas, permissões, login, diagnóstico): descem da câmera/entalhe.
  // O app principal e o player cuidam disso por conta própria (fundos até a borda).
  const top = useSystemInsets().top;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        // Sem gesto de deslizar para voltar: evita toques acidentais no carro.
        gestureEnabled: false,
        contentStyle: { backgroundColor: c.background, paddingTop: top },
      }}
    >
      <Stack.Screen name="(main)" options={{ contentStyle: { backgroundColor: c.background } }} />
      <Stack.Screen
        name="player"
        options={{
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: c.background },
        }}
      />
    </Stack>
  );
}
