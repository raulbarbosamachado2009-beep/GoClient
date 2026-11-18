import { randomUUID } from 'node:crypto';
import type { Platform } from '@goclient/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createDatabase, type DatabaseHandle } from './db/client';
import { DEV_ORGANIZATION_ID, seedDevelopment } from './db/seed';
import { loadEnv } from './env';

let database: DatabaseHandle;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  database = createDatabase({ pgliteDataDir: 'memory' });
  await database.migrate();
  await seedDevelopment(database.db);
  app = createApp(loadEnv({ GOCLIENT_ENV: 'test' }), database);
});

afterAll(async () => {
  await database.close();
});

function call(path: string, platform: Platform | null, body?: unknown) {
  return app.request(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'content-type': 'application/json',
      ...(platform ? { 'x-goclient-platform': platform } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function customer(id: string, name: string) {
  return {
    id,
    name,
    tradeName: null,
    document: null,
    email: null,
    phone: null,
    whatsapp: '11987654321',
    regionId: null,
    notes: null,
    address: {
      street: null,
      number: null,
      district: null,
      city: 'Campinas',
      state: 'SP',
      postalCode: null,
      latitude: null,
      longitude: null,
    },
  };
}

function upsert(recordId: string, data: unknown, baseVersion: number | null = null) {
  return {
    mutationId: randomUUID(),
    collection: 'customers',
    op: 'upsert',
    recordId,
    data,
    baseVersion,
  };
}

describe('API', () => {
  it('GET /health responde com o banco conectado', async () => {
    const res = await call('/health', null);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: 'ok',
      database: { status: 'ok', driver: 'pglite' },
    });
  });

  it('exige o cabeçalho de plataforma nas rotas /v1', async () => {
    const res = await call('/v1/me', null);
    expect(res.status).toBe(400);
  });

  it('GET /v1/me reflete a Regra 1 no Automotive', async () => {
    const res = await call('/v1/me', 'automotive');
    const body = (await res.json()) as {
      organizationId: string;
      permissions: Record<string, Record<string, boolean>>;
    };
    expect(body.organizationId).toBe(DEV_ORGANIZATION_ID);
    expect(body.permissions.customer).toEqual({
      read: true,
      create: false,
      update: false,
      delete: false,
    });
    expect(body.permissions.route?.update).toBe(true);
  });

  it('GET /v1/me libera a edição no Mobile', async () => {
    const body = (await (await call('/v1/me', 'mobile')).json()) as {
      permissions: Record<string, Record<string, boolean>>;
    };
    expect(body.permissions.customer?.create).toBe(true);
  });
});

describe('Sincronização', () => {
  const id = randomUUID();

  it('Mobile cria um cliente', async () => {
    const res = await call('/v1/sync/push', 'mobile', {
      mutations: [upsert(id, customer(id, 'Mercado Central'))],
    });
    expect(res.status).toBe(200);
    const { results } = (await res.json()) as {
      results: Array<{ status: string; version: number }>;
    };
    expect(results[0]?.status).toBe('applied');
    expect(results[0]?.version).toBeGreaterThan(0);
  });

  it('Automotive não cria cliente manualmente (Regra 1, aplicada no servidor)', async () => {
    const otherId = randomUUID();
    const res = await call('/v1/sync/push', 'automotive', {
      mutations: [upsert(otherId, customer(otherId, 'Bloqueado'))],
    });
    const { results } = (await res.json()) as {
      results: Array<{ status: string; reason: string }>;
    };
    expect(results[0]).toMatchObject({
      status: 'rejected',
      reason: 'automotive_manual_edit_blocked',
    });
  });

  it('reenvio da mesma mutação é idempotente', async () => {
    const mutation = upsert(randomUUID(), null);
    mutation.data = customer(mutation.recordId, 'Idempotente');
    const first = (await (
      await call('/v1/sync/push', 'mobile', { mutations: [mutation] })
    ).json()) as {
      results: Array<{ status: string }>;
    };
    const second = (await (
      await call('/v1/sync/push', 'mobile', { mutations: [mutation] })
    ).json()) as {
      results: Array<{ status: string }>;
    };
    expect(first.results[0]?.status).toBe('applied');
    expect(second.results[0]?.status).toBe('duplicate');
  });

  it('pull devolve as mudanças em ordem e com cursor', async () => {
    const res = await call('/v1/sync/pull', 'automotive', {
      cursor: null,
      collections: ['customers'],
    });
    const body = (await res.json()) as {
      changes: Array<{ collection: string; record: { id: string; name: string } }>;
      cursor: string;
      hasMore: boolean;
    };
    expect(body.changes.map((c) => c.record.name)).toEqual(['Mercado Central', 'Idempotente']);
    expect(body.hasMore).toBe(false);

    const next = (await (
      await call('/v1/sync/pull', 'automotive', { cursor: body.cursor, collections: ['customers'] })
    ).json()) as { changes: unknown[] };
    expect(next.changes).toHaveLength(0);
  });

  it('pull pagina respeitando o limite', async () => {
    const body = (await (
      await call('/v1/sync/pull', 'web', { cursor: null, collections: ['customers'], limit: 1 })
    ).json()) as { changes: unknown[]; hasMore: boolean };
    expect(body.changes).toHaveLength(1);
    expect(body.hasMore).toBe(true);
  });

  it('detecta conflito quando o cliente edita uma versão desatualizada', async () => {
    const res = await call('/v1/sync/push', 'mobile', {
      mutations: [upsert(id, customer(id, 'Edição antiga'), 0)],
    });
    const { results } = (await res.json()) as {
      results: Array<{ status: string; serverRecord: { name: string } }>;
    };
    expect(results[0]?.status).toBe('conflict');
    expect(results[0]?.serverRecord.name).toBe('Mercado Central');
  });

  it('rejeita dados inválidos', async () => {
    const badId = randomUUID();
    const res = await call('/v1/sync/push', 'mobile', {
      mutations: [upsert(badId, { ...customer(badId, ''), email: 'não-é-email' })],
    });
    const { results } = (await res.json()) as {
      results: Array<{ status: string; reason: string }>;
    };
    expect(results[0]).toMatchObject({ status: 'rejected', reason: 'invalid_data' });
  });
});

describe('Havena', () => {
  it('lista ferramentas com a decisão de acesso para o Automotive', async () => {
    const body = (await (await call('/v1/havena/tools', 'automotive')).json()) as {
      tools: Array<{
        name: string;
        decision: { allowed: boolean; requiresConfirmation?: boolean };
      }>;
    };
    const create = body.tools.find((t) => t.name === 'customers.create');
    expect(create?.decision).toEqual({ allowed: true, requiresConfirmation: true });
  });
});
