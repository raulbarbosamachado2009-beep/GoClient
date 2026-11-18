import { z } from 'zod';

const envSchema = z
  .object({
    GOCLIENT_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z
      .string()
      .optional()
      .transform((v) => v || undefined),
    GOCLIENT_AUTH_MODE: z.enum(['dev', 'jwt']).default('dev'),
    AUTH_JWKS_URL: z
      .string()
      .optional()
      .transform((v) => v || undefined),
    AUTH_ISSUER: z
      .string()
      .optional()
      .transform((v) => v || undefined),
    AUTH_AUDIENCE: z
      .string()
      .optional()
      .transform((v) => v || undefined),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000,http://localhost:8081,http://localhost:8082')
      .transform((v) =>
        v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
  })
  .superRefine((env, ctx) => {
    if (env.GOCLIENT_ENV === 'production') {
      if (env.GOCLIENT_AUTH_MODE === 'dev') {
        ctx.addIssue({ code: 'custom', message: 'GOCLIENT_AUTH_MODE=dev é proibido em produção.' });
      }
      if (!env.DATABASE_URL) {
        ctx.addIssue({ code: 'custom', message: 'DATABASE_URL é obrigatório em produção.' });
      }
    }
    if (env.GOCLIENT_AUTH_MODE === 'jwt' && !env.AUTH_JWKS_URL) {
      ctx.addIssue({
        code: 'custom',
        message: 'AUTH_JWKS_URL é obrigatório com GOCLIENT_AUTH_MODE=jwt.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return envSchema.parse(source);
}
