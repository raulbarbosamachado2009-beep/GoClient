import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationsFolder = resolve(apiRoot, 'drizzle');

export type Database = ReturnType<typeof drizzlePglite<typeof schema>>;

export interface DatabaseHandle {
  db: Database;
  driver: 'pglite' | 'postgres';
  migrate(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Cria a conexão com o banco.
 * - Com `DATABASE_URL`: PostgreSQL real (produção, staging, ou local via Docker).
 * - Sem `DATABASE_URL`: PGlite — PostgreSQL compilado para WebAssembly, rodando dentro
 *   do processo. Em `dataDir` persiste em disco; `memory` serve para testes.
 */
export function createDatabase(options: {
  databaseUrl?: string | undefined;
  pgliteDataDir?: string | 'memory';
}): DatabaseHandle {
  if (options.databaseUrl) {
    const sql = postgres(options.databaseUrl, { max: 10 });
    const db = drizzlePostgres(sql, { schema }) as unknown as Database;
    return {
      db,
      driver: 'postgres',
      migrate: () => migratePostgres(db as never, { migrationsFolder }),
      close: () => sql.end(),
    };
  }

  const dataDir = options.pgliteDataDir ?? resolve(apiRoot, '.data/pglite');
  if (dataDir !== 'memory') mkdirSync(dataDir, { recursive: true });
  const client = dataDir === 'memory' ? new PGlite() : new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  return {
    db,
    driver: 'pglite',
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  };
}
