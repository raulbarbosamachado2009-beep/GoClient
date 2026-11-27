# Registro de mudanças — GoClient

Toda alteração no projeto é registrada aqui, com data e hora (horário de Brasília, UTC−3).
Leia este arquivo antes de começar qualquer trabalho.

## Estado atual do app

_Última atualização: 2026-11-27 13:19 — Cartão do WhatsApp no Mapa abre a conversa tocada._

- **Automotive (`apps/automotive`)** é onde está quase todo o produto: Mapa (OSM + OpenRouteService,
  navegação com voz), Kyte (telas próprias sobre a janela do Kyte) e o assistente de voz Lucas.
  Não há mais Música/Spotify; no lugar entrou a aba **WhatsApp** (WhatsApp Web dentro do
  app, número da equipe). O Lucas (a nuvenzinha do logo) avisa o próximo cliente da rota pelo WhatsApp. Roda no carro (paisagem) e no celular (em pé, com aba puxável estilo Apple Maps).
- **Kyte → Vender** tem o fluxo de vendas inteiro do Kyte em telas próprias (Vender, cliente,
  carrinho, pagamento, dinheiro, venda concluída, recibo); ao concluir, a venda é registrada no
  Kyte por trás. **Imprimir** manda a comanda para a impressora térmica Bluetooth pareada.
  **Compartilhar** abre o "Enviar para" do WhatsApp (no app: clientes do Kyte com telefone,
  a conversa abre com o recibo escrito e a pessoa toca em enviar).
- **Mapa:** a rota ou o cliente escolhido continua no Mapa ao ir para outra aba e voltar.
  Chegada/min/km vêm da rota real no app; no Preview são números de exemplo.
- **Bolinha de novidade** nos ícones do Kyte e do WhatsApp no menu (celular e multimídia), só
  quando há venda nova ou mensagem não lida; abrir o app limpa. Botões importantes tocam um
  som curto (`assets/sounds/tap.wav`).
- **Modo claro é o padrão** (o escuro continua em Ajustes → Tema). Login com fundo "aurora" em azuis.
- **Mobile e Web** ainda são telas de diagnóstico; **API** (`apps/api`) com Hono + Drizzle.
- Regras de negócio em `packages/core` (com testes); visual só com `@goclient/design-tokens`.

## Mudanças

### 2026-11-27 13:19 — Cartão do WhatsApp no Mapa abre a conversa tocada

Pedido do usuário.

- **Multimídia, cartão do WhatsApp no Mapa:** tocar numa conversa abre o WhatsApp direto nela;
  tocar no título "WhatsApp" abre a lista. Com o cartão baixo, tocar abre a conversa mostrada.
  O pedido passa por `requestOpenChat`/`useOpenRequest` (`whatsapp/sim/outbox.ts`), que o
  WhatsApp do celular e o da multimídia atendem. No app (WhatsApp Web) o cartão não lê as
  conversas de verdade, então abre o WhatsApp na lista.

### 2026-11-27 12:52 — Coluna do Mapa sem espaço vazio, "Encerrar" sem moldura e papel de parede escuro

Correções pedidas pelo usuário (3 imagens).

- **Destino de um cliente só (multimídia):** o cartão continua baixo, mas agora fica embaixo e o
  cartão do WhatsApp cresce e ocupa o resto da coluna com as últimas conversas (antes sobrava
  um espaço vazio abaixo do destino).
- **Botão "Encerrar":** sem a moldura branca, como o "Ir"; fundo vermelho-claro sólido, cantos
  e altura iguais aos do "Ir" e sombra leve.
- **Papel de parede do WhatsApp:** na multimídia os ladrilhos cobrem a conversa inteira (antes
  sobrava uma faixa lisa à direita) e no celular a imagem cobre até o rodapé (antes sobrava uma
  faixa lisa embaixo). Vale para o claro e o escuro.

### 2026-11-27 12:39 — WhatsApp com papel de parede e anexos, recibo pelo WhatsApp e ajustes no Mapa

Pedido do usuário (9 itens, com imagens).

- **Papel de parede do WhatsApp** (`whatsapp/sim/wallpaper.tsx`): as duas imagens enviadas (escura
  e clara, em `assets/whatsapp/`), no celular cobrindo a conversa e na multimídia repetidas em
  ladrilhos. O desenho em SVG anterior saiu.
- **Multimídia:** a barra de mensagem não tem mais o botão de emoji (o celular continua igual).
- **"+" da barra de mensagem** (celular e multimídia, `whatsapp/sim/attach.tsx`): abre um mini
  menu com Documento, Fotos, Áudio e Localização atual; cada um manda um anexo de exemplo
  (novos balões de áudio e de localização). A prévia da lista mostra o ícone certo.
- **Recibo → Compartilhar** (`whatsapp/share-sheet.tsx`, `kyte/sell/receipt-share.tsx`): a folha
  "Enviar para" sobe de baixo, com ×, "Novo grupo", Pesquisar, "Contatos frequentes" e
  "Conversas recentes" com o círculo de seleção (✓ verde). Com alguém escolhido, sobe a barra
  com a miniatura do recibo, "Adicione uma mensagem…", os nomes e "Enviar". No Preview o recibo
  chega como documento nas conversas escolhidas (`whatsapp/sim/outbox.ts`); no app são os
  clientes do Kyte com telefone, um por vez, e a conversa abre no WhatsApp com o recibo escrito
  (nada sai sem o toque em enviar). No celular a barra de abas some enquanto a folha está aberta.
- **Busca do Mapa (multimídia):** tocar fora do cartão de busca fecha.
- **Destino de um cliente só (multimídia):** cartão baixo e horizontal, do tamanho do conteúdo
  (foto, nome, endereço, chegada/min/km, Ligar e WhatsApp); o resto da coluna mostra o mapa.
- **Botão "Ir":** sem a moldura branca em volta; fica sozinho sobre o mapa, com sombra leve.
- **Chegada/min/km:** no app, enquanto a rota real não chega, mostra "—" (antes mostrava os
  números de exemplo do Preview).
- **Rota e cliente não somem mais** ao ir para outra aba e voltar: o Mapa guarda o último modo
  (`rememberMap`/`mapHref` em `map/map-nav.ts`) e o menu (barra lateral e barra de abas) volta
  para ele.

### 2026-11-27 07:50 — WhatsApp do celular igual ao do iPhone (conversa, dados do contato e animações)

Pedido do usuário (5 imagens e um vídeo do WhatsApp de verdade). As imagens e o vídeo têm conversas
e dados pessoais reais: **nada deles foi copiado**, só o desenho; o app continua só com dados
fictícios.

- **Conversa** (`whatsapp/sim/phone-chat.tsx`): papel de parede com desenhos de linha bem
  apagados (desenho nosso, em SVG `Pattern`), cabeçalho de vidro com o botão redondo de voltar,
  foto, nome, "toque para mostrar os dados do contato" e a pílula do telefone; balões com
  rabinho na última mensagem de cada sequência, hora e confirmações dentro do balão; separador
  "Hoje" e a faixa "Mensagens não lidas: N" ao abrir uma conversa com não lidas.
- **Rodapé:** "+", campo com o ícone de figurinha, câmera e microfone verde. Ao digitar, a
  câmera recolhe e o microfone gira e vira o botão de enviar.
- **Enviar:** o balão sobe do campo para o fim da conversa e a conversa rola junto; o relógio
  vira ✓ e depois ✓✓ (como no vídeo).
- **Abrir e sair de uma conversa / dos dados do contato** (`PushStack` em `phone.tsx`): a tela
  nova entra inteira pela direita por cima e a de baixo recua e escurece; voltar faz o
  contrário (antes era só um fade curto).
- **Dados do contato** (`whatsapp/sim/phone-profile.tsx`): voltar e "Editar" de vidro, foto
  grande, nome em negrito, telefone, botões Ligar/Mensagem/Favorito/Pesquisar, cartões de mídia,
  notificações, tema, mensagens temporárias, criptografia, "Nenhum grupo em comum", ações em
  verde e em vermelho (Bloquear/Denunciar). Ao rolar, o cabeçalho vira vidro e o título troca
  para o nome.
- Continua **sem chamada de vídeo** (decisão anterior do usuário). Peças comuns foram para
  `whatsapp/sim/phone-kit.tsx`.

### 2026-11-26 23:58 — Cancelamento de venda, bolinhas do menu, onboarding numa página e som

Pedido do usuário (thread "Refazer vendas do Kyte e cards do mapa", 4 imagens). Juntado direto
na main, como na rodada anterior.

- **Cancelar venda (Histórico):** a venda cancelada continuava contando no Início. No Preview o
  cancelamento só mudava a tela aberta; agora marca a venda (`patchSale` também no Preview) e
  os totais do Início saem sem ela. No app, os totais lidos do Kyte são descartados a cada venda
  ou cancelamento e relidos (4 s depois, para o Kyte atualizar). Em "Últimas vendas" a venda
  aparece riscada, com "Cancelada".
- **Kyte no celular maior:** tamanhos do celular em `kyte/ui.tsx` (~+30%) e medidas fixas das
  telas do Kyte e do Vender (+12%).
- **Bolinha de notificação** (`shell/badges.ts`, `shell/badge-dot.tsx`) nos ícones do Kyte e do
  WhatsApp, na barra de abas e na barra lateral. WhatsApp: número de não lidas lido do título do
  WhatsApp Web (só observação, `whatsapp/bridge.ts`); no Preview, as conversas não lidas do
  simulado. Kyte: vendas novas que aparecem numa leitura (o app relê as vendas a cada 3 min).
  O app aberto não ganha bolinha; abrir limpa.
- **Onboarding numa página só** (celular e multimídia): o quadro fica parado; os elementos da
  ilustração saem (sobem, encolhem e desfocam) e os da próxima etapa entram; selo, título e
  texto não se movem, só trocam desfocando (`Morph` em `ui/motion.tsx`, `morph` em
  `OnboardingLayout`). Os textos reservam duas linhas para nada pular.
- **Cartão do cliente na navegação (celular)** mais baixo, com os mesmos elementos: raio 52,
  margem 20, linha 84 (antes 64/28/104).
- **Som nos botões importantes** (`ui/sound.ts`, `Touchable sound`): um toque curto de vidro,
  gerado para o app (`assets/sounds/tap.wav`, 0,16 s). Toca em Continuar/Começar do onboarding,
  botões cheios (Navegar, Ir...), botões verdes do Vender (Pagamento, Concluir...) e no
  encerrar navegação. O Preview embute o `.wav` (`single-file-preview.mjs`).

### 2026-11-26 21:48 — `pnpm check` sem depender do postinstall

- O typecheck da main falhava numa pasta já instalada antes da mudança de velocidade: faltava
  `src/map/vendor/maplibre.generated.ts`, que só era criado no postinstall (o pnpm pula o
  postinstall quando não há nada novo para instalar).
- Agora `typecheck`, `dev`, `web`, `android`, `export:web` e `preview:bundle` do Automotive
  geram o arquivo antes (`scripts/vendor-maplibre.mjs`, que não regrava se nada mudou). O
  arquivo continua fora do git.

### 2026-11-26 21:50 — Vendas do Kyte refeitas, impressora Bluetooth e cartões do Mapa

Pedido do usuário (thread "Refazer vendas do Kyte e cards do mapa", com 4 imagens e um vídeo
do fluxo de vendas do Kyte). O usuário pediu tudo pronto, sem precisar aprovar PR: esta rodada e
a pilha #12 → #13 → #14 foram juntadas direto na main.

- **Celular, navegação (imagem 1):** um botão só para encerrar (antes havia "Encerrar navegação"
  e um "×" com a mesma função; o "Parar" do topo também saiu). Novo cartão `map/nav-card.tsx`:
  começa com o botão vermelho largo e, 2 s depois, se recolhe — o botão vira um quadrado
  arredondado com "×" à direita e ficam a foto, o nome e o endereço (subtítulo). Tocar ou
  arrastar para cima em qualquer canto (menos no "×") abre o tamanho médio (região e ícone do
  WhatsApp) e, de novo, o grande (pedido e endereço completo); mais um toque ou arrastar para
  baixo recolhe. O WhatsApp abre a conversa do cliente no WhatsApp do app com a mensagem de
  "estamos chegando" já escrita (o envio continua sendo o toque da pessoa).
- **Multimídia, Clientes do Mapa (imagem 2):** tudo maior — título, "Ver mais", "×" de 80,
  busca de 96, regiões de 80 e linhas de 128 com ícones maiores (`map/client-picker.tsx`).
- **Multimídia, Mapa (imagem 3):** o cartão do WhatsApp ficou baixo (136, logo de 80, uma linha)
  e o "Para onde vamos?" ocupa o resto da coluna, com título maior e opções maiores perto da
  mão. Coluna da direita de 480 para 520.
- **Kyte → Vender (imagem 4 e vídeo):** o fluxo de vendas do Kyte inteiro em telas próprias
  (`kyte/sell/`), no desenho do Kyte e com entrada/saída de cada página como no vídeo: Vender
  (busca "Item ou código", categorias, "1X", contador no produto, "+👤") → Adicionar cliente
  (busca, última compra, WhatsApp, "Desvincular cliente") → Carrinho (toque no item abre
  quantidade, valor unitário só para esta venda e desconto; "Dar desconto"; "…" com Opções de
  entrega, Adicionar observação, Adicionar desconto e Esvaziar carrinho) → Pagamento (Dinheiro,
  Cartão de Débito/Crédito, Saldo Cliente, Link de Pagamento, Outros, Pix, Venda Fiado, Salvar
  pedido) → Pagamento: Dinheiro (valor recebido e troco) → Venda Concluída (Falar com cliente,
  Recibo, Iniciar outra venda) → Recibo (Configurar recibos, PDF, Email, Imprimir, Compartilhar).
  No Preview a venda é simulada e entra no Histórico; no app, a janela invisível registra a
  venda no Kyte (`JOBS.registerSale`) e, se não conseguir, oferece abrir o Kyte com o carrinho
  montado. Regras do carrinho em centavos em `kyte/sell/cart.ts` (com testes).
- **Impressora Bluetooth:** "Imprimir" manda a comanda direto para a impressora térmica pareada
  no Bluetooth da multimídia, como o Kyte faz no celular. Escolha da impressora, papel 58/80 mm,
  acentos e teste em Recibo → "Configurar recibos". Módulo nativo novo
  `apps/automotive/modules/bt-printer` (Kotlin, SPP) e comanda ESC/POS em `kyte/print/escpos.ts`
  (página 860, com testes). O recibo do Histórico usa a mesma tela.
- Precisa de teste num aparelho de verdade: registrar a venda no Kyte Web (os textos das telas
  de pagamento do Kyte Web foram presumidos a partir do vídeo do app) e imprimir na impressora.

### 2026-11-26 21:03 — Tempo de resposta: Mapa, Kyte e WhatsApp mais rápidos

Pedido do usuário: o app tem que ser extremamente rápido em **tempo de resposta** (abrir telas,
carregar dados, rede), não em animações. Diagnóstico: trocar de aba fechava a tela e o Mapa, o
Kyte e o WhatsApp recarregavam do zero a cada vez.

- **Telas sempre abertas:** Mapa, Kyte e WhatsApp são montados uma vez e ficam por trás
  (`shell/kept-screens.tsx`); trocar de aba só mostra ou esconde. Depois que o app abre, o Kyte
  (1,5 s) e o WhatsApp (4 s) são abertos escondidos, para já estarem prontos. O código das
  telas foi para `src/screens/`; as rotas de `app/(main)/` só marcam a seção. Parâmetros como
  `?rota=dia` e `?secao=clientes` chegam por `useKeptParams`. A navegação continua falando
  mesmo com outra aba aberta. Se o Android fechar uma janela por falta de memória, ela reabre
  sozinha (`onRenderProcessGone`).
- **Mapa:** a biblioteca MapLibre vem dentro do app (sem baixar ~1 MB do unpkg; gerada por
  `scripts/vendor-maplibre.mjs` no `pnpm install`, fora do git); o estilo é pedido antes da
  biblioteca ser lida e o mapa começa na hora com o estilo salvo. Trocar claro/escuro só troca
  o estilo, sem recarregar a página.
- **Endereços:** os já encontrados ficam salvos no aparelho (`map/geo-cache.ts`) e entram na
  hora; os novos são buscados 4 de cada vez e entram juntos (a rota é calculada uma vez só, e
  não a cada pino).
- **Kyte:** a janela de dados abre 2,5 s depois do app (se já entrou no Kyte) e fica aberta 10
  min sem uso (antes: só no primeiro pedido, fechando em 90 s); a espera dela é por aviso, sem
  checar a cada 300 ms; os dados salvos são lidos ao abrir o app. As pausas fixas (1,3 s depois
  da busca, 0,9 s por item na venda, 1,3 s por volta ao ler listas) viraram esperas pelo
  resultado (`A.afterChange`, `A.netQuiet`, `waitFor`).
- **Ajustes → Tempo de resposta:** cronômetro de cada etapa medido no aparelho (mapa pronto,
  ruas desenhadas, endereços, rota, janela do Kyte, leituras do Kyte, WhatsApp pronto), em
  `src/perf.ts`. Aparece só no app Android (no Preview não há medidas).
- Ainda não medido num aparelho de verdade. Abrir a conversa pelo Lucas ainda recarrega o
  WhatsApp Web (o link `/send` só funciona abrindo a página).

### 2026-11-26 14:40 — Nuvem do Lucas sem cortes secos

O usuário mandou um vídeo com a nuvem "travando". Analisando os quadros, os saltos aconteciam
toda vez que o Lucas trocava de expressão (ouvindo → falando → parado): cada troca
substituía a animação em laço por outra, que recomeçava do zero no meio do movimento.

- Cada laço (corpo de cada expressão, olhar para os lados, acenar, falar, rir) agora fica
  numa camada própria. Ao trocar de expressão, a camada que sai volta ao repouso suave a
  partir de onde estava, e a nova começa do repouso. Na web isso usa a Web Animations API e no
  app usa o driver nativo. Continua sem JavaScript a cada quadro.
- A boca falando e rindo varia em torno do tamanho parado, que também muda suave. O formato
  de "D" da risada agora entra com transição.
- Medição no Preview (celular, 22 s de conversa de demonstração): o maior salto da nuvem
  numa troca de expressão caiu de 6 px para 2,7 px por quadro, e esse resto é movimento
  contínuo, sem corte.

### 2026-11-26 14:08 — Nuvem no lugar do logo, login que muda de forma e Lucas com expressões

Sexta rodada (quase toda no celular; o login e o logo valem também para a multimídia):

- **WhatsApp do celular:** o botão de Ligações foi para o lado do "+" verde, na mesma linha
  do título, e "Conversas" (e "Ligações") ficou no topo da tela.
- **Dentro de uma conversa a barra de abas some** (desce e esmaece) e a conversa ocupa a
  tela inteira; o campo de mensagem vai até o rodapé. Ao voltar para a lista, a barra volta.
- **Barra de abas destacava a aba errada** no WhatsApp (marcava o Lucas). O destaque agora
  segue a posição real de cada aba.
- **Mapa:** com a aba puxável minimizada, tocar na busca só abre a aba até a metade; com a
  aba aberta, o toque abre a busca.
- **Logo → nuvem animada em todo o app** (`LogoMark` agora é a nuvem do Lucas em repouso:
  flutua, pisca e olha para os lados, sem o quadrado do ícone). A barra de abas não mudou.
- **Abertura só com a nuvem**, sem o nome "GoClient": ela se forma bolha por bolha, dá um
  pulinho, abre os olhos, olha para os lados, pisca e some (`havena/cloud-intro.tsx`).
- **Login numa tela só que muda de forma:** ao tocar em "Continuar com e-mail", a nuvem
  diminui e sobe, o título troca, o botão preto vira o campo de e-mail e o campo de senha,
  o Entrar e os links entram abrindo espaço. "Voltar" faz o caminho inverso.
- **Transições onboarding → permissões → login mais rápidas e limpas:** sem desfoque nem
  zoom; a página sai deslizando de leve (0,19 s) e a nova entra (0,34 s). A animação da
  pilha de telas foi desligada para não somar outra por cima.
- **Página "Rotas" do onboarding redesenhada:** no lugar do mapa desenhado, um cartão "Rota
  de hoje" no mesmo estilo dos cartões de clientes, com as paradas ligadas por uma linha que
  um marcador percorre (cada parada alcançada vira ✓) e o resumo da viagem embaixo.
- **Lucas com expressões:** ouvindo, ele "compreende" (acena em pares e aperta os olhos de
  leve); falando, a boca abre e fecha mais suave e a cabeça muda de ângulo ao longo da
  frase; com uma piada, ri (olhos fechados de alegria, boca aberta e pulinhos); quando uma
  ação dá erro, fica triste e pede desculpas ("Desculpa, …"). A detecção de piada e o
  pedido de desculpas estão em `havena/mood.ts` (com testes). No Preview a demonstração
  passa também pela piada e pelo pedido de desculpas.
- **Legenda do Lucas** com uma sombra bem leve atrás das letras (halo claro no tema claro,
  sombra escura no escuro), para ler melhor sobre o mapa.

### 2026-11-26 12:46 — Celular: WhatsApp no desenho do iPhone, Lucas no meio da barra e mais fluido

Quinta rodada, só para o celular em pé (a multimídia não muda):

- **WhatsApp do celular** com telas próprias no desenho do WhatsApp do iPhone
  (`whatsapp/sim/phone.tsx`): Conversas (título grande, pesquisa, filtros Todas, Não lidas,
  Favoritos e Grupos), conversa aberta (cabeçalho com voltar, foto, nome e botão de ligar;
  balões; campo de mensagem com microfone), dados do contato com rolagem (o nome aparece no
  cabeçalho ao rolar; Ligar, Mensagem, Favorito; favoritos, limpar e bloquear), Ligações
  (favoritos e ligações recentes com ⓘ) e nova conversa/ligação. **Tela cheia**: o fundo vai
  até as bordas e passa por trás da barra de abas. O botão redondo do canto esquerdo alterna
  Conversas ↔ Ligações. Sem vídeo e só dados fictícios.
- **Ligação em tela cheia** no celular (`CallScreen`): minimizar, nome e "Chamando…"/duração,
  foto no meio e painel com Alto-falante, Encerrar e Silenciar. Minimizada, vira o cartão
  mínimo no canto (toque para abrir de novo).
- **Lucas no meio da barra de abas** do celular.
- **Nuvem do Lucas sem travar:** as animações agora são só `transform`/`opacity` na GPU
  (CSS @keyframes na web, driver nativo no app), sem JavaScript a cada quadro. Mesmos
  movimentos de antes.
- **Desfoque atrás do Lucas mais embaixo** no celular (mesma intensidade, começando mais
  perto do rodapé).

### 2026-11-26 11:38 — Lucas nuvem animado e ligação de voz no WhatsApp

Quarta rodada de ajustes do usuário:

- **Lucas é a nuvenzinha do logo** no lugar da bola azul (`src/havena/cloud.tsx`; o orbe
  `orb.tsx` foi removido). Fundo da imagem removido (`assets/lucas-cloud.png`) e a forma
  redesenhada em vetor para animar olhos, boca e corpo separados. Animação de desenho animado
  (sem só aumentar e diminuir): parado ele flutua, pisca e olha para os lados; ouvindo inclina
  a cabeça, arregala os olhos e acena; pensando olha para cima; falando abre a boca por
  sílabas e quica junto. No Preview a demonstração passa pelos três momentos. Na barra lateral
  e na barra de abas só flutua e pisca (laços do driver nativo).
- **Ligação de voz no WhatsApp simulado** (`whatsapp/sim/call.ts` e `call-layer.tsx`): ligar
  (cabeçalho da conversa, dados do contato, favoritos ou dados da ligação) abre o painel escuro
  do WhatsApp Web embaixo da lista, com foto, nome, "Chamando…" e depois a duração, microfone e
  desligar. Sem câmera (vídeo removido). A conversa ganha o balão "Ligação de voz".
- **Cartão mínimo da chamada:** em qualquer outra página a ligação continua num cartão com
  foto, nome, duração e desligar, no canto superior direito; arrastar para baixo leva ao canto
  inferior (e para cima volta). Tocar no cartão volta ao WhatsApp.

### 2026-11-26 11:25 — Novo logo, cartões do Mapa no estilo CarPlay e WhatsApp com fontes da Apple

Terceira rodada de ajustes do usuário:

- **Mapa:** divisão de cartões no estilo do CarPlay: o cartão do WhatsApp em cima (menor)
  mostra só a mensagem mais recente: logo do WhatsApp à esquerda, nome do cliente, a mensagem
  e o horário à direita; tocar abre o WhatsApp. Ele encolhe quando o cartão de baixo cresce.
- **WhatsApp:** elementos um pouco maiores (×1,85) e lista mais estreita (600 px), para a
  conversa ganhar espaço; **fontes SF Pro** (as da Apple, como no resto do app) no lugar da
  fonte do sistema; conversa aberta com fundo cinza bem claro (#ECECEC) atrás da linha.
- **Sem ligação de vídeo** (cabeçalho da conversa, dados do contato, favoritos, ligações).
- **Interruptor menor** em "Silenciar notificações" e "Sincronizar contato", proporcional à linha.
- **Letreiro "WhatsApp"** em SF Pro Bold verde-claro, mais justo (texto, não a imagem do
  logotipo).
- **Novo logo do GoClient** (nuvem azul enviada pelo usuário): `assets/logo.png`, ícone do app,
  favicon, splash e ícones adaptativos do Android, na multimídia e no celular.

### 2026-11-26 11:00 — WhatsApp maior, login numa página só, cartões visíveis e fundo azul

Segunda rodada de ajustes do usuário:

- **WhatsApp com elementos grandes** como o resto da multimídia: escala do WhatsApp Web ×1,7
  (antes ×1,35) e lista de 680 px; os filtros rolam para o lado se não couberem.
- **O título continua "WhatsApp"** na página de Ligações (antes trocava para "Ligações").
- **Login numa página só:** ao escolher e-mail ou celular (QR), o fundo e o logo ficam; só o
  texto e os botões saem e os campos (ou o QR) aparecem no lugar, sem transição de página.
- **Cartões visíveis no modo claro:** o material dos cartões passou de cinza (igual ao fundo)
  para branco com borda fina (`theme.tsx`, `material.fallback` e `material.border`).
- **Cartão do WhatsApp no Mapa** mostra a última mensagem: logo à esquerda, nome do cliente,
  a mensagem e o horário à direita. Quando o cartão cresce, aparecem as anteriores. No app
  instalado (WhatsApp Web real, sem acesso às conversas) ele mostra só o atalho.
- **Fundo do login em azuis** (royal, céu, anil e ciano sobre azul-claro).
- Arquivos: `whatsapp/sim/simulated.tsx`, `whatsapp/sim/data.ts` (`recentMessages`),
  `app/(main)/mapa.tsx`, `app/onboarding/login.tsx`, `onboarding/layout.tsx`,
  `onboarding/aurora.tsx`, `theme.tsx`.

### 2026-11-26 10:45 — WhatsApp simulado fiel ao WhatsApp Web, modo claro e Mapa com cartão do WhatsApp

Pedidos do usuário (8 itens) e uma correção achada ao verificar o fluxo:

1. **Sem o trilho lateral no WhatsApp simulado.** O botão ao lado do "+" (onde ficavam os ⋮)
   alterna Conversas ↔ Ligações. Também vale no celular (saíram as abas "Conversas/Ligações").
2. **O ícone mostra o destino:** nas Conversas, ícone de ligação; nas Ligações, ícone de
   conversa (com o número de conversas não lidas).
3. **Visual igual ao WhatsApp Web:** fonte do sistema (Segoe UI/Roboto), cores do WhatsApp
   atual (#1DAA61, fundo #F7F5F3, papel de parede bege), proporções do original ×1,35,
   avatares padrão (silhueta azul e de grupo), filtros, balões com "rabinho" e sombra fina,
   aviso de criptografia em amarelo, campo de mensagem flutuante, menu e confirmações no
   formato do WhatsApp, dados do contato com botões redondos e painel vazio com cartão branco.
   Continua tudo com dados fictícios.
4. **Modo claro é o padrão do sistema** (`theme.tsx`, `app.json`). "Automático" agora cai no
   claro quando o aparelho não informa o tema.
5. **Permissões mais simples:** cada tela tem só um ícone pequeno, título ("Permitir
   localização", "Permitir microfone") e um subtítulo curto, com Permitir / Agora não.
6. **Barra lateral visível no modo claro:** o painel é cinza sólido (#DEDEE4) com borda e
   sombra leve em todas as páginas (no Mapa ele sumia no fundo).
7. **Mapa (multimídia): cartão do WhatsApp** quadrado e arredondado no lugar do antigo mini
   player, com "Abrir conversas". Ao tocar em "Escolher cliente" ou "Rotas montadas" (ou com um
   destino), o cartão de baixo cresce e o do WhatsApp encolhe, com animação de forma (altura,
   cantos e desfoque juntos). Ícones novos: pessoa (cliente) e mapa (rotas).
8. **Login com fundo "aurora"** (brilhos roxo, amarelo, rosa e azul sobre lilás → rosa), em
   todas as etapas do login. Feito com react-native-svg, estático (sem animação nem desfoque)
   para não travar; o app não usa Tailwind/shadcn. Saíram os logos flutuando do fundo.
   Exceção à regra "sem gradientes" registrada no CLAUDE.md a pedido do usuário.

- **Correção (verificação do fluxo):** em Ligações, os Favoritos vinham da lista fixa de
  contatos, então quem era adicionado aos favoritos nos dados do contato (ou um contato novo)
  não aparecia lá. Agora vêm da agenda atual.
- Arquivos: `whatsapp/sim/simulated.tsx`, `theme.tsx`, `app.json`, `shell/sidebar.tsx`,
  `app/(main)/mapa.tsx`, `app/onboarding/permissoes.tsx`, `app/onboarding/login.tsx`,
  `onboarding/aurora.tsx` (novo), `onboarding/layout.tsx`; removido
  `onboarding/floating-logos.tsx`.

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
