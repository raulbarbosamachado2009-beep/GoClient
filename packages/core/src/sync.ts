import { z } from 'zod';
import {
  customerSchema,
  productSchema,
  regionSchema,
  writableCustomerSchema,
  writableProductSchema,
  writableRegionSchema,
} from './entities';
import type { Resource } from './permissions';

/**
 * Protocolo de sincronização offline-first.
 *
 * Modelo: o servidor é a fonte da verdade. Cada escrita recebe uma `version` vinda de
 * uma sequência global do PostgreSQL. O cliente guarda o maior `version` já recebido
 * (cursor) e pede apenas o que mudou depois dele (`pull`). Alterações locais ficam numa
 * fila e são enviadas em lote (`push`), cada uma com um `mutationId` para que reenvios
 * sejam idempotentes.
 *
 * Conflitos: se o cliente informar `baseVersion` e o registro no servidor já estiver em
 * uma versão mais nova, a mutação volta como `conflict` junto com o registro atual, e o
 * cliente decide (por padrão, mantém a versão do servidor e avisa o usuário).
 */

/** Coleções sincronizadas nesta fase. Visitas e rotas entram junto com seus módulos. */
export const SYNC_COLLECTIONS = ['regions', 'customers', 'products'] as const;
export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

export const COLLECTION_RESOURCE: Record<SyncCollection, Resource> = {
  regions: 'region',
  customers: 'customer',
  products: 'product',
};

export const COLLECTION_RECORD_SCHEMA = {
  regions: regionSchema,
  customers: customerSchema,
  products: productSchema,
} as const;

export const COLLECTION_WRITE_SCHEMA = {
  regions: writableRegionSchema,
  customers: writableCustomerSchema,
  products: writableProductSchema,
} as const;

/** Cursor serializado como string para não perder precisão de bigint no JSON. */
const cursorSchema = z.string().regex(/^\d+$/);

export const syncPullRequestSchema = z.object({
  cursor: cursorSchema.nullable(),
  collections: z.array(z.enum(SYNC_COLLECTIONS)).min(1),
  limit: z.number().int().min(1).max(1000).default(500),
});

export const syncPullResponseSchema = z.object({
  changes: z.array(
    z.object({
      collection: z.enum(SYNC_COLLECTIONS),
      /** Registro completo; se `deletedAt` estiver preenchido, o cliente remove localmente. */
      record: z.record(z.string(), z.unknown()),
    }),
  ),
  cursor: cursorSchema.nullable(),
  hasMore: z.boolean(),
});

export const syncMutationSchema = z.object({
  mutationId: z.uuid(),
  collection: z.enum(SYNC_COLLECTIONS),
  op: z.enum(['upsert', 'delete']),
  recordId: z.uuid(),
  /** Obrigatório em `upsert`; validado com o schema de escrita da coleção. */
  data: z.record(z.string(), z.unknown()).optional(),
  /** Versão em que o cliente baseou a alteração; `null` para registros novos. */
  baseVersion: z.number().int().nonnegative().nullable(),
});

export const syncPushRequestSchema = z.object({
  mutations: z.array(syncMutationSchema).min(1).max(200),
});

export const MUTATION_STATUSES = ['applied', 'duplicate', 'conflict', 'rejected'] as const;

export const syncMutationResultSchema = z.object({
  mutationId: z.uuid(),
  status: z.enum(MUTATION_STATUSES),
  version: z.number().int().nonnegative().optional(),
  reason: z.string().optional(),
  /** Presente em `conflict`: o estado atual do registro no servidor. */
  serverRecord: z.record(z.string(), z.unknown()).optional(),
});

export const syncPushResponseSchema = z.object({
  results: z.array(syncMutationResultSchema),
});

export type SyncPullRequest = z.input<typeof syncPullRequestSchema>;
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;
export type SyncMutation = z.infer<typeof syncMutationSchema>;
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;
export type SyncMutationResult = z.infer<typeof syncMutationResultSchema>;
export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;
