'use client';

import { useEffect, useState } from 'react';
import { API_URL, api } from '@/lib/api';

type Check = { label: string; status: 'pending' | 'ok' | 'error'; detail: string };

/** Verifica, a partir do navegador, a comunicação Web → API e as permissões compartilhadas. */
export function EnvironmentCheck() {
  const [checks, setChecks] = useState<Check[]>([
    { label: 'API', status: 'pending', detail: API_URL },
    { label: 'Sessão', status: 'pending', detail: 'Verificando…' },
  ]);

  useEffect(() => {
    (async () => {
      const next: Check[] = [];
      try {
        const health = await (await api.health.$get()).json();
        next.push({
          label: 'API',
          status: health.status === 'ok' ? 'ok' : 'error',
          detail: `${API_URL} · v${health.version} · banco ${health.database.driver}`,
        });
        const meResponse = await api.v1.me.$get();
        if (!meResponse.ok) throw new Error(`HTTP ${meResponse.status}`);
        const me = await meResponse.json();
        const canCreate = me.permissions.customer.create ? 'permitido' : 'bloqueado';
        next.push({
          label: 'Sessão',
          status: 'ok',
          detail: `papel ${me.role} · plataforma ${me.platform} · criar cliente: ${canCreate}`,
        });
      } catch (error) {
        next.push({
          label: 'API',
          status: 'error',
          detail: `Sem resposta de ${API_URL} (${String(error)})`,
        });
      }
      setChecks(next);
    })();
  }, []);

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gap: 'var(--gc-space-3)',
      }}
    >
      {checks.map((check) => (
        <li
          key={check.label}
          style={{
            background: 'var(--gc-color-surface)',
            border: '1px solid var(--gc-color-border)',
            borderRadius: 'var(--gc-radius-md)',
            padding: 'var(--gc-space-4) var(--gc-space-5)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'var(--gc-space-4)',
          }}
        >
          <span style={{ fontWeight: 600 }}>{check.label}</span>
          <span
            data-status={check.status}
            style={{
              color:
                check.status === 'ok'
                  ? 'var(--gc-color-success)'
                  : check.status === 'error'
                    ? 'var(--gc-color-danger)'
                    : 'var(--gc-color-text-secondary)',
              fontSize: 15,
              textAlign: 'right',
            }}
          >
            {check.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}
