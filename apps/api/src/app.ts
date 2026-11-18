import {
  ACTIONS,
  type Action,
  authorizeHavenaTool,
  COLLECTION_RESOURCE,
  can,
  havenaTools,
  RESOURCES,
  type Resource,
  syncPullRequestSchema,
  syncPushRequestSchema,
} from '@goclient/core';
import { zValidator } from '@hono/zod-validator';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { type AppVariables, requireAuth, requirePlatform } from './auth';
import type { DatabaseHandle } from './db/client';
import type { Env } from './env';
import { pullChanges, pushMutations } from './sync/service';

export const API_VERSION = '0.1.0';

export function createApp(env: Env, database: DatabaseHandle) {
  const { db } = database;

  const v1 = new Hono<{ Variables: AppVariables }>()
    .use(requirePlatform, requireAuth(env, db))
    /** Identidade, organização e permissões efetivas nesta plataforma. */
    .get('/me', (c) => {
      const auth = c.get('auth');
      const platform = c.get('platform');
      const ctx = { role: auth.role, platform, channel: 'manual' as const };
      const permissions = Object.fromEntries(
        RESOURCES.map((resource) => [
          resource,
          Object.fromEntries(
            ACTIONS.map((action) => [action, can(ctx, resource, action).allowed]),
          ) as Record<Action, boolean>,
        ]),
      ) as Record<Resource, Record<Action, boolean>>;
      return c.json({ ...auth, platform, permissions });
    })
    .post('/sync/pull', zValidator('json', syncPullRequestSchema), async (c) => {
      const auth = c.get('auth');
      const body = c.req.valid('json');
      for (const collection of body.collections) {
        const decision = can(
          { role: auth.role, platform: c.get('platform'), channel: 'manual' },
          COLLECTION_RESOURCE[collection],
          'read',
        );
        if (!decision.allowed) throw new HTTPException(403, { message: decision.reason });
      }
      return c.json(await pullChanges(db, auth.organizationId, body));
    })
    .post('/sync/push', zValidator('json', syncPushRequestSchema), async (c) => {
      const auth = c.get('auth');
      const { mutations } = c.req.valid('json');
      const results = await pushMutations(
        db,
        { ...auth, platform: c.get('platform'), channel: 'manual' },
        mutations,
      );
      return c.json({ results });
    })
    /** Catálogo de ferramentas da Havena e se cada uma está liberada para este contexto. */
    .get('/havena/tools', (c) => {
      const auth = c.get('auth');
      const tools = Object.values(havenaTools).map((tool) => ({
        name: tool.name,
        description: tool.description,
        access: tool.access,
        decision: authorizeHavenaTool(tool, { role: auth.role, platform: c.get('platform') }),
        inputSchema: z.toJSONSchema(tool.input, { io: 'input' }),
      }));
      return c.json({ tools });
    });

  const app = new Hono()
    .use(env.GOCLIENT_ENV === 'test' ? (_c, next) => next() : logger())
    .use(
      cors({
        origin: env.CORS_ORIGINS,
        allowHeaders: [
          'content-type',
          'authorization',
          'x-goclient-platform',
          'x-goclient-organization',
          'x-goclient-dev-user',
        ],
      }),
    )
    .get('/health', async (c) => {
      let dbStatus: 'ok' | 'error' = 'ok';
      try {
        await db.execute(sql`select 1`);
      } catch {
        dbStatus = 'error';
      }
      return c.json(
        {
          status: dbStatus === 'ok' ? 'ok' : 'degraded',
          version: API_VERSION,
          environment: env.GOCLIENT_ENV,
          database: { status: dbStatus, driver: database.driver },
          auth: env.GOCLIENT_AUTH_MODE,
        },
        dbStatus === 'ok' ? 200 : 503,
      );
    })
    .route('/v1', v1);

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: 'Erro interno.' }, 500);
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
