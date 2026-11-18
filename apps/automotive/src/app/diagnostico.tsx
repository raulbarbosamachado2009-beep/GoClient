import { spacing } from '@goclient/design-tokens';
import { EnvironmentCheck, Screen, Text } from '@goclient/native';
import { View } from 'react-native';

/**
 * Tela provisória de diagnóstico do ambiente (Automotive, 1600×900 paisagem).
 * NÃO é uma tela do produto: será substituída quando as interfaces forem aprovadas.
 */
export default function DiagnosticsScreen() {
  return (
    <Screen style={{ flexDirection: 'row', gap: spacing[10] }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing[3] }}>
        <Text variant="caption" tone="tertiary">
          Diagnóstico do ambiente · Automotive
        </Text>
        <Text variant="title">GoClient</Text>
        <Text variant="body" tone="secondary">
          Referência 1600 × 900 · paisagem
        </Text>
      </View>
      <View style={{ flex: 1.4, justifyContent: 'center' }}>
        <EnvironmentCheck platform="automotive" />
      </View>
    </Screen>
  );
}
