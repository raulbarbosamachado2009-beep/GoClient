# Registro de mudanças — GoClient

Toda alteração no projeto é registrada aqui, com data e hora (horário de Brasília, UTC−3).
Leia este arquivo antes de começar qualquer trabalho.

## Estado atual do app

_Última atualização: 2026-11-26 09:55 — WhatsApp simulado no Preview da multimídia para refinar o design (PR aguardando revisão)._

- **Automotive (`apps/automotive`)** é onde está quase todo o produto: Mapa (OSM + OpenRouteService,
  navegação com voz), Kyte (telas próprias sobre a janela do Kyte) e o assistente de voz Lucas.
  Não há mais Música/Spotify; no lugar entrou a aba **WhatsApp** (WhatsApp Web dentro do
  app, número da equipe). O Lucas avisa o próximo cliente da rota pelo WhatsApp. Roda no carro (paisagem) e no celular (em pé, com aba puxável estilo Apple Maps).
- **Mobile e Web** ainda são telas de diagnóstico; **API** (`apps/api`) com Hono + Drizzle.
- Regras de negócio em `packages/core` (com testes); visual só com `@goclient/design-tokens`.

## Mudanças

### 2026-11-26 09:55 — WhatsApp simulado no Preview (multimídia)

Pedido do usuário: como foi feito com o Kyte, a aba WhatsApp do Preview abre um WhatsApp
simulado, sem login, para refinar a interface da multimídia antes das funções reais (a versão
do celular vem depois).

- Telas (com base nos prints do WhatsApp Web enviados): carregamento; conversas com busca e
  filtros (Tudo, Não lidas, Favoritas, Grupos) e painel vazio; conversa aberta com envio de
  mensagens só na tela; menu da conversa só com Pesquisar, Selecionar mensagens, Bloquear,
  Limpar conversa e Apagar conversa (os três últimos pedem confirmação); dados do contato com
  rolagem; botão "+" com Nova conversa e Novo contato; Ligações (favoritos e recentes) e
  Dados da ligação.
- Cores do WhatsApp nos temas claro e escuro, bordas concêntricas, alvos de toque grandes.
- Dados 100% fictícios (`whatsapp/sim/data.ts`); nada dos prints foi copiado.
- No app instalado nada muda: a aba continua abrindo o WhatsApp Web de verdade.
- Arquivos: `apps/automotive/src/whatsapp/sim/simulated.tsx`, `whatsapp/sim/data.ts`,
  `app/(main)/whatsapp.tsx`.

### 2026-11-26 09:15 — WhatsApp no menu e o Lucas avisando o próximo cliente

Pedido do usuário: o WhatsApp entra no lugar do Spotify, no celular e na multimídia, e o
Lucas avisa o cliente que estamos chegando, com mensagem humanizada.

- **Aba WhatsApp** (barra lateral da multimídia e barra de abas do celular, depois do Kyte):
  o WhatsApp Web oficial dentro do app, para a equipe usar o número compartilhado. Antes do
  primeiro uso, uma apresentação no estilo das do Kyte explica o QR code. A sessão fica salva
  no aparelho: a multimídia não precisa de chip e o QR só aparece na primeira vez.
- **Lucas:** "Lucas, avisa o próximo cliente que estamos indo" → "Só um segundo!" → "Posso
  falar para o Adão do Selma que chegamos em 6 minutos?" → "Pode!" → abre a conversa com a
  mensagem escrita → a pessoa toca em enviar → "Enviado!". Também entende o pedido com nome,
  bairro e tempo ("avisa o Adão do Jardim Selma que chego em 10 minutos") e "abre o
  WhatsApp". A mensagem muda a cada envio (cumprimento do horário, corpo e fecho sorteados).
- **Envio com um toque:** o app não aperta enviar sozinho (risco de banir o número). Ele só
  percebe que a mensagem saiu para o Lucas dizer "Enviado!".
- Código: `packages/core/src/arrival.ts` (+ testes), `buildWhatsAppWebSend` em
  `whatsapp.ts`, `apps/automotive/src/whatsapp/` (janela, ponte, ícone, estado),
  `app/(main)/whatsapp.tsx`, `havena/notify.ts`, ferramenta `avisar_chegada`, `map/trip.ts`
  (próxima parada e tempo até ela, publicados pelo Mapa), `ui/app-intro.tsx` (apresentação
  reaproveitada pelo Kyte). Documentação em `docs/integrations.md`.
- Ainda não testado num aparelho de verdade: o login do WhatsApp Web na WebView e o aviso de
  "Enviado!".

### 2026-11-25 23:25 — Spotify removido de todo o app

Pedido do usuário: a integração com o Spotify não é o foco do app e dava muito trabalho. Tudo
que era do Spotify saiu; o WhatsApp entra no lugar numa próxima etapa (ainda não feito).

- Telas: saíram a Música (`/musica`, buscar, biblioteca, playlists), o player (`/player`), o
  mini player e o cartão da música do Mapa.
- Multimídia: a barra lateral fica Mapa · Kyte · Lucas · Ajustes. No Mapa, o cartão de vidro do
  destino ocupa a coluna da direita inteira; em "Para onde vamos?" o título fica em cima e as
  opções embaixo, perto da mão.
- Celular: a barra de abas fica Mapa · Kyte · Lucas · Ajustes.
- Código: removidos `src/spotify/`, `src/music/`, o módulo nativo `modules/spotify-remote`
  (SDK App Remote), as capas de exemplo (`assets/covers*`), a fonte Figtree, as cores e a
  variante de botão da Música, e o estado de reprodução do `PrototypeProvider`.
- Lucas: saíram as ferramentas `musica_controle` e `musica_tocar` e os comandos fixos de música
  (passar, voltar, pausar, continuar); "abre o Spotify/música" não existe mais. Teste novo em
  `apps/automotive/src/havena/offline.test.ts`.
- Ajustes: saiu a linha do Spotify (conta/desconectar).
- Configuração: saiu `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` (app.config.js, `integrations/env.ts` e o
  workflow do APK). O segredo `SPOTIFY_CLIENT_ID` do GitHub pode ser apagado.
- Documentação: seção do Spotify retirada de `docs/integrations.md`, `docs/architecture.md`,
  `docs/design.md`, README e CLAUDE.md; scripts de teste do modelo sem ferramentas de música.

### 2026-11-24 15:44 — Lucas atende a qualquer cumprimento e tudo vai para a main

- Lucas: atende a qualquer cumprimento seguido do nome ("olá", "oi", "bom dia", "boa tarde",
  "boa noite", "salve", "opa", "e aí", "fala aí", "tudo bem"…, também em sequência, como "oi,
  boa tarde, Lucas") e a "Lucas, boa noite". Responde no mesmo tom ("Boa tarde!"). "o Lucas
  comprou" continua sem chamar. As chamadas antigas ("oh IA", "oia", "bom dia") continuam.
  Regras e testes em `packages/core/src/assistant.ts`.
- Legenda: as palavras que a pessoa fala aparecem mais rápido (140 ms, sem desfoque); a fala
  do Lucas continua surgindo palavra a palavra.
- PR #6 entra na main com todas as rodadas de design, os PRs #3, #4 e #5 (Spotify) e o mapa
  mais rápido.

### 2026-11-24 15:28 — Cartão da música vazio no Mapa

- Multimídia, Mapa: antes de escolher uma música, o cartão da música mostra "Selecione uma
  música" e, ao tocar nele, abre a página do Spotify (`/musica`).

### 2026-11-24 15:14 — Troca de música animada e fila reordenável na multimídia

- Cartão da música (Mapa da multimídia): ao trocar de música, capa e nome deslizam para o lado
  da troca (próxima ou anterior) e o fundo desfocado faz fade entre as capas.
- "Ver lista" na multimídia: a fila de clientes agora se reordena arrastando pela alça (≡),
  como no celular (`RouteQueue` ganhou o visual `car`). Tocar numa parada continua indo até ela.
- Regra 3 ajustada: nova ação `reorder` em `can()`. Na multimídia a rota pode ser reordenada,
  mas continua sem pôr nem tirar paradas. Testes do núcleo e da API atualizados.

### 2026-11-24 14:53 — Coluna da direita do Mapa sempre cheia

- Multimídia, Mapa: a música e o destino preenchem a coluna de cima a baixo, sem espaço vazio.
  Com "Para onde vamos?" (cartão baixo) a música cresce e mostra a capa grande; com um destino
  ou a lista de clientes (cartão alto) a música volta ao tamanho de painel.
- Os dois cartões mudam de forma juntos (altura e cantos) com o mesmo desfoque de movimento
  (`MorphColumn` em `app/(main)/mapa.tsx`, que substitui o `MorphCard`).

### 2026-11-24 14:45 — Regra 1 retirada: cadastros do Kyte também na multimídia

Decisão do usuário (thread "Melhorar o design e o onboarding do app"): quem usa o app não vai
cadastrar com o carro andando, então a Regra 1 sai.

- `can()` (`packages/core/src/permissions.ts`) não bloqueia mais escrita manual de clientes e
  produtos no Automotive (motivo `automotive_manual_edit_blocked` removido). A Regra 2
  (Havena/Lucas com confirmação) e a Regra 3 (rotas só no celular) continuam. Testes do núcleo e
  da API atualizados (`GET /v1/me` e `/v1/sync/push` no Automotive).
- O "+" de Produtos e Clientes abre "Novo produto" e "Adicionar cliente" também na multimídia.
- `CLAUDE.md`, `docs/architecture.md` e `docs/integrations.md` atualizados.

### 2026-11-24 14:35 — 9ª rodada: cartão que muda de forma, destino único, cadastros do Kyte

Pedido do usuário (thread "Melhorar o design e o onboarding do app", 9ª rodada).

- **Cartão da direita (multimídia) muda de forma:** no "Para onde vamos?" o cartão tem só a
  altura do conteúdo; ao escolher um destino (ou abrir uma lista) ele cresce até a altura da
  coluna, e volta ao fechar. Altura e cantos andam juntos, com desfoque de movimento no meio
  da troca (`MorphCard` em `app/(main)/mapa.tsx`; uma casca de vidro só, o conteúdo troca
  dentro dela).
- **Destino único:** tudo centralizado no cartão (avatar, nome, endereço), botões largos
  "Ligar" e "WhatsApp" e a faixa de chegada/tempo/km; o × fica no canto de cima.
- **Kyte, botão "+":** no celular abre "Novo produto" (nome e preço, com a prévia do produto) e
  "Adicionar cliente" (nome, celular e endereço); salvar preenche o cadastro no Kyte pela
  janela invisível (no Preview nada é gravado). Na multimídia continua pelo Lucas (Regra 1 em
  `can()`); pergunta feita ao usuário se isso deve mudar.
- **Login por e-mail:** menos logos no fundo (4 na multimídia, 3 no celular).
- Arquivos: `app/(main)/mapa.tsx`, `ui/marquee.tsx`, `kyte/screens/create.tsx` (novo),
  `kyte/screens/nav.ts`, `kyte/screens/products.tsx`, `kyte/screens/clients.tsx`,
  `app/(main)/kyte.tsx`, `onboarding/floating-logos.tsx`, `docs/integrations.md`.

### 2026-11-24 13:51 — 8ª rodada: Encerrar recolhível, endereço em carrossel, Ajustes e transição de páginas

Pedido do usuário (thread "Melhorar o design e o onboarding do app", 8ª rodada).

- **Encerrar (multimídia):** 3 s depois de começar a navegação, o botão se recolhe num
  quadrado só com o "×". A forma muda suavemente (largura, texto e ícone juntos) com desfoque
  de movimento no meio da troca, como a busca. Tocar no quadrado encerra a navegação.
- **Cartão do cliente:** o endereço fica numa linha só e, quando não cabe, passa como um
  carrossel de tempos em tempos (`ui/marquee.tsx`). Com isso a faixa de chegada, tempo e km
  não é mais cortada pelo fim do cartão.
- **Ajustes na multimídia maiores:** linhas de 168, títulos de 38, ícones de 104, avatar de
  140, interruptor de 152 × 92, seletor de tema mais largo, títulos de seção de 32.
- **Nova transição entre páginas** (boas-vindas → permissões → login → mapa,
  `usePageTransition` em `ui/motion.tsx`): a página que sai recua, desfoca e some; a nova chega
  de perto, desfocada, e entra em foco.
- **Login por e-mail:** a logo do GoClient espalhada pelo fundo, desfocada e com profundidade
  (as de perto grandes, as de longe pequenas), entrando com fade e flutuando devagar
  (`onboarding/floating-logos.tsx`).
- Arquivos: `app/(main)/mapa.tsx`, `ui/marquee.tsx` (novo), `ui/motion.tsx`,
  `ui/primitives.tsx`, `app/(main)/configuracoes.tsx`, `app/(main)/_layout.tsx`,
  `app/onboarding/index.tsx`, `app/onboarding/permissoes.tsx`, `app/onboarding/login.tsx`,
  `onboarding/layout.tsx`, `onboarding/floating-logos.tsx` (novo).

### 2026-11-24 12:41 — 7ª rodada: cartão do cliente, "Ver lista" e transições de rota

Pedido do usuário (thread "Melhorar o design e o onboarding do app", 7ª rodada).

- **Cartão do cliente (multimídia):** saiu o resumo (última visita, última compra, pedido em
  aberto). O espaço foi para: avatar e nome maiores, endereço completo, um bloco "Próxima
  parada" (tocar vai para ela) e chegada/tempo/km maiores.
- **"Ver lista":** no canto superior esquerdo (rota com mais de uma parada). Troca o conteúdo
  do cartão, com transição, pela fila de clientes da rota numerada (a atual em azul); tocar num
  cliente vai para aquela parada. "<" volta. "Parada 2 de 5" fica no canto superior direito.
- **Entrar e sair de uma rota sem corte seco (celular e multimídia):** a tela do Mapa não é
  mais montada de novo ao trocar de modo (`map/map-nav.ts`: já no Mapa, só troca os
  parâmetros). O mapa desliza até o novo ponto, a rota e os pinos aparecem e somem com fade
  (`map/world.tsx`), os cartões da direita trocam deslizando (`Swap`), e a busca, o botão
  Ir/Encerrar, a orientação e as abas do celular trocam com fade (`Presence`).
- Arquivos: `app/(main)/mapa.tsx`, `map/map-nav.ts` (novo), `map/world.tsx`, `map/stops.tsx`,
  `map/car-search.tsx`, `map/phone-sheet.tsx`, `map/client-picker.tsx`,
  `app/(main)/clientes.tsx`, `app/(main)/rotas.tsx`, `kyte/screens/clients.tsx`.

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
