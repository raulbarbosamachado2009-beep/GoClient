import * as Crypto from 'expo-crypto';
import { SPOTIFY_CLIENT_ID } from '../integrations/env';

/**
 * Login do Spotify por Authorization Code com PKCE (sem segredo no app).
 *
 * O endereço de retorno é um IP de loopback, aceito pelo Spotify sem HTTPS. Ninguém
 * precisa responder nele: a janela de login do GoClient intercepta a navegação para esse
 * endereço e lê o código antes de a página carregar. Cadastre exatamente este endereço no
 * painel do app no Spotify for Developers.
 */
export const REDIRECT_URI = 'http://127.0.0.1:43821/callback';

export const SCOPES = [
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-library-read',
  'user-follow-read',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
];

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Momento (ms) em que o token de acesso expira. */
  expiresAt: number;
}

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

function randomString(length: number): string {
  const bytes = Crypto.getRandomBytes(length);
  let out = '';
  for (const b of bytes) out += CHARSET[b % CHARSET.length];
  return out;
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface PkceRequest {
  url: string;
  verifier: string;
  state: string;
}

/** Monta o endereço da página de autorização do Spotify. */
export async function createAuthRequest(): Promise<PkceRequest> {
  const verifier = randomString(64);
  const state = randomString(16);
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: toBase64Url(digest),
    scope: SCOPES.join(' '),
    state,
    // Sempre mostra a tela de permissão, com o "Não é você?" para trocar de conta.
    show_dialog: 'true',
  });
  return { url: `https://accounts.spotify.com/authorize?${params}`, verifier, state };
}

/** Lê `code`/`error`/`state` do endereço de retorno. */
export function parseRedirect(url: string): { code?: string; error?: string; state?: string } {
  const query = url.split('?')[1] ?? '';
  const p = new URLSearchParams(query.split('#')[0]);
  return {
    code: p.get('code') ?? undefined,
    error: p.get('error') ?? undefined,
    state: p.get('state') ?? undefined,
  };
}

async function tokenRequest(body: Record<string, string>, previousRefresh?: string) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, ...body }).toString(),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ?? json.error ?? `Spotify recusou o login (${res.status})`,
    );
  }
  return {
    accessToken: json.access_token,
    // Na renovação o Spotify às vezes não manda um novo refresh_token: mantém o anterior.
    refreshToken: json.refresh_token ?? previousRefresh ?? '',
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  } satisfies TokenSet;
}

export function exchangeCode(code: string, verifier: string): Promise<TokenSet> {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });
}

export function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken }, refreshToken);
}
