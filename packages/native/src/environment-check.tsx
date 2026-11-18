import type { Platform } from '@goclient/core';
import { spacing } from '@goclient/design-tokens';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createNativeApiClient } from './api';
import { Surface, Text } from './primitives';
import { useScale } from './scale';

type Row = { label: string; tone: 'secondary' | 'success' | 'danger'; detail: string };

/**
 * Bloco de diagnóstico do ambiente (comunicação App → API e permissões efetivas).
 * Usado apenas nas telas provisórias de desenvolvimento.
 */
export function EnvironmentCheck({ platform }: { platform: Platform }) {
  const scale = useScale();
  const [rows, setRows] = useState<Row[]>([
    { label: 'API', tone: 'secondary', detail: 'Verificando…' },
  ]);

  useEffect(() => {
    const { baseUrl, client } = createNativeApiClient(platform);
    (async () => {
      try {
        const health = await (await client.health.$get()).json();
        const meResponse = await client.v1.me.$get();
        if (!meResponse.ok) throw new Error(`HTTP ${meResponse.status}`);
        const me = await meResponse.json();
        setRows([
          {
            label: 'API',
            tone: health.status === 'ok' ? 'success' : 'danger',
            detail: `${baseUrl} · v${health.version}`,
          },
          {
            label: 'Criar cliente manualmente',
            tone: me.permissions.customer.create ? 'success' : 'secondary',
            detail: me.permissions.customer.create ? 'Permitido' : 'Bloqueado nesta plataforma',
          },
        ]);
      } catch (error) {
        setRows([
          { label: 'API', tone: 'danger', detail: `Sem resposta de ${baseUrl} (${String(error)})` },
        ]);
      }
    })();
  }, [platform]);

  return (
    <View style={{ gap: spacing[3] }}>
      {rows.map((row) => (
        <Surface
          key={row.label}
          style={{
            minHeight: scale.minTouchTarget,
            paddingHorizontal: spacing[5],
            paddingVertical: spacing[3],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[4],
          }}
        >
          <Text variant="headline">{row.label}</Text>
          <Text variant="caption" tone={row.tone} style={{ flexShrink: 1, textAlign: 'right' }}>
            {row.detail}
          </Text>
        </Surface>
      ))}
    </View>
  );
}
