import type { Database } from './client';
import { memberships, organizations, users } from './schema';

/** IDs fixos do ambiente de desenvolvimento, para que o Preview seja reproduzível. */
export const DEV_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000002';

/** Cria a organização e o usuário de desenvolvimento, se ainda não existirem. */
export async function seedDevelopment(db: Database): Promise<void> {
  await db
    .insert(organizations)
    .values({ id: DEV_ORGANIZATION_ID, name: 'Organização de Desenvolvimento' })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({ id: DEV_USER_ID, email: 'dev@goclient.local', name: 'Usuário de Desenvolvimento' })
    .onConflictDoNothing();
  await db
    .insert(memberships)
    .values({ organizationId: DEV_ORGANIZATION_ID, userId: DEV_USER_ID, role: 'owner' })
    .onConflictDoNothing();
}
