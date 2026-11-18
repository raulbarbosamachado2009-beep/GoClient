import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Sequência global usada como relógio lógico da sincronização. Toda escrita em uma
 * tabela sincronizável recebe `version = nextval('sync_version_seq')`, o que dá uma
 * ordem total e monotônica sem depender do relógio dos dispositivos.
 */
export const syncVersionSeq = pgSequence('sync_version_seq', { startWith: 1 });

export const roleEnum = pgEnum('role', ['owner', 'admin', 'seller', 'viewer']);
export const visitStatusEnum = pgEnum('visit_status', ['planned', 'done', 'skipped', 'cancelled']);
export const routeStatusEnum = pgEnum('route_status', [
  'draft',
  'planned',
  'in_progress',
  'completed',
]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /** Identificador do usuário no provedor de identidade (claim `sub` do JWT). */
  authSubject: text('auth_subject').unique(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const memberships = pgTable(
  'memberships',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);

/** Colunas comuns a toda tabela sincronizável. */
const syncable = () => ({
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  deletedAt: ts('deleted_at'),
  version: bigint('version', { mode: 'number' })
    .notNull()
    .default(sql`nextval('sync_version_seq')`),
});

export const regions = pgTable(
  'regions',
  {
    ...syncable(),
    name: text('name').notNull(),
    color: text('color'),
  },
  (t) => [index('regions_org_version_idx').on(t.organizationId, t.version)],
);

export interface AddressColumn {
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const customers = pgTable(
  'customers',
  {
    ...syncable(),
    name: text('name').notNull(),
    tradeName: text('trade_name'),
    document: text('document'),
    email: text('email'),
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    regionId: uuid('region_id').references(() => regions.id, { onDelete: 'set null' }),
    notes: text('notes'),
    address: jsonb('address').$type<AddressColumn>().notNull(),
  },
  (t) => [
    index('customers_org_version_idx').on(t.organizationId, t.version),
    index('customers_org_region_idx').on(t.organizationId, t.regionId),
  ],
);

export const products = pgTable(
  'products',
  {
    ...syncable(),
    name: text('name').notNull(),
    sku: text('sku'),
    description: text('description'),
    priceCents: integer('price_cents'),
    unit: text('unit'),
    category: text('category'),
    active: boolean('active').notNull().default(true),
  },
  (t) => [index('products_org_version_idx').on(t.organizationId, t.version)],
);

export const routes = pgTable(
  'routes',
  {
    ...syncable(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    date: date('date', { mode: 'string' }).notNull(),
    status: routeStatusEnum('status').notNull().default('draft'),
    stopCustomerIds: uuid('stop_customer_ids').array().notNull().default(sql`'{}'::uuid[]`),
    regionIds: uuid('region_ids').array().notNull().default(sql`'{}'::uuid[]`),
  },
  (t) => [index('routes_org_version_idx').on(t.organizationId, t.version)],
);

export const visits = pgTable(
  'visits',
  {
    ...syncable(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    routeId: uuid('route_id').references(() => routes.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    scheduledFor: date('scheduled_for', { mode: 'string' }).notNull(),
    status: visitStatusEnum('status').notNull().default('planned'),
    notes: text('notes'),
    completedAt: ts('completed_at'),
  },
  (t) => [
    index('visits_org_version_idx').on(t.organizationId, t.version),
    index('visits_customer_idx').on(t.customerId),
  ],
);

/**
 * Vínculo entre um registro do GoClient e o mesmo registro num sistema externo
 * (ex.: Kyte). Mantido fora das tabelas de domínio para suportar vários provedores.
 */
export const externalLinks = pgTable(
  'external_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    externalId: text('external_id').notNull(),
    lastSyncedAt: ts('last_synced_at'),
  },
  (t) => [
    uniqueIndex('external_links_provider_external_idx').on(
      t.organizationId,
      t.provider,
      t.entityType,
      t.externalId,
    ),
  ],
);

/** Registro de mutações já aplicadas, para que reenvios do cliente sejam idempotentes. */
export const syncMutations = pgTable('sync_mutations', {
  mutationId: uuid('mutation_id').primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  result: jsonb('result').notNull(),
  appliedAt: ts('applied_at').notNull().defaultNow(),
});
