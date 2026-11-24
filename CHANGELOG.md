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

### 2026-11-24 09:45 — Spotify: tocar a música certa, player sincronizado e informações reais

**Problemas encontrados:**

- O "tocar" ia pela Web API sem dizer o aparelho. Sem aparelho ativo, o GoClient ligava o
  Spotify por trás e escolhia o primeiro aparelho da conta (podia ser o celular ou o PC), ou
  caía num plano B que tocava a **primeira faixa da janela enviada** (até 10 antes da escolhida)
  ou a playlist **desde o começo / no aleatório**. Daí "começa uma música completamente
  diferente" ou "não toca".
- O estado do player era lido a cada 4 s pela Web API, que mostra o aparelho ativo da conta (não
  necessariamente a multimídia) e, logo depois de um "tocar", ainda devolvia a faixa antiga: o
  player voltava para a música anterior e as informações ficavam trocadas.
- A parte de baixo do player (ao rolar) era fixa: "MC Kevin", "1,2 mi ouvintes", vídeos e
  créditos de exemplo, qualquer que fosse a música. A barra de progresso era sempre 1:16/-2:26,
  e aleatório/repetir não faziam nada.

**O que mudou:**

- **Reprodução pelo próprio aparelho:** com o app do Spotify instalado, tocar, pausar, pular,
  voltar, aleatório, repetir, posição e fila vão pelo SDK App Remote direto para o Spotify da
  multimídia. A faixa escolhida numa playlist, álbum ou nas Curtidas toca pela **posição** dela
  (`skipToIndex`), sempre a certa. Sem o app do Spotify, tudo vai pela Web API, no aparelho
  **ativo** da conta.
- **Sincronia:** o estado chega por evento do SDK (faixa, play/pausa, posição, aleatório,
  repetir, de onde está tocando). Leituras antigas logo depois de um "tocar" são ignoradas por
  até 6 s. A Web API só completa os dados (capa grande, artistas, fila).
- **Player (carro e celular):** progresso real que anda sozinho e aceita toque para pular;
  aleatório e repetir funcionam e ficam verdes quando ligados; cabeçalho mostra "Tocando de
  <playlist>" (ou o álbum). A parte de baixo mostra só dados reais da faixa tocando: artista
  (foto e gêneros), artistas da faixa, próximas da fila e créditos. Vídeos, ouvintes mensais e
  "Conheça" saíram (não existem na API para este app).
- **Playlist:** "Tocar" começa do início com o aleatório desligado; "Aleatório" liga o
  aleatório do Spotify.
- **Assistente:** "toca/põe na fila" agora usa os mesmos comandos (funciona pelo SDK do
  aparelho).
- Arquivos: `apps/automotive/src/spotify/transport.ts` (novo, regras com testes em
  `transport.test.ts`), `spotify/provider.tsx`, `music/now-playing.ts` e
  `music/player-parts.tsx` (novos), `app/player.tsx`, `music/phone-player.tsx`,
  `prototype/state.tsx`, `music/use-play.ts`, `app/(main)/musica/playlist/[id].tsx`,
  `havena/tools.ts`, `modules/spotify-remote` (aleatório, repetir, estado na hora e contexto),
  `docs/integrations.md`. O Automotive ganhou `pnpm test` (Vitest).

### 2026-11-24 09:30 — Assistente vira Lucas

- **Nome:** "Havena" → "Lucas" em todos os textos do app (painel, Ajustes, onboarding,
  permissões do microfone, botões de cadastro no Kyte e instruções do modelo de IA). No código,
  a pasta `havena/` e o canal `havena` das permissões continuam com o nome antigo.
- **Voz masculina:** escolhe uma voz pt-BR masculina instalada no aparelho
  (`pickAssistantVoice` em `packages/core/src/assistant.ts`); sem nenhuma, usa a padrão com
  tom mais grave.
- **Transcrição:** a fala da pessoa aparece inteira e na hora em que é ouvida. Antes a legenda
  recomeçava a cada palavra nova e a frase era cortada no primeiro trecho ("bom" de "bom dia").
  Agora os trechos são juntados e a frase só segue depois de ~1 s de silêncio
  (`havena/listener.ts`).
- **Hora e data:** "que horas são", "que dia é hoje", "que dia da semana", mês e ano são
  respondidos na hora, sem internet (`answerClock`). O modelo de IA também recebe a data e a
  hora de agora.
- **Conversa sem limite:** depois de ativado, o Lucas continua ouvindo até a pessoa fechar o
  painel, mesmo depois de responder ou de um silêncio. O microfone só desliga enquanto ele
  pensa e fala; tocar no círculo interrompe a fala.
- **Ativação por voz:** a chave "Ativar com…" em Ajustes antes não fazia nada. Agora, com o
  app aberto e o Lucas fechado, ele atende a "olá/oi/ei Lucas", "bom dia", "oh IA" e "olá,
  inteligência artificial", e já responde ao que vier junto. A escolha fica salva no aparelho.
- Testes novos em `packages/core/src/assistant.test.ts` (ativação, transcrição, hora/data,
  escolha de voz).

### 2026-11-24 09:40 — Design: bordas concêntricas, vidro, onboarding, Kyte e mapa

Pedido do usuário (thread "Melhorar o design e o onboarding do app").

- **Bordas concêntricas** em todo o app: nova função `concentric(fora, espaçamento)` no tema.
  - Aba do Mapa no celular: raio 64 e 28 de espaço até as peças → cartões, botões, busca e
    avatar com raio 36 (inclui o cartão da parada "Navegar" e os atalhos).
  - Cartões da multimídia no Mapa ("Para onde vamos?", cartão do cliente, barra da viagem),
    menu ☰ do Kyte e cartões de produto seguem a mesma regra.
- **Fundo desfocado (vidro)** na aba do Mapa no celular (atalhos, recentes, cartão do cliente):
  o mapa aparece desfocado atrás. No Android sem desfoque ao vivo vira a cor quase opaca.
- **Onboarding novo** (celular e multimídia): três páginas com ilustração animada num quadro
  arredondado — cartões de clientes flutuando, rota com o carro andando entre as paradas e
  conversa com o assistente — selo, título grande, pontos de página e botão em pílula. Desliza
  para os lados. Permissões no mesmo molde (uma por tela, com anel pulsando).
- **Login novo:** ilustração, marca, "Continuar com e-mail" e, na multimídia, "Entrar com o
  celular" (código QR). Formulário de e-mail e senha em grupo no estilo do iOS.
- **Indicador de carregamento no estilo da Apple** (`src/ui/spinner.tsx`): raios girando em
  passos, igual em Android, iOS e Web. Substitui todos os `ActivityIndicator`.
- **Kyte na multimídia com botões bem maiores:** linhas de 116, cabeçalho de 124, botões de
  ícone de 100, busca e abas de ~100, botão verde de 128 e textos maiores.
- **Mapa mais rápido:** estilo baixado junto com a biblioteca e guardado no aparelho (abre na
  hora da segunda vez em diante), cache da WebView usado antes da rede, rota e pinos entram
  assim que o estilo carrega, blocos sem esmaecer, e uma janela invisível baixa a biblioteca e
  o estilo durante o onboarding/login. Imagens do mapa do Preview recomprimidas (progressivas).
- **Celular:** listas e Ajustes com títulos e legendas no tamanho do iOS (17/15 pt).

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
