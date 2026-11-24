# Registro de mudanças — GoClient

Toda alteração no projeto é registrada aqui, com data e hora (horário de Brasília, UTC−3).
Leia este arquivo antes de começar qualquer trabalho.

## Estado atual do app

_Última atualização: 2026-11-24 11:56 — botão Ir/Encerrar no mapa da multimídia, nome nas rotas montadas e transições em todo o app._

- **Automotive (`apps/automotive`)** é onde está quase todo o produto: Mapa (OSM + OpenRouteService,
  navegação com voz), Kyte (telas próprias sobre a janela do Kyte), Música (Spotify App Remote) e
  assistente de voz. Roda no carro (paisagem) e no celular (em pé, com aba puxável estilo Apple Maps).
- **Mobile e Web** ainda são telas de diagnóstico; **API** (`apps/api`) com Hono + Drizzle.
- Regras de negócio em `packages/core` (com testes); visual só com `@goclient/design-tokens`.

## Mudanças

### 2026-11-24 11:56 — 6ª rodada: Ir/Encerrar, nome da rota e transições

Pedido do usuário (thread "Melhorar o design e o onboarding do app", 6ª rodada).

- **Lógica da navegação (multimídia):** "Encerrar" só aparece depois de tocar em **Ir**. Antes
  disso, o botão do canto do mapa é "Ir" (azul); com a navegação começada ele troca, com
  transição, para "Encerrar". A manobra ("350 m…") só aparece navegando, com fade.
- **Troca de lugares:** chegada, minutos e km foram para o cartão do cliente (o botão Navegar
  saiu de lá). O cartão ganhou um × para fechar o destino.
- **Nome da rota:** ao montar uma rota no celular, o usuário dá um nome (campo "Nome da rota";
  vazio usa "Rota de <dia>, hh:mm"). O nome aparece em "Rotas montadas".
- **Transições (a mesma da aba "Rotas" do celular, agora `Swap` em `ui/motion.tsx`):**
  "Para onde vamos?" ↔ Rotas montadas ↔ Escolher cliente; busca da multimídia (início, Rotas,
  resultados); busca da aba do celular (abrir e fechar); abas das telas do Kyte (cliente,
  venda, produto); etapas do login.
- **Aparecer e sumir (`Presence`):** menu ☰ do Kyte (com o fundo escurecido) e a manobra do
  mapa.
- Arquivos: `ui/motion.tsx`, `app/(main)/mapa.tsx`, `map/car-search.tsx`, `map/phone-sheet.tsx`,
  `map/route-planner.tsx`, `map/stops.tsx`, `app/(main)/kyte.tsx`, `kyte/screens/clients.tsx`,
  `kyte/screens/sale.tsx`, `kyte/screens/products.tsx`, `app/onboarding/login.tsx`.

### 2026-11-24 11:31 — 5ª rodada: rotas montadas no celular, busca da multimídia e opções em azul

Pedido do usuário (thread "Melhorar o design e o onboarding do app", 5ª rodada).

- **Regra 3 (nova):** rotas são montadas só no celular. Na multimídia elas só são listadas e
  começadas. Está em `can()` (`packages/core/src/permissions.ts`, motivo
  `automotive_route_build_blocked`), vale na API e tem testes; o teste antigo que deixava
  reorganizar rotas no carro foi removido. `CLAUDE.md` atualizado.
- **"Rotas" na aba puxável (celular):** abre duas opções: **Montar nova rota** e a lista
  **Rotas montadas** (tocar começa a rota). Toda rota montada fica salva nessa lista.
- **Multimídia:** "Para onde vamos?" tem Escolher cliente e Rotas montadas; não há mais montar
  rota no carro, só um aviso para usar o celular.
- **Busca do Mapa (multimídia) funciona:** a pílula muda de forma suavemente (largura, altura e
  cantos juntos) até um cartão grande com Atalhos (Clientes, Produtos, Rotas), Recentes e
  "Começar" a última rota. Busca clientes por nome e endereço. Elementos com fade de entrada e
  saída e desfoque de movimento enquanto a forma muda, abrindo e fechando.
- **Opções maiores e em harmonia:** linhas de 140 com ícones de 80 e textos de 30; todas no azul
  do app (círculo azul translúcido), a principal em azul cheio. Raios concêntricos (cartão 52,
  padding 24 → grupo 28).
- **Ainda falta:** a sincronia real das rotas do celular para o carro precisa de um endpoint de
  rotas na API. No Preview aparecem rotas de exemplo.
- Arquivos: `packages/core/src/permissions.ts` (+ teste), `CLAUDE.md`, `map/stops.tsx`,
  `map/saved-routes.tsx` (novo), `map/car-search.tsx` (novo), `map/phone-sheet.tsx`,
  `app/(main)/mapa.tsx`.

### 2026-11-24 11:09 — 4ª rodada: navegar, cartão da música, "Para onde vamos?", ícone do Mapa, barra lateral e Ajustes

Pedido do usuário (thread "Melhorar o design e o onboarding do app", 4ª rodada). Vale para o
celular e a multimídia.

- **Destino único sem setas:** "anterior/próximo" só aparecem na rota do dia com mais de uma
  parada (na multimídia apareciam também para um cliente só).
- **Navegar funciona:** tocar em "Navegar" começa a navegação (também no Preview, com a rota de
  exemplo). O botão vira **Encerrar navegação**, as setas somem e, no celular, a aba recolhe.
  Na multimídia o botão fica no cartão do cliente.
- **Cartão da música (multimídia):** ganhou o botão de voltar (volta ao início da música; nos
  primeiros 3 s, vai para a anterior) e o fundo agora é a capa da música desfocada.
- **"Para onde vamos?" no estilo Apple:** título curto e uma lista agrupada com ícones
  redondos coloridos e seta: Escolher cliente, Montar rota do dia e Rota de hoje (quando há
  paradas). Mesmo espaço de antes.
- **Ícone do Mapa:** novo ícone no estilo dos ícones de app da Apple (desenho próprio: parque,
  avenida, rua, rota azul e marcador), com versão clara e escura.
- **Barra lateral:** o painel é vidro fosco na cor da página aberta — sobre o mapa desfocado no
  Mapa, sobre a capa desfocada no Spotify, claro no Kyte.
- **Ajustes na multimídia maiores:** linhas de 144, textos de 34, ícones de 88, interruptor de
  132 × 80, seletor de tema mais largo e títulos de seção maiores.
- Arquivos: `app/(main)/mapa.tsx`, `map/phone-sheet.tsx`, `shell/sidebar.tsx`,
  `shell/app-icons.tsx`, `ui/primitives.tsx`, `app/(main)/configuracoes.tsx`.

### 2026-11-24 10:45 — 3ª rodada: logo nova, barra lateral, permissões, login, mapa e Kyte

Pedido do usuário (thread "Melhorar o design e o onboarding do app", 3ª rodada).

- **Logo nova** (imagem enviada pelo usuário): `assets/logo.png`, ícone do app, favicon,
  tela de abertura e ícone adaptativo do Android.
- **Abertura animada:** a logo aparece sozinha no centro, desliza para a esquerda e o nome
  "GoClient" surge ao lado; depois tudo some e começa o onboarding.
- **Barra lateral (multimídia) no estilo de painel de carro:** painel arredondado e flutuante
  com hora e sinal em cima, os apps como ícones de app empilhados (Mapa, Spotify, Kyte, Lucas)
  e Ajustes no pé; ícones com borda concêntrica ao painel. **Spotify e Kyte trocaram de lugar**
  na barra lateral e na barra de abas do celular.
- **Permissões refeitas:** saiu o quadro grande vazio. Agora: ícone com anéis pulsando,
  título, uma frase sobre privacidade e uma lista do que a permissão libera (celular: tudo numa
  coluna; multimídia: lista no quadro da esquerda).
- **Login:** campos separados com rótulo em cima, ícone, borda azul em foco e olho para mostrar
  a senha; mais espaço até o botão Entrar.
- **Mapa na multimídia:** o cartão da música ficou baixo e foi para cima; o cartão do cliente
  foi para baixo e é o maior, com última visita, última compra e pedido em aberto no meio.
- **Mapa no celular:** o cartão da manobra no topo ficou menor (seta, distância e faixa de
  chegada/tempo/km com valor e rótulo na mesma linha).
- **Aba puxável:** títulos de seção ("Atalhos", "Recentes"…) com mais espaço em cima que
  embaixo, junto do que nomeiam.
- **Kyte na multimídia:** linhas de produtos, clientes e venda com 148 de altura, miniaturas de
  116 e textos maiores; miniatura com borda concêntrica à linha.
- Arquivos: `assets/*` (logo e ícones), `app/onboarding/index.tsx`, `app/onboarding/permissoes.tsx`,
  `app/onboarding/login.tsx`, `onboarding/layout.tsx`, `onboarding/scenes.tsx`,
  `shell/sidebar.tsx`, `shell/tab-bar.tsx`, `app/(main)/mapa.tsx`, `map/phone-sheet.tsx`,
  `kyte/ui.tsx`, `kyte/screens/products.tsx`, `kyte/screens/sell.tsx`, `kyte/screens/clients.tsx`.

### 2026-11-24 10:11 — Ajustes pedidos depois do Preview: login, Rota, manobra, mapa e player

Pedido do usuário (thread "Melhorar o design e o onboarding do app", 2ª rodada).

- **Login:** saiu a ilustração dos clientes, que repetia a primeira página do onboarding. A
  tela de e-mail ficou centrada, com espaço para os campos (antes ficavam espremidos embaixo).
- **"Rota do dia" na aba puxável (celular):** abrir e fechar agora tem transição (o conteúdo sai
  deslizando e o novo entra pelo outro lado) e a aba sobe inteira. A lista tem **uma rolagem só**
  e o botão **Calcular (n)** fica no título, sempre visível (antes ficava atrás das abas).
- **Chegada, tempo e km (celular):** saíram do cartão de baixo e foram para o cartão da manobra
  no topo ("vire à direita…"), numa faixa de três colunas que se ajusta à largura.
- **Mapa na multimídia em painel:** o mapa fica num quadro arredondado à esquerda; à direita,
  o cartão do destino ("Para onde vamos?" ou o cliente da parada) em cima e o cartão da música
  tocando embaixo (capa, nome, artista, progresso, anterior / tocar-pausar / próxima; tocar na
  capa abre o player). Com um cliente escolhido o cartão da música cresce e mostra o tempo.
- **Player do Spotify na multimídia:** nome (com o selo "E" quando explícita), artista e álbum
  centrados à esquerda; anterior, pausa numa pílula translúcida e próxima; barra de progresso
  com tempo decorrido e restante; aleatório, repetir, curtida e mais opções; capa grande e
  arredondada à direita; fundo da capa desfocado sob um véu cinza. Sem logotipo do Spotify.
- Arquivos: `app/onboarding/login.tsx`, `onboarding/layout.tsx`, `map/phone-sheet.tsx`,
  `map/route-planner.tsx`, `app/(main)/mapa.tsx`, `app/player.tsx`.

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
