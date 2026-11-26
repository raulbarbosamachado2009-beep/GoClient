import * as Location from 'expo-location';
import type { useRouter } from 'expo-router';
import { composeWhatsApp } from '../integrations/contact';
import { MAPS_ENABLED } from '../integrations/env';
import { kyteAgent, kyteAgentAvailable, kyteLogged } from '../kyte/agent';
import { cachedCustomers, customerAddress, restoreKyteCache } from '../kyte/store';
import { type LatLng, searchPlaces } from '../map/routing';
import type { useStops } from '../map/stops';
import { getLastPosition } from '../map/use-live-map';
import { CLIENTS } from '../mocks/data';
import type { usePrototype } from '../prototype/state';
import type { ToolSpec } from './brain';
import { closest } from './fuzzy';
import { planNotify } from './notify';
import { say } from './voice';

/**
 * Ferramentas da Havena: tudo o que ela pode fazer no app. Ações que mudam algo (rota,
 * WhatsApp, cadastros no Kyte) **sempre pedem confirmação**: a ferramenta devolve um resumo e a
 * Havena pergunta antes.
 */
export interface HavenaDeps {
  proto: ReturnType<typeof usePrototype>;
  stops: ReturnType<typeof useStops>;
  router: ReturnType<typeof useRouter>;
}

export type ToolOutcome =
  | { result: unknown }
  /** Precisa do "sim" da pessoa: `summary` é a pergunta; `run` faz e devolve a fala final. */
  | { confirm: { summary: string; run: () => Promise<Done> } };

/** Fala final de uma ação; `after` roda quando a fala termina (ex.: fechar o Lucas). */
export type Done = string | { say: string; after?: () => void };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'cliente_buscar',
    description:
      'Procura um cliente pelo nome no Kyte e devolve nome, telefone e endereço. Use antes de pôr na rota ou mandar WhatsApp.',
    parameters: { type: 'object', properties: { nome: { type: 'string' } }, required: ['nome'] },
  },
  {
    name: 'lugar_buscar',
    description:
      'Procura um lugar no mapa (rua, avenida, bairro, cidade, loja, ponto conhecido) perto do carro e devolve até 4 opções com endereço completo e distância. Use para destinos que não são clientes, ou quando cliente_buscar não achar nada.',
    parameters: {
      type: 'object',
      properties: {
        busca: {
          type: 'string',
          description: 'O lugar como a pessoa disse, corrigido se a fala saiu errada',
        },
      },
      required: ['busca'],
    },
  },
  {
    name: 'rota_colocar',
    description:
      'Põe um cliente ou lugar na rota do dia, ou traça a rota até ele agora (agora=true). Precisa do endereço (use cliente_buscar ou lugar_buscar antes).',
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
    name: 'avisar_chegada',
    description:
      'Avisa um cliente pelo WhatsApp que estamos a caminho, com o tempo de chegada pela rota. Sem nome = o próximo cliente da rota ativa. A mensagem é escrita pelo app (humanizada) e a pessoa confirma antes. Use para "avisa o próximo cliente que estamos indo" ou "avisa o Adão do Jardim Selma que chego em 10 minutos".',
    parameters: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome do cliente; vazio para o próximo da rota' },
        bairro: { type: 'string' },
        minutos: { type: 'number', description: 'Só se a pessoa disse o tempo' },
      },
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
      properties: { tela: { type: 'string', enum: ['mapa', 'kyte', 'whatsapp', 'ajustes'] } },
      required: ['tela'],
    },
  },
];

const kyteOn = () => kyteAgentAvailable() && kyteLogged();

async function carPosition(): Promise<LatLng | null> {
  const p = getLastPosition();
  if (p) return p;
  const last = await Location.getLastKnownPositionAsync().catch(() => null);
  return last ? { latitude: last.coords.latitude, longitude: last.coords.longitude } : null;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  d: HavenaDeps,
): Promise<ToolOutcome> {
  switch (name) {
    case 'cliente_buscar': {
      const nome = str(args.nome);
      await restoreKyteCache();
      const known = cachedCustomers();
      if (known?.length) {
        // Lista já lida do Kyte: busca na hora, tolerando nomes mal ouvidos.
        const q = norm(nome);
        const hits = known.filter((c) => norm(c.name).includes(q));
        const pickOne = (c: (typeof known)[number]) => ({
          result: { name: c.name, phone: c.phone, address: customerAddress(c) },
        });
        const exact = hits.filter((c) => norm(c.name) === q);
        if (exact.length === 1 && exact[0]) return pickOne(exact[0]);
        if (hits.length === 1 && hits[0]) return pickOne(hits[0]);
        if (hits.length > 1) return { result: { varios: hits.slice(0, 8).map((c) => c.name) } };
        const near = closest(
          nome,
          known.map((c) => c.name),
        );
        if (near.length) return { result: { nenhum_exato: nome, parecidos: near } };
        return {
          result: `Nenhum cliente com "${nome}" no Kyte. Pode ser um lugar: tente lugar_buscar.`,
        };
      }
      if (kyteOn()) {
        const r = await kyteAgent.findClient(nome);
        if (r.client) return { result: r.client };
        if (r.matches?.length) return { result: { varios: r.matches } };
        // Nada com esse texto: procura nomes parecidos (fala mal entendida).
        const start = norm(nome)
          .replace(/^(barbearia|barber)\s+/, '')
          .slice(0, 2);
        const pool = new Set<string>();
        for (const q of ['', start]) {
          const l = await kyteAgent.listClients(q).catch(() => ({ names: [] as string[] }));
          for (const n of l.names) pool.add(n);
        }
        const near = closest(nome, [...pool]);
        if (near.length) return { result: { nenhum_exato: nome, parecidos: near } };
        return {
          result: `Nenhum cliente com "${nome}" no Kyte. Pode ser um lugar: tente lugar_buscar.`,
        };
      }
      const q = norm(nome);
      let hits = CLIENTS.filter((c) => norm(`${c.tradeName} ${c.name}`).includes(q));
      if (!hits.length) {
        const near = closest(
          nome,
          CLIENTS.map((c) => c.tradeName),
        );
        if (near.length) return { result: { nenhum_exato: nome, parecidos: near } };
        hits = [];
      }
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
      return { result: `Nenhum cliente com "${nome}". Pode ser um lugar: tente lugar_buscar.` };
    }
    case 'lugar_buscar': {
      const q = str(args.busca);
      if (!MAPS_ENABLED) return { result: 'O mapa real não está ativo nesta versão.' };
      const hits = await searchPlaces(q, await carPosition());
      if (!hits.length) return { result: `Não achei "${q}" no mapa.` };
      return {
        result: hits.map((h) => ({ endereco: h.label, km_do_carro: h.km })),
      };
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
          run: async () => {
            const how = composeWhatsApp(
              { to: who.split(' ')[0] ?? who, phone, text: msg },
              d.router,
              () => say('Enviado!', { onStart: () => {}, onDone: () => {}, onStopped: () => {} }),
            );
            if (how === 'invalid') return 'Esse telefone não parece válido.';
            return {
              say: 'Pronto! A mensagem está escrita, é só tocar em enviar.',
              after: () => d.proto.setOverlay(null),
            };
          },
        },
      };
    }
    case 'avisar_chegada': {
      const nome = str(args.nome);
      const minutos =
        typeof args.minutos === 'number' && args.minutos > 0 ? args.minutos : undefined;
      return planNotify(
        nome
          ? {
              target: 'named',
              name: nome,
              district: str(args.bairro) || undefined,
              minutes: minutos,
            }
          : { target: 'next', minutes: minutos },
        d,
      );
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
        t === 'kyte'
          ? '/kyte'
          : t === 'whatsapp'
            ? '/whatsapp'
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
