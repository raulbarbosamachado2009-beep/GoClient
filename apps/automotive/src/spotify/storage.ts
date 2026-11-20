import * as SecureStore from 'expo-secure-store';
import type { TokenSet } from './auth';

/** Conta do Spotify salva no aparelho (tokens no armazenamento seguro do Android). */
export interface SpotifyAccount extends TokenSet {
  id: string;
  name: string;
  image?: string;
  product?: string;
}

const INDEX = 'spotify.accounts';
const ACTIVE = 'spotify.active';
/** As chaves do SecureStore só aceitam letras, números, ".", "-" e "_". */
const keyOf = (id: string) => `spotify.account.${id.replace(/[^A-Za-z0-9._-]/g, '_')}`;

async function readIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function loadAccounts(): Promise<{
  accounts: SpotifyAccount[];
  active: string | null;
}> {
  const ids = await readIndex();
  const accounts: SpotifyAccount[] = [];
  for (const id of ids) {
    try {
      const raw = await SecureStore.getItemAsync(keyOf(id));
      if (raw) accounts.push(JSON.parse(raw) as SpotifyAccount);
    } catch {
      // Conta corrompida: ignora (a pessoa pode entrar de novo).
    }
  }
  const active = await SecureStore.getItemAsync(ACTIVE).catch(() => null);
  return { accounts, active };
}

export async function saveAccount(account: SpotifyAccount): Promise<void> {
  await SecureStore.setItemAsync(keyOf(account.id), JSON.stringify(account));
  const ids = await readIndex();
  if (!ids.includes(account.id)) {
    await SecureStore.setItemAsync(INDEX, JSON.stringify([...ids, account.id]));
  }
}

export async function removeAccount(id: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyOf(id));
  const ids = (await readIndex()).filter((x) => x !== id);
  await SecureStore.setItemAsync(INDEX, JSON.stringify(ids));
}

export async function saveActive(id: string | null): Promise<void> {
  if (id) await SecureStore.setItemAsync(ACTIVE, id);
  else await SecureStore.deleteItemAsync(ACTIVE);
}
