import type { Channel, Platform } from './platform';

export const ROLES = ['owner', 'admin', 'seller', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const RESOURCES = [
  'customer',
  'product',
  'region',
  'visit',
  'route',
  'settings',
  'integration',
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = ['read', 'create', 'update', 'delete'] as const;
export type Action = (typeof ACTIONS)[number];

export interface AccessContext {
  role: Role;
  platform: Platform;
  channel: Channel;
}

export type DenialReason =
  | 'role_not_allowed'
  /** Regra 3: rotas são montadas no celular; no Automotive só são lidas e iniciadas. */
  | 'automotive_route_build_blocked';

export type AccessDecision =
  | {
      allowed: true;
      /**
       * Escritas feitas pela Havena exigem confirmação explícita do usuário antes de
       * serem gravadas (voz ou toque). A API recusa a execução sem essa confirmação.
       */
      requiresConfirmation: boolean;
    }
  | { allowed: false; reason: DenialReason };

/** Matriz de papéis: o que cada papel pode fazer, independentemente da plataforma. */
const ROLE_MATRIX: Record<Role, Partial<Record<Resource, readonly Action[]>>> = {
  owner: Object.fromEntries(RESOURCES.map((r) => [r, ACTIONS])),
  admin: Object.fromEntries(RESOURCES.map((r) => [r, ACTIONS])),
  seller: {
    customer: ['read', 'create', 'update'],
    product: ['read', 'create', 'update'],
    region: ['read'],
    visit: ['read', 'create', 'update', 'delete'],
    route: ['read', 'create', 'update', 'delete'],
    settings: ['read'],
    integration: ['read'],
  },
  viewer: Object.fromEntries(RESOURCES.map((r) => [r, ['read'] as const])),
};

/**
 * Ponto único de decisão de acesso. Usado pela API (autoritativo) e pelas
 * interfaces (para esconder ou desabilitar ações não permitidas).
 */
export function can(ctx: AccessContext, resource: Resource, action: Action): AccessDecision {
  const allowedActions = ROLE_MATRIX[ctx.role][resource] ?? [];
  if (!allowedActions.includes(action)) {
    return { allowed: false, reason: 'role_not_allowed' };
  }

  const isWrite = action !== 'read';

  // Regra 1 (cadastro manual bloqueado no Automotive) foi retirada em 2026-11-24 a pedido do
  // dono do produto: a multimídia também cadastra clientes e produtos à mão.
  // Regra 2 — escritas pela Havena (canal `havena`) exigem confirmação (ver o retorno).

  // Regra 3 — rotas só são montadas (criadas, alteradas, excluídas) no celular. Na
  // multimídia o usuário só escolhe e começa uma rota já montada (leitura).
  if (isWrite && ctx.platform === 'automotive' && resource === 'route') {
    return { allowed: false, reason: 'automotive_route_build_blocked' };
  }

  return { allowed: true, requiresConfirmation: isWrite && ctx.channel === 'havena' };
}
