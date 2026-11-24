import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Lembra que a pessoa já passou pelo onboarding: nas próximas aberturas o app vai direto para
 * o Mapa (antes ele mostrava as boas-vindas e as permissões toda vez). Em Ajustes dá para ver
 * a apresentação de novo. No Preview (web) o onboarding continua aparecendo sempre.
 */
const KEY = 'onboarding.done.v1';

export async function onboardingDone(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingDone() {
  if (Platform.OS === 'web') return;
  SecureStore.setItemAsync(KEY, '1').catch(() => {});
}
