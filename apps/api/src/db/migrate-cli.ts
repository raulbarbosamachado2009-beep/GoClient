import { loadEnv } from '../env';
import { createDatabase } from './client';
import { seedDevelopment } from './seed';

const env = loadEnv();
const handle = createDatabase({ databaseUrl: env.DATABASE_URL });
await handle.migrate();
if (env.GOCLIENT_ENV !== 'production') await seedDevelopment(handle.db);
await handle.close();
console.log(`Migrações aplicadas (${handle.driver}).`);
