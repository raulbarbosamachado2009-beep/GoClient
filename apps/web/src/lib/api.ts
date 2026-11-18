import { createApiClient } from '@goclient/api/client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Cliente tipado da API para a plataforma Web. */
export const api = createApiClient({ baseUrl: API_URL, platform: 'web' });
