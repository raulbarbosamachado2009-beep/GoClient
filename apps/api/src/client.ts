import { PLATFORM_HEADER, type Platform } from '@goclient/core';
import { hc } from 'hono/client';
import type { AppType } from './app';

/**
 * Cliente tipado da API, usado por Web, Mobile e Automotive. Os tipos de rotas,
 * parâmetros e respostas vêm diretamente da definição do servidor (Hono RPC):
 * se uma rota mudar, o TypeScript acusa o erro nos aplicativos.
 *
 * Importa apenas *tipos* do servidor, então nenhum código de servidor entra no bundle.
 */
export function createApiClient(options: {
  baseUrl: string;
  platform: Platform;
  getAccessToken?: () => Promise<string | null> | string | null;
}) {
  return hc<AppType>(options.baseUrl, {
    headers: async (): Promise<Record<string, string>> => {
      const token = await options.getAccessToken?.();
      return {
        [PLATFORM_HEADER]: options.platform,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      };
    },
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
export type { AppType };
