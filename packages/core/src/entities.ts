import { z } from 'zod';

/**
 * Campos comuns a todo registro sincronizável.
 *
 * - `id` é um UUID gerado no cliente, para que registros possam ser criados offline.
 * - `version` é atribuída pelo servidor a cada escrita (sequência global crescente);
 *   é o cursor usado pela sincronização. Clientes nunca a definem.
 * - `deletedAt` marca exclusão lógica (tombstone), necessária para propagar exclusões.
 */
export const syncableSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
  version: z.number().int().nonnegative(),
});

const addressSchema = z.object({
  street: z.string().max(200).nullable(),
  number: z.string().max(20).nullable(),
  district: z.string().max(120).nullable(),
  city: z.string().max(120).nullable(),
  state: z.string().max(2).nullable(),
  postalCode: z.string().max(9).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

export const regionSchema = syncableSchema.extend({
  name: z.string().min(1).max(120),
  color: z.string().max(20).nullable(),
});

export const customerSchema = syncableSchema.extend({
  name: z.string().min(1).max(200),
  tradeName: z.string().max(200).nullable(),
  /** CPF ou CNPJ, apenas dígitos. */
  document: z
    .string()
    .regex(/^\d{11}$|^\d{14}$/)
    .nullable(),
  email: z.email().nullable(),
  phone: z.string().max(20).nullable(),
  whatsapp: z.string().max(20).nullable(),
  regionId: z.uuid().nullable(),
  notes: z.string().max(5000).nullable(),
  address: addressSchema,
});

export const productSchema = syncableSchema.extend({
  name: z.string().min(1).max(200),
  sku: z.string().max(60).nullable(),
  description: z.string().max(5000).nullable(),
  /** Preço em centavos, evitando erros de ponto flutuante. */
  priceCents: z.number().int().nonnegative().nullable(),
  unit: z.string().max(20).nullable(),
  category: z.string().max(120).nullable(),
  active: z.boolean(),
});

export const VISIT_STATUSES = ['planned', 'done', 'skipped', 'cancelled'] as const;

export const visitSchema = syncableSchema.extend({
  customerId: z.uuid(),
  routeId: z.uuid().nullable(),
  userId: z.uuid(),
  scheduledFor: z.iso.date(),
  status: z.enum(VISIT_STATUSES),
  notes: z.string().max(5000).nullable(),
  completedAt: z.iso.datetime().nullable(),
});

export const ROUTE_STATUSES = ['draft', 'planned', 'in_progress', 'completed'] as const;

export const routeSchema = syncableSchema.extend({
  userId: z.uuid(),
  date: z.iso.date(),
  status: z.enum(ROUTE_STATUSES),
  /** Ordem das paradas: lista de IDs de clientes. */
  stopCustomerIds: z.array(z.uuid()),
  regionIds: z.array(z.uuid()),
});

export type Region = z.infer<typeof regionSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type Product = z.infer<typeof productSchema>;
export type Visit = z.infer<typeof visitSchema>;
export type Route = z.infer<typeof routeSchema>;

/** Campos que o servidor controla e que o cliente não envia ao gravar. */
type ServerManaged = 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'version';
export type Writable<T> = Omit<T, ServerManaged>;

export const writableCustomerSchema = customerSchema.omit({
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  version: true,
});
export const writableProductSchema = productSchema.omit({
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  version: true,
});
export const writableRegionSchema = regionSchema.omit({
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  version: true,
});
