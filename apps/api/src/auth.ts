import { isPlatform, PLATFORM_HEADER, type Platform, type Role } from '@goclient/core';
import { and, eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Database } from './db/client';
import { memberships, users } from './db/schema';
import { DEV_USER_ID } from './db/seed';
import type { Env } from './env';

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: Role;
}

export type AppVariables = {
  auth: AuthContext;
  platform: Platform;
};

/** Resolve a identidade da requisição para um `userId` do GoClient. */
type IdentityResolver = (req: Request, db: Database) => Promise<string | null>;

function devResolver(): IdentityResolver {
  // Apenas desenvolvimento/testes: permite simular outro usuário via cabeçalho.
  return async (req) => req.headers.get('x-goclient-dev-user') ?? DEV_USER_ID;
}

function jwtResolver(env: Env): IdentityResolver {
  const jwks = createRemoteJWKSet(new URL(env.AUTH_JWKS_URL as string));
  return async (req, db) => {
    const header = req.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) return null;
    try {
      const { payload } = await jwtVerify(header.slice(7), jwks, {
        ...(env.AUTH_ISSUER ? { issuer: env.AUTH_ISSUER } : {}),
        ...(env.AUTH_AUDIENCE ? { audience: env.AUTH_AUDIENCE } : {}),
      });
      if (!payload.sub) return null;
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.authSubject, payload.sub))
        .limit(1);
      return user?.id ?? null;
    } catch {
      return null;
    }
  };
}

/** Exige a plataforma de origem em toda rota de negócio. */
export const requirePlatform = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const platform = c.req.header(PLATFORM_HEADER);
  if (!isPlatform(platform)) {
    throw new HTTPException(400, {
      message: `Cabeçalho ${PLATFORM_HEADER} ausente ou inválido.`,
    });
  }
  c.set('platform', platform);
  await next();
});

export function requireAuth(env: Env, db: Database) {
  const resolve = env.GOCLIENT_AUTH_MODE === 'jwt' ? jwtResolver(env) : devResolver();

  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const userId = await resolve(c.req.raw, db);
    if (!userId) throw new HTTPException(401, { message: 'Não autenticado.' });

    const requestedOrg = c.req.header('x-goclient-organization');
    const rows = await db
      .select({ organizationId: memberships.organizationId, role: memberships.role })
      .from(memberships)
      .where(
        requestedOrg
          ? and(eq(memberships.userId, userId), eq(memberships.organizationId, requestedOrg))
          : eq(memberships.userId, userId),
      )
      .limit(1);
    const membership = rows[0];
    if (!membership) throw new HTTPException(403, { message: 'Usuário sem acesso à organização.' });

    c.set('auth', { userId, organizationId: membership.organizationId, role: membership.role });
    await next();
  });
}
