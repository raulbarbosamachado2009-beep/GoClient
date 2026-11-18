import { z } from 'zod';
import { writableCustomerSchema } from './entities';
import {
  type AccessContext,
  type AccessDecision,
  type Action,
  can,
  type Resource,
} from './permissions';

/**
 * Havena — contratos das ferramentas que a assistente pode usar.
 *
 * A Havena não acessa o banco diretamente. Cada capacidade é uma "ferramenta" com:
 * nome estável, descrição (enviada ao modelo de IA), schema de entrada validado e o
 * par recurso/ação que ela exige. A API executa a ferramenta somente depois de passar
 * pelo mesmo motor de permissões das interfaces, no canal `havena`.
 *
 * O modelo de IA (local ou em nuvem) fica atrás de `HavenaModelProvider`, para que o
 * provedor possa ser trocado sem mexer nas ferramentas.
 */
export interface HavenaToolDefinition<TInput extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  input: TInput;
  access: { resource: Resource; action: Action };
}

export function defineHavenaTool<TInput extends z.ZodType>(
  tool: HavenaToolDefinition<TInput>,
): HavenaToolDefinition<TInput> {
  return tool;
}

export const havenaTools = {
  searchCustomers: defineHavenaTool({
    name: 'customers.search',
    description: 'Busca clientes por nome, cidade ou região.',
    input: z.object({
      query: z.string().min(1).max(200),
      regionId: z.uuid().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    access: { resource: 'customer', action: 'read' },
  }),
  createCustomer: defineHavenaTool({
    name: 'customers.create',
    description: 'Cadastra um novo cliente. Exige confirmação do usuário.',
    input: writableCustomerSchema,
    access: { resource: 'customer', action: 'create' },
  }),
  searchProducts: defineHavenaTool({
    name: 'products.search',
    description: 'Busca produtos do catálogo por nome, SKU ou categoria.',
    input: z.object({
      query: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    access: { resource: 'product', action: 'read' },
  }),
} as const;

export type HavenaToolName = (typeof havenaTools)[keyof typeof havenaTools]['name'];

/** Decide se a Havena pode executar a ferramenta para este usuário/plataforma. */
export function authorizeHavenaTool(
  tool: HavenaToolDefinition,
  ctx: Omit<AccessContext, 'channel'>,
): AccessDecision {
  return can({ ...ctx, channel: 'havena' }, tool.access.resource, tool.access.action);
}

/** Mensagem trocada com o modelo. Áudio é convertido em texto antes de chegar aqui. */
export interface HavenaMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
}

/** Interface do provedor de IA; implementações concretas virão em fase própria. */
export interface HavenaModelProvider {
  readonly id: string;
  /** Indica se o modelo roda no próprio dispositivo (ex.: modelo local no Automotive). */
  readonly onDevice: boolean;
  complete(input: {
    messages: HavenaMessage[];
    tools: HavenaToolDefinition[];
  }): Promise<
    | { type: 'message'; content: string }
    | { type: 'tool_call'; toolName: string; arguments: unknown }
  >;
}
