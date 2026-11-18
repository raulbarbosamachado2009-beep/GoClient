import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createDatabase } from './db/client';
import { seedDevelopment } from './db/seed';
import { loadEnv } from './env';

const env = loadEnv();
const database = createDatabase({ databaseUrl: env.DATABASE_URL });

await database.migrate();
if (env.GOCLIENT_ENV === 'development') await seedDevelopment(database.db);

const app = createApp(env, database);
const server = serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(
    `GoClient API em http://localhost:${info.port} (${env.GOCLIENT_ENV}, banco: ${database.driver})`,
  );
});

const shutdown = async () => {
  server.close();
  await database.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
