# Registro de mudanças — GoClient

Toda alteração no projeto é registrada aqui, com data e hora (horário de Brasília, UTC−3).
Leia este arquivo antes de começar qualquer trabalho.

## Estado atual do app

_Última atualização: 2026-11-24 09:28 — lista "Rota" reordenável no cartão do cliente (Mapa, celular)._

- **Automotive (`apps/automotive`)** é onde está quase todo o produto: Mapa (OSM + OpenRouteService,
  navegação com voz), Kyte (telas próprias sobre a janela do Kyte), Música (Spotify App Remote) e
  assistente de voz. Roda no carro (paisagem) e no celular (em pé, com aba puxável estilo Apple Maps).
- **Mobile e Web** ainda são telas de diagnóstico; **API** (`apps/api`) com Hono + Drizzle.
- Regras de negócio em `packages/core` (com testes); visual só com `@goclient/design-tokens`.

## Mudanças

### 2026-11-24 09:28 — "Pedido" vira "Rota" no cartão do cliente (Mapa, celular)

- No cartão do cliente do Mapa (aba puxável do celular), o botão **Pedido** foi trocado por **Rota**.
- Tocar em **Rota** troca o conteúdo do cartão, com animação (o conteúdo atual sai deslizando e o
  novo entra pelo outro lado, na curva da Apple), pela lista dos clientes escolhidos para visitar,
  na ordem da visita. A aba abre inteira para mostrar a lista. Tocar de novo em **Rota** volta.
- A ordem pode ser mudada **arrastando pela alça (≡)**, como a fila do Spotify: a linha levantada
  cresce um pouco e ganha sombra, as outras abrem espaço com mola. Enquanto arrasta, a aba não
  sobe/desce nem rola.
- A ordem escolhida passa a valer para o Mapa: "Parada X de Y", próximo/anterior e a navegação
  seguem essa ordem (a otimização automática do roteamento deixa de reordenar até a rota do dia ser
  montada de novo).
- Tocar num cliente da lista leva até aquela parada.
- O bloco "Pedido" com os itens continua nos detalhes do cliente (só aparece quando há itens).
- Arquivos: `apps/automotive/src/map/route-queue.tsx` (novo), `map/sheet-context.tsx` (novo),
  `map/phone-sheet.tsx`, `map/stops.tsx`, `app/(main)/mapa.tsx`;
  `packages/core/src/route-order.ts` (novo, com testes).
