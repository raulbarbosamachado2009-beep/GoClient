import { spacing } from '@goclient/design-tokens';
import { EnvironmentCheck, Screen, Text } from '@goclient/native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Tela provisória de diagnóstico do ambiente (Mobile).
 * NÃO é uma tela do produto: será substituída quando as interfaces forem aprovadas.
 */
export default function DiagnosticsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Screen style={{ gap: spacing[6] }}>
        <Text variant="caption" tone="tertiary">
          Diagnóstico do ambiente · Mobile
        </Text>
        <Text variant="title">GoClient</Text>
        <EnvironmentCheck platform="mobile" />
      </Screen>
    </SafeAreaView>
  );
}
