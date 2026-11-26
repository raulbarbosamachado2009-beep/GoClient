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
import { ThemeProvider, useColors } from '../theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  return (
    <ScaleProvider scale={automotiveScale}>
      <ThemeProvider>
        <PrototypeProvider>
          <StatusBar hidden />
          <Frame>
            {fontsLoaded ? (
              <>
                <Routes />
                <MapWarmup />
              </>
            ) : null}
          </Frame>
        </PrototypeProvider>
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
  // O app principal cuida disso por conta própria (fundos até a borda).
  const top = useSystemInsets().top;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // A transição entre páginas é a do próprio app (ui/motion.tsx: usePageTransition);
        // a da pilha somaria outra por cima (ficava lenta).
        animation: 'none',
        // Sem gesto de deslizar para voltar: evita toques acidentais no carro.
        gestureEnabled: false,
        contentStyle: { backgroundColor: c.background, paddingTop: top },
      }}
    >
      <Stack.Screen name="(main)" options={{ contentStyle: { backgroundColor: c.background } }} />
    </Stack>
  );
}
