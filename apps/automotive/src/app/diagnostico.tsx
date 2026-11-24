import { getRecordingPermissionsAsync } from 'expo-audio';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SpotifyRemote } from '../../modules/spotify-remote';
import { MODELS } from '../havena/brain';
import { NVIDIA_API_KEY, ORS_API_KEY, SPOTIFY_CLIENT_ID } from '../integrations/env';
import { kyteLogged } from '../kyte/agent';
import { REDIRECT_URI } from '../spotify/auth';
import { useSpotify } from '../spotify/provider';
import { spacing, useColors } from '../theme';
import { Button, Icon, Text } from '../ui/primitives';

/**
 * Diagnóstico das integrações (Ajustes → Diagnóstico). Testa no próprio aparelho, de verdade,
 * cada peça que o app usa e mostra o erro exato: permissões, reconhecimento e voz do Lucas,
 * IA, mapa, rotas, Spotify e Kyte. "Compartilhar relatório" manda o texto (sem chaves nem
 * senhas) para quem estiver ajudando a corrigir.
 */
type Level = 'ok' | 'warn' | 'fail' | 'wait';
interface Check {
  id: string;
  title: string;
  level: Level;
  detail: string;
}

const short = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

async function timed(url: string, init?: RequestInit, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { res, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

const perm = (s: { granted: boolean; canAskAgain: boolean }): [Level, string] =>
  s.granted
    ? ['ok', 'Liberada']
    : s.canAskAgain
      ? ['warn', 'Ainda não liberada (o app pode pedir)']
      : ['fail', 'Recusada de vez: libere em Ajustes do aparelho → Apps → GoClient → Permissões'];

export default function DiagnosticsScreen() {
  const router = useRouter();
  const c = useColors();
  const sp = useSpotify();
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const put = useCallback((ck: Check) => {
    setChecks((cur) => {
      const i = cur.findIndex((x) => x.id === ck.id);
      if (i < 0) return [...cur, ck];
      const next = [...cur];
      next[i] = ck;
      return next;
    });
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setChecks([]);
    const step = async (id: string, title: string, fn: () => Promise<[Level, string]>) => {
      put({ id, title, level: 'wait', detail: 'Testando…' });
      try {
        const [level, detail] = await fn();
        put({ id, title, level, detail });
      } catch (e) {
        put({ id, title, level: 'fail', detail: short(e) });
      }
    };

    await step('loc', 'Permissão de localização', async () =>
      perm(await Location.getForegroundPermissionsAsync()),
    );
    await step('mic', 'Permissão de microfone', async () =>
      perm(await getRecordingPermissionsAsync()),
    );
    await step('stt', 'Reconhecimento de voz (Lucas ouvir)', async () => {
      if (Platform.OS !== 'android') return ['warn', 'Só no app Android'];
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
      const def = ExpoSpeechRecognitionModule.getDefaultRecognitionService().packageName;
      const list = services.join(', ') || 'nenhum';
      if (!available || services.length === 0)
        return [
          'fail',
          `Este aparelho não tem serviço de reconhecimento de voz. Instale/atualize o app Google. Serviços: ${list}`,
        ];
      return ['ok', `Padrão: ${def || '—'}. Instalados: ${list}`];
    });
    await step('tts', 'Voz do Lucas (falar)', async () => {
      const voices = await Promise.race([
        Speech.getAvailableVoicesAsync(),
        new Promise<never>((_, r) =>
          setTimeout(() => r(new Error('O motor de voz não respondeu')), 4000),
        ),
      ]);
      const pt = voices.filter((v) =>
        v.language.toLowerCase().replace('_', '-').startsWith('pt-br'),
      );
      if (pt.length === 0)
        return ['fail', `Nenhuma voz em português instalada (${voices.length} vozes no total)`];
      return ['ok', `${pt.length} vozes em português`];
    });
    await step('ai', 'Inteligência do Lucas (NVIDIA)', async () => {
      if (!NVIDIA_API_KEY) return ['fail', 'Sem chave nesta compilação'];
      const { res, ms } = await timed(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODELS[0],
            max_tokens: 5,
            messages: [{ role: 'user', content: 'diga ok' }],
          }),
        },
        20000,
      );
      if (!res.ok) return ['fail', `Erro ${res.status}: ${(await res.text()).slice(0, 120)}`];
      return [ms > 8000 ? 'warn' : 'ok', `Respondeu em ${(ms / 1000).toFixed(1)} s`];
    });
    await step('map', 'Mapa (biblioteca e estilo)', async () => {
      const lib = await timed('https://unpkg.com/maplibre-gl@5.24.1/dist/maplibre-gl.js', {
        method: 'HEAD',
      }).catch(() => null);
      const alt = lib?.res.ok
        ? null
        : await timed('https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.1/dist/maplibre-gl.js', {
            method: 'HEAD',
          }).catch(() => null);
      const style = await timed('https://tiles.openfreemap.org/styles/liberty').catch(() => null);
      const libOk = lib?.res.ok || alt?.res.ok;
      if (!libOk) return ['fail', 'Não baixou a biblioteca do mapa (unpkg e jsDelivr)'];
      if (!style?.res.ok)
        return ['fail', `Estilo do OpenFreeMap: ${style ? style.res.status : 'sem resposta'}`];
      return ['ok', `Biblioteca ${lib?.res.ok ? 'unpkg' : 'jsDelivr'} · estilo em ${style.ms} ms`];
    });
    await step('ors', 'Rotas e endereços (OpenRouteService)', async () => {
      if (!ORS_API_KEY) return ['fail', 'Sem chave nesta compilação: o mapa fica em demonstração'];
      const { res, ms } = await timed(
        'https://api.heigit.org/geocode/search?text=Campinas&size=1&boundary.country=BR',
        { headers: { Authorization: ORS_API_KEY } },
      );
      if (!res.ok) return ['fail', `Erro ${res.status}: ${(await res.text()).slice(0, 120)}`];
      return ['ok', `Respondeu em ${ms} ms`];
    });
    await step('sp-id', 'Spotify: configuração', async () => {
      if (!SPOTIFY_CLIENT_ID) return ['fail', 'Sem Client ID nesta compilação'];
      return ['ok', `Client ID …${SPOTIFY_CLIENT_ID.slice(-4)} · retorno ${REDIRECT_URI}`];
    });
    await step('sp-login', 'Spotify: conta no GoClient', async () => {
      if (!sp.active) return ['warn', 'Nenhuma conta conectada (Ajustes → Spotify)'];
      const me = await sp.call<{ id: string; product?: string }>('/me');
      if (!me) return ['fail', 'A Web API não respondeu'];
      return [
        me.product === 'premium' ? 'ok' : 'warn',
        `${sp.active.name} · plano ${me.product ?? '?'}${me.product === 'premium' ? '' : ' (tocar exige Premium)'}`,
      ];
    });
    await step('sp-app', 'Spotify: app no aparelho (App Remote)', async () => {
      const r = SpotifyRemote;
      if (!r) return ['fail', 'Módulo nativo ausente nesta compilação'];
      if (!r.isInstalled()) return ['fail', 'O app do Spotify não está instalado neste aparelho'];
      if (r.isConnected()) return ['ok', 'Conectado'];
      try {
        await r.connect(SPOTIFY_CLIENT_ID, REDIRECT_URI, true);
        return ['ok', 'Conectou agora'];
      } catch (e) {
        const code = (e as Error & { code?: string }).code ?? '';
        return ['fail', `${code} ${short(e)}`.trim()];
      }
    });
    await step('kyte', 'Kyte', async () => {
      const { res, ms } = await timed('https://web.kyteapp.com/', { method: 'HEAD' });
      return [
        kyteLogged() ? 'ok' : 'warn',
        `${kyteLogged() ? 'Conta conectada' : 'Sem login no Kyte (aba Kyte → Continuar com e-mail)'} · site respondeu ${res.status} em ${ms} ms`,
      ];
    });
    setRunning(false);
  }, [put, sp]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: roda uma vez ao abrir
  useEffect(() => {
    void run();
  }, []);

  const report = () =>
    Share.share({
      message: [
        'GoClient · diagnóstico',
        new Date().toLocaleString('pt-BR'),
        ...checks.map((x) => `${x.level.toUpperCase()} · ${x.title}: ${x.detail}`),
      ].join('\n'),
    }).catch(() => {});

  const color = (l: Level) =>
    l === 'ok' ? '#30D158' : l === 'warn' ? '#FF9F0A' : l === 'fail' ? '#FF453A' : c.textTertiary;
  const icon = (l: Level) =>
    l === 'ok'
      ? 'checkmark-circle'
      : l === 'warn'
        ? 'alert-circle'
        : l === 'fail'
          ? 'close-circle'
          : 'ellipsis-horizontal-circle';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={styles.bar}>
        <Button label="Voltar" icon="chevron-back" variant="gray" onPress={() => router.back()} />
        <Text variant="title2" style={{ flex: 1 }}>
          Diagnóstico
        </Text>
        <Button
          label="Testar de novo"
          icon="refresh"
          variant="gray"
          disabled={running}
          onPress={run}
        />
        <Button label="Compartilhar" icon="share-outline" onPress={report} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {checks.map((x) => (
          <View key={x.id} style={[styles.row, { backgroundColor: c.grouped }]}>
            <Icon name={icon(x.level)} size={40} color={color(x.level)} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="headline">{x.title}</Text>
              <Text variant="callout" tone="secondary">
                {x.detail}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  list: { paddingHorizontal: spacing[8], paddingBottom: spacing[16], gap: spacing[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    padding: spacing[5],
    borderRadius: 28,
  },
});
