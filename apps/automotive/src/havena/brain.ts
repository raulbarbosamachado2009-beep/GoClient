import { NVIDIA_API_KEY } from '../integrations/env';

/**
 * Cérebro da Havena: um modelo de linguagem na nuvem (NVIDIA, plano gratuito) que entende o
 * pedido e chama **ferramentas** do app. As ferramentas estão em `tools.ts`; aqui só a
 * conversa com o modelo.
 *
 * Modelo escolhido pelo teste real com a chave (workflow "NVIDIA check", 22/11/2026):
 * Nemotron 3.5 Super acertou 4/4 ações em ~3,5 s; Mistral Large 4 também 4/4 (~6 s), fica de
 * reserva. Sem internet ou sem chave, a Havena usa os comandos fixos (`offline.ts`).
 */
const BASE = 'https://integrate.api.nvidia.com/v1';
const MODELS = ['nvidia/nemotron-3.5-super-vl-120b-a12b', 'mistralai/mistral-large-4-1t-a52b'];

export const BRAIN_ENABLED = NVIDIA_API_KEY.length > 0;

export interface ToolSpec {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

export type Message =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: {
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface ModelReply {
  text: string;
  calls: { id: string; name: string; args: Record<string, unknown> }[];
  raw: Message;
}

export async function ask(messages: Message[], tools: ToolSpec[]): Promise<ModelReply> {
  let lastError: Error | null = null;
  for (const model of MODELS) {
    try {
      const ctrl = new AbortController();
      // Dirigindo, esperar mais que isso parece que o Lucas não ouviu: tenta o modelo reserva.
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 500,
          messages,
          tools: tools.map((t) => ({ type: 'function', function: t })),
          tool_choice: 'auto',
        }),
      }).finally(() => clearTimeout(timer));
      if (!res.ok) throw new Error(`IA: erro ${res.status}`);
      const json = (await res.json()) as {
        choices?: {
          message?: {
            content?: string | null;
            tool_calls?: { id: string; function?: { name?: string; arguments?: string } }[];
          };
        }[];
      };
      const msg = json.choices?.[0]?.message;
      const calls =
        msg?.tool_calls?.map((c) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(c.function?.arguments || '{}');
          } catch {}
          return { id: c.id, name: c.function?.name ?? '', args };
        }) ?? [];
      return {
        text: stripThinking(msg?.content ?? ''),
        calls,
        raw: {
          role: 'assistant',
          content: msg?.content ?? null,
          tool_calls: msg?.tool_calls?.map((c) => ({
            id: c.id,
            type: 'function' as const,
            function: { name: c.function?.name ?? '', arguments: c.function?.arguments ?? '{}' },
          })),
        },
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new Error('IA indisponível');
}

/** Alguns modelos mandam o raciocínio entre <think>…</think>: não é para falar em voz alta. */
function stripThinking(t: string) {
  return t.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}
