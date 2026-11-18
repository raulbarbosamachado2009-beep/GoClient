import { colors } from '@goclient/design-tokens';
import { mobileScale, ScaleProvider } from '@goclient/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ScaleProvider scale={mobileScale}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </ScaleProvider>
  );
}
