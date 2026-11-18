import {
  type AccessContext,
  COLLECTION_RESOURCE,
  COLLECTION_WRITE_SCHEMA,
  can,
  type SyncCollection,
  type SyncMutation,
  type SyncMutationResult,
  type SyncPullResponse,
} from '@goclient/core';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { customers, products, regions, syncMutations } from '../db/schema';

const TABLES = { regions, customers, products } as const;
type SyncTable = (typeof TABLES)[SyncCollection];

/** Converte uma linha do banco no formato de registro do protocolo (datas em ISO). */
export function serializeRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

export async function pullChanges(
  db: Database,
  organizationId: string,
  input: { cursor: string | null; collections: SyncCollection[]; limit: number },
): Promise<SyncPullResponse> {
  const after = input.cursor ? Number(input.cursor) : 0;

  // Cada coleção devolve até limit+1 itens; a junção ordenada por `version` e cortada em
  // `limit` corresponde exatamente às próximas `limit` mudanças globais.
  const perCollection = await Promise.all(
    input.collections.map(async (collection) => {
      const table: SyncTable = TABLES[collection];
      const rows = await db
        .select()
        .from(table)
        .where(and(eq(table.organizationId, organizationId), gt(table.version, after)))
        .orderBy(asc(table.version))
        .limit(input.limit + 1);
      return rows.map((row) => ({ collection, record: serializeRecord(row) }));
    }),
  );

  const merged = perCollection
    .flat()
    .sort((a, b) => (a.record.version as number) - (b.record.version as number));
  const page = merged.slice(0, input.limit);
  const last = page.at(-1);

  return {
    changes: page,
    cursor: last ? String(last.record.version) : input.cursor,
    hasMore: merged.length > input.limit,
  };
}

export async function pushMutations(
  db: Database,
  ctx: AccessContext & { userId: string; organizationId: string },
  mutations: SyncMutation[],
): Promise<SyncMutationResult[]> {
  const results: SyncMutationResult[] = [];
  for (const mutation of mutations) {
    results.push(await applyMutation(db, ctx, mutation));
  }
  return results;
}

async function applyMutation(
  db: Database,
  ctx: AccessContext & { userId: string; organizationId: string },
  mutation: SyncMutation,
): Promise<SyncMutationResult> {
  return db.transaction(async (tx) => {
    const [already] = await tx
      .select({ result: syncMutations.result })
      .from(syncMutations)
      .where(eq(syncMutations.mutationId, mutation.mutationId))
      .limit(1);
    if (already) {
      return { ...(already.result as SyncMutationResult), status: 'duplicate' as const };
    }

    const table: SyncTable = TABLES[mutation.collection];
    const [existing] = await tx
      .select()
      .from(table)
      .where(eq(table.id, mutation.recordId))
      .limit(1);

    const result = await (async (): Promise<SyncMutationResult> => {
      const reject = (reason: string): SyncMutationResult => ({
        mutationId: mutation.mutationId,
        status: 'rejected',
        reason,
      });

      if (existing && existing.organizationId !== ctx.organizationId) return reject('not_found');

      const action =
        mutation.op === 'delete' ? 'delete' : existing && !existing.deletedAt ? 'update' : 'create';
      const decision = can(ctx, COLLECTION_RESOURCE[mutation.collection], action);
      if (!decision.allowed) return reject(decision.reason);

      if (existing && mutation.baseVersion !== null && existing.version > mutation.baseVersion) {
        return {
          mutationId: mutation.mutationId,
          status: 'conflict',
          serverRecord: serializeRecord(existing),
        };
      }

      if (mutation.op === 'delete') {
        if (!existing) return reject('not_found');
        const [row] = await tx
          .update(table)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
            version: sql`nextval('sync_version_seq')`,
          })
          .where(eq(table.id, mutation.recordId))
          .returning({ version: table.version });
        return { mutationId: mutation.mutationId, status: 'applied', version: row?.version };
      }

      const parsed = COLLECTION_WRITE_SCHEMA[mutation.collection].safeParse(mutation.data);
      if (!parsed.success) return reject('invalid_data');
      if (parsed.data.id !== mutation.recordId) return reject('id_mismatch');

      const values = {
        ...parsed.data,
        organizationId: ctx.organizationId,
        deletedAt: null,
        updatedAt: new Date(),
        version: sql`nextval('sync_version_seq')`,
      };
      const [row] = existing
        ? await tx
            .update(table)
            .set(values as never)
            .where(eq(table.id, mutation.recordId))
            .returning({ version: table.version })
        : await tx
            .insert(table)
            .values(values as never)
            .returning({ version: table.version });
      return { mutationId: mutation.mutationId, status: 'applied', version: row?.version };
    })();

    await tx.insert(syncMutations).values({
      mutationId: mutation.mutationId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      result,
    });
    return result;
  });
}
