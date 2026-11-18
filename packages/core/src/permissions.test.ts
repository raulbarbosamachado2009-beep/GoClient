import { describe, expect, it } from 'vitest';
import { authorizeHavenaTool, havenaTools } from './havena';
import { can } from './permissions';

describe('can()', () => {
  it('Regra 1: bloqueia criação manual de cliente no Automotive', () => {
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'manual' }, 'customer', 'create'),
    ).toEqual({ allowed: false, reason: 'automotive_manual_edit_blocked' });
    expect(
      can({ role: 'owner', platform: 'automotive', channel: 'manual' }, 'product', 'update'),
    ).toEqual({ allowed: false, reason: 'automotive_manual_edit_blocked' });
  });

  it('Regra 1: permite leitura no Automotive', () => {
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'manual' }, 'customer', 'read'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
  });

  it('Regra 1: permite criação manual no Mobile', () => {
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

  it('rotas podem ser organizadas manualmente no Automotive', () => {
    expect(
      can({ role: 'seller', platform: 'automotive', channel: 'manual' }, 'route', 'update'),
    ).toEqual({ allowed: true, requiresConfirmation: false });
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
