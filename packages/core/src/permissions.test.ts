import { describe, expect, it } from 'vitest';
import { authorizeHavenaTool, havenaTools } from './havena';
import { can } from './permissions';

describe('can()', () => {
  it('Regra 1 retirada: o Automotive cria e edita clientes e produtos à mão', () => {
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'manual' }, 'customer', 'create'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
    expect(
      can({ role: 'owner', platform: 'automotive', channel: 'manual' }, 'product', 'update'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it('Regra 3: rotas só são montadas no celular; a multimídia lê e reordena', () => {
    for (const action of ['create', 'update', 'delete'] as const) {
      for (const channel of ['manual', 'havena'] as const) {
        expect(can({ role: 'owner', platform: 'automotive', channel }, 'route', action)).toEqual({
          allowed: false,
          reason: 'automotive_route_build_blocked',
        });
      }
    }
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'manual' }, 'route', 'read'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
    expect(
      can({ role: 'seller', platform: 'mobile', channel: 'manual' }, 'route', 'create'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
    // Reordenar as paradas é liberado no carro (com confirmação se vier da Havena).
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'manual' }, 'route', 'reorder'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'havena' }, 'route', 'reorder'),
    ).toEqual({ allowed: true, requiresConfirmation: true });
    expect(
      can({ role: 'viewer', platform: 'automotive', channel: 'manual' }, 'route', 'reorder'),
    ).toEqual({ allowed: false, reason: 'role_not_allowed' });
  });

  it('permite leitura no Automotive', () => {
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'manual' }, 'customer', 'read'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it('permite criação manual no Mobile', () => {
    expect(
      can({ role: 'seller', platform: 'mobile', channel: 'manual' }, 'customer', 'create'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it('Regra 2: Havena pode criar cliente no Automotive, com confirmação', () => {
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'havena' }, 'customer', 'create'),
    ).toEqual({ allowed: true, requiresConfirmation: true });
  });

  it('Havena respeita o papel do usuário', () => {
    expect(
      can({ role: 'viewer', platform: 'automotive', channel: 'havena' }, 'customer', 'create'),
    ).toEqual({ allowed: false, reason: 'role_not_allowed' });
  });

  it('vendedor não exclui clientes', () => {
    expect(
      can({ role: 'seller', platform: 'mobile', channel: 'manual' }, 'customer', 'delete'),
    ).toEqual({ allowed: false, reason: 'role_not_allowed' });
  });
});

describe('authorizeHavenaTool()', () => {
  it('leituras não exigem confirmação', () => {
    expect(
      authorizeHavenaTool(havenaTools.searchCustomers, { role: 'seller', platform: 'automotive' }),
    ).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it('criação exige confirmação', () => {
    expect(
      authorizeHavenaTool(havenaTools.createCustomer, { role: 'seller', platform: 'automotive' }),
    ).toEqual({ allowed: true, requiresConfirmation: true });
  });
});
