import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Ajustes do Lucas que ficam salvos no aparelho. Por enquanto só a ativação por voz
 * ("olá Lucas", "bom dia", "oh IA", "olá inteligência artificial"), ligada por padrão.
 */
const WAKE_KEY = 'lucas.wake';
let wake = true;
const listeners = new Set<() => void>();

if (Platform.OS !== 'web')
  SecureStore.getItemAsync(WAKE_KEY)
    .then((v) => {
      if (v === '0') setWakeEnabled(false, false);
    })
    .catch(() => {});

export function setWakeEnabled(v: boolean, save = true) {
  wake = v;
  if (save && Platform.OS !== 'web')
    SecureStore.setItemAsync(WAKE_KEY, v ? '1' : '0').catch(() => {});
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useWakeEnabled(): [boolean, (v: boolean) => void] {
  return [useSyncExternalStore(subscribe, () => wake), setWakeEnabled];
}
