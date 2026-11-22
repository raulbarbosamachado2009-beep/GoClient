import type { useRouter } from 'expo-router';
import { openWhatsApp } from '../integrations/contact';
import { kyteAgent, kyteAgentAvailable, kyteLogged } from '../kyte/agent';
import type { useStops } from '../map/stops';
import { CLIENTS } from '../mocks/data';
import type { usePrototype } from '../prototype/state';
import type { useSpotify } from '../spotify/provider';
import type { ToolSpec } from './brain';

/**
 * Ferramentas da Havena: tudo o que ela pode fazer no app. Ações que mudam algo (rota,
 * WhatsApp, cadastros no Kyte) **sempre pedem confirmação**: a ferramenta devolve um resumo e a
 * Havena pergunta antes. Controles de música são imediatos.
 */
export interface HavenaDeps {
  spotify: ReturnType<typeof useSpotify>;
  proto: ReturnType<typeof usePrototype>;
  stops: ReturnType<typeof useStops>;
  router: ReturnType<typeof useRouter>;
}

export type ToolOutcome =
  | { result: unknown }
  /** Precisa do "sim" da pessoa: `summary` é a pergunta; `run` faz e devolve a fala final. */
  | { confirm: { summary: string; run: () => Promise<string> } };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'musica_controle',
    description: 'Controla a música que está tocando: próxima, anterior, pausar ou continuar.',
    parameters: {
      type: 'object',
      properties: {
        acao: { type: 'string', enum: ['proxima', 'anterior', 'pausar', 'continuar'] },
      },
      required: ['acao'],
    },
  },
  {
    name: 'musica_tocar',
    description:
      'Procura uma música no Spotify (qualquer uma, não só as curtidas) e toca agora, ou põe na fila.',
    parameters: {
      type: 'object',
      properties: {
        busca: { type: 'string', description: 'Nome da música e, se houver, do artista' },
        fila: { type: 'boolean', description: 'true = pôr na fila em vez de tocar agora' },
      },
      required: ['busca'],
    },
  },
  {
    name: 'cliente_buscar',
    description:
      'Procura um cliente pelo nome no Kyte e devolve nome, telefone e endereço. Use antes de pôr na rota ou mandar WhatsApp.',
    parameters: { type: 'object', properties: { nome: { type: 'string' } }, required: ['nome'] },
  },
  {
    name: 'rota_colocar',
    description:
      'Põe um cliente na rota do dia, ou traça a rota até ele agora (agora=true). Precisa do endereço (busque o cliente antes).',
    parameters: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        endereco: { type: 'string' },
        telefone: { type: 'string' },
        agora: { type: 'boolean' },
      },
      required: ['nome', 'endereco'],
    },
  },
  {
    name: 'rota_do_dia',
    description: 'Mostra a rota do dia no Mapa (todas as paradas, na melhor ordem).',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'whatsapp',
    description:
      'Abre o WhatsApp na conversa do cliente com a mensagem pronta (a pessoa toca em enviar). Precisa do telefone (busque o cliente antes).',
    parameters: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        telefone: { type: 'string' },
        mensagem: { type: 'string' },
      },
      required: ['telefone', 'mensagem'],
    },
  },
  {
    name: 'kyte_novo_cliente',
    description: 'Cadastra um cliente novo no Kyte.',
    parameters: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        telefone: { type: 'string' },
        endereco: { type: 'string' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'kyte_novo_produto',
    description: 'Cadastra um produto novo no Kyte.',
    parameters: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        preco: { type: 'string', description: 'Preço de venda, ex.: 25,00' },
      },
      required: ['nome', 'preco'],
    },
  },
  {
    name: 'vendas_resumo',
    description: 'Quanto foi vendido hoje, ontem, na semana e no mês (Histórico do Kyte).',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'abrir_tela',
    description: 'Abre uma tela do app.',
    parameters: {
      type: 'object',
      properties: { tela: { type: 'string', enum: ['mapa', 'musica', 'kyte', 'ajustes'] } },
      required: ['tela'],
    },
  },
];

const kyteOn = () => kyteAgentAvailable() && kyteLogged();

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  d: HavenaDeps,
): Promise<ToolOutcome> {
  switch (name) {
    case 'musica_controle': {
      const a = str(args.acao);
      if (a === 'proxima') d.proto.next();
      else if (a === 'anterior') d.proto.previous();
      else if (a === 'pausar') d.proto.playing && d.proto.togglePlaying();
      else if (a === 'continuar') !d.proto.playing && d.proto.togglePlaying();
      return { result: 'feito' };
    }
    case 'musica_tocar': {
      const q = str(args.busca);
      if (!d.spotify.enabled || !d.spotify.active)
        return { result: 'O Spotify não está conectado neste aparelho (modo de demonstração).' };
      const found = await d.spotify.call<{
        tracks?: { items?: { uri: string; name: string; artists?: { name: string }[] }[] };
      }>(`/search?type=track&limit=1&q=${encodeURIComponent(q)}`);
      const t = found?.tracks?.items?.[0];
      if (!t) return { result: `Não achei "${q}" no Spotify.` };
      const label = `${t.name} — ${t.artists?.map((a) => a.name).join(', ') ?? ''}`;
      if (args.fila) {
        await d.spotify.call(`/me/player/queue?uri=${encodeURIComponent(t.uri)}`, {
          method: 'POST',
        });
        return { result: `Na fila: ${label}` };
      }
      await d.spotify.play({ uris: [t.uri] });
      return { result: `Tocando: ${label}` };
    }
    case 'cliente_buscar': {
      const nome = str(args.nome);
      if (kyteOn()) {
        const r = await kyteAgent.findClient(nome);
        if (r.client) return { result: r.client };
        if (r.matches?.length) return { result: { varios: r.matches } };
        return { result: `Nenhum cliente com "${nome}" no Kyte.` };
      }
      const q = norm(nome);
      const hits = CLIENTS.filter((c) => norm(`${c.tradeName} ${c.name}`).includes(q));
      if (hits.length === 1) {
        const c = hits[0];
        return {
          result: {
            name: c?.tradeName,
            phone: c?.phone,
            address: `${c?.address}, ${c?.district.split(' · ').slice(1).join(' ')}`,
            aviso: 'cliente de exemplo (Kyte não conectado)',
          },
        };
      }
      if (hits.length > 1) return { result: { varios: hits.map((c) => c.tradeName) } };
      return { result: `Nenhum cliente com "${nome}".` };
    }
    case 'rota_colocar': {
      const stop = { name: str(args.nome), address: str(args.endereco), phone: str(args.telefone) };
      if (!stop.address) return { result: 'Sem endereço: busque o cliente antes.' };
      const now = !!args.agora;
      return {
        confirm: {
          summary: now
            ? `Traço a rota até ${stop.name}, em ${stop.address}, agora?`
            : `Coloco ${stop.name}, em ${stop.address}, na rota do dia?`,
          run: async () => {
            if (now) {
              d.stops.goNow(stop);
              return `Pronto, traçando a rota até ${stop.name}.`;
            }
            d.stops.add(stop);
            return `${stop.name} está na rota do dia.`;
          },
        },
      };
    }
    case 'rota_do_dia':
      d.stops.showDay();
      return { result: 'Mostrando a rota do dia.' };
    case 'whatsapp': {
      const phone = str(args.telefone);
      const msg = str(args.mensagem);
      const who = str(args.nome) || phone;
      if (!phone) return { result: 'Sem telefone: busque o cliente antes.' };
      return {
        confirm: {
          summary: `Abro o WhatsApp de ${who} com a mensagem: "${msg}"?`,
          run: async () =>
            openWhatsApp(phone, msg)
              ? 'Abri o WhatsApp com a mensagem pronta. É só tocar em enviar.'
              : 'Esse telefone não parece válido.',
        },
      };
    }
    case 'kyte_novo_cliente': {
      if (!kyteOn()) return { result: 'O Kyte não está conectado neste aparelho.' };
      const c = { name: str(args.nome), phone: str(args.telefone), address: str(args.endereco) };
      return {
        confirm: {
          summary: `Cadastro o cliente ${c.name}${c.phone ? `, telefone ${c.phone}` : ''}${c.address ? `, endereço ${c.address}` : ''} no Kyte?`,
          run: async () => {
            await kyteAgent.createClient(c);
            return `Cadastrei ${c.name} no Kyte.`;
          },
        },
      };
    }
    case 'kyte_novo_produto': {
      if (!kyteOn()) return { result: 'O Kyte não está conectado neste aparelho.' };
      const p = { name: str(args.nome), price: str(args.preco) };
      return {
        confirm: {
          summary: `Cadastro o produto ${p.name} por R$ ${p.price} no Kyte?`,
          run: async () => {
            await kyteAgent.createProduct(p);
            return `Cadastrei ${p.name} no Kyte.`;
          },
        },
      };
    }
    case 'vendas_resumo': {
      if (!kyteOn()) return { result: 'O Kyte não está conectado neste aparelho.' };
      return { result: await kyteAgent.salesSummary() };
    }
    case 'abrir_tela': {
      const t = str(args.tela);
      const href =
        t === 'musica'
          ? '/musica'
          : t === 'kyte'
            ? '/kyte'
            : t === 'ajustes'
              ? '/configuracoes'
              : '/mapa';
      d.router.replace(href);
      return { result: 'aberto' };
    }
    default:
      return { result: `Ferramenta desconhecida: ${name}` };
  }
}
