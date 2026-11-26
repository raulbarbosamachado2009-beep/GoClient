# Design — GoClient Automotive

Estado: protótipo navegável de design (sem funcionalidades). Dados fictícios em
`apps/automotive/src/mocks/`.

## Linguagem visual

- **Referência:** Apple CarPlay. Barra lateral com hora, sinal e ícones de app; Ajustes no rodapé.
- **Temas:** claro e escuro com as cores de sistema da Apple (`src/theme.tsx`). A troca acontece em
  Ajustes → Tema (Claro, Escuro, Automático), e todas as telas leem a paleta via `useColors()`.
  Nenhuma cor fixa fora do tema.
- **Materiais (desfoque):** `Material` (cartão do mapa, quadro de carregamento), `Blur` (barra
  lateral) e `BlurBackdrop` (fundo de toda janela/pop-up) em `src/ui/primitives.tsx`. Na Web usam
  `backdrop-filter` com raio forte (40 px); no Android/iOS, o BlurView nativo. A barra lateral fica
  por cima do conteúdo e, no Mapa, o mapa passa por baixo dela.
- **Listas:** padrão "inset grouped" do iOS (`Group` + `Row`).
- **Movimento** (`src/ui/motion.tsx`): entrada escalonada de listas (`Appear`), transição entre
  telas, resposta por mola ao toque, controles com "polegar" deslizante (segmentado, interruptor,
  indicador da barra lateral e das abas), janela que sobe com mola.

## Bordas concêntricas

- Regra: **raio de dentro = raio de fora − espaçamento** (`concentric()` em
  `apps/automotive/src/theme.tsx`). Ex.: cartão com raio 48 e 18 de espaço → peças de dentro 30.
- Aba do Mapa (celular): raio 64, 28 de espaço na altura média → peças com 36 (`SHEET_INNER`).
- Mapa (multimídia): o cartão de vidro ocupa a coluna da direita inteira; "Para onde vamos?" 48/24 → 24 (título em cima, opções embaixo); cartão do cliente 48/24 → 24; viagem 32/16 → 16.
- Onboarding: quadro das ilustrações 56/28 → cartões 28 → avatares 12.

## Onboarding e login

- Molde único (`src/onboarding/layout.tsx`): quadro com ilustração animada, selo, título grande,
  texto, pontos de página e botão em pílula (branco no escuro). Celular: quadro em cima; multimídia:
  quadro à esquerda e texto à direita.
- Ilustrações (`src/onboarding/scenes.tsx`), sem imagens nem degradês: cartões de clientes
  flutuando, rota com o carro andando entre as paradas, conversa com o assistente, permissão com
  anel pulsando. Desenhadas em 560×460 e reduzidas para caber.
- Login: "Continuar com e-mail" e, só na multimídia, "Entrar com o celular" (QR ilustrativo).

## Carregamento

- `Spinner` (`src/ui/spinner.tsx`): raios girando em passos, como o indicador do iOS, em todas
  as plataformas (o `ActivityIndicator` do Android é um anel do Material).

## Mapa

`src/map/pannable-map.tsx` + `src/map/world.tsx`. O mapa atual é uma **imagem de exemplo**
(`assets/map/map-light.jpg`, recortada sem os controles e ampliada 2,4×; `map-dark.jpg` é derivada
dela para o tema escuro), com rotas, paradas e veículo desenhados por cima em SVG, alinhados às
vias expressas da imagem. Serve para validar a interação: arrastar (com inércia), pinça e roda do mouse para zoom, toque duplo para
aproximar e limites nas bordas. Não há botões de zoom. O mapa real (tiles, GPS, rotas) substitui
`MapWorld` numa fase própria, mantendo o mesmo comportamento de navegação.

## Interações do protótipo

Funcionam apenas como demonstração visual (sem API):

- **Filtros:** categorias de produtos e regiões em Rotas filtram os dados fictícios.
- **Janelas:** o desfoque do fundo cresce e diminui gradualmente (`useTween` + `BlurBackdrop`).
  Elementos com desfoque não animam opacidade (`Appear fade={false}`), porque opacidade abaixo de 1
  desliga o desfoque do navegador durante a animação.
- **Mapa:** sem cliente escolhido, o cartão mostra "Para onde vamos?" com atalhos para Clientes e
  Rotas.

## Testes visuais (observação)

O Chrome sem interface usado nas capturas automáticas ignora `backdrop-filter` em capturas grandes
(tela inteira). Para revisar o desfoque, capture a tela em blocos menores ou confira no navegador.

## Tipografia — SF Pro (atenção à licença)

Por decisão do produto, a interface usa **somente SF Pro** (Display e Text), obtida do repositório
`github.com/sahibjotsaggu/San-Francisco-Pro-Fonts`, que redistribui as fontes do site da Apple.

- Os arquivos em `apps/automotive/assets/fonts/` foram **recortados** para os caracteres usados em
  português (≈35 KB cada, contra ≈2,2 MB do original), o que reduz memória e tempo de carregamento
  na central.
- **Licença:** a licença da Apple para SF Pro permite o uso apenas em interfaces de software para
  plataformas Apple. O GoClient Automotive roda em Android, e a redistribuição/alteração dos
  arquivos também não é permitida pela licença. **Antes de publicar o app, a fonte deve ser
  trocada** — por exemplo, Inter (licença SIL OFL, visual muito próximo). A troca é feita em um
  único lugar: `src/fonts.ts` e `FONT` em `src/theme.tsx`.

## Telas

| Rota | Tela |
|---|---|
| `/onboarding`, `/onboarding/permissoes`, `/onboarding/login` | Boas-vindas, permissões e login (e-mail e senha ou código pelo celular; QR ilustrativo, provedor de login ainda não definido) |
| `/mapa` (`?rota=cliente&id=…`, `?rota=dia`) | Mapa em tela cheia + cartão do cliente |
| `/clientes` | Lista e ficha do cliente (botão IR) |
| `/produtos` | Catálogo em cartões ou lista |
| `/rotas` | Seleção do dia + "Calculando rota" |
| `/configuracoes` | Ajustes |

## Havena (orbe da IA)

- O orbe fica na barra lateral, logo abaixo do Kyte. Tocar nele faz o círculo aparecer grande no canto
  direito da tela, sem painel nem texto. Tocar fora fecha; tocar no círculo alterna os estados da animação.
- Atrás do círculo, o desfoque nasce na borda direita e esvanece para a esquerda. Na Web é um único
  `backdrop-filter` com `mask-image` em degradê; no Android/iOS são faixas de `BlurView` sobrepostas
  (o BlurView não aceita máscara). O desfoque tem intensidade fixa e entra e sai deslizando pela
  direita junto com o círculo: animar o raio a cada quadro fazia o navegador recompor o desfoque do cartão
  do Mapa atrás dele (o cartão sumia e voltava).
- Desde 26/11/2026 o Lucas é a nuvenzinha do logo (no lugar do orbe em aquarela), em `src/havena/cloud.tsx`.
  A forma foi tirada do logo enviado (fundo removido em `assets/lucas-cloud.png`) e redesenhada em vetor:
  cinco círculos e dois olhos em pílula, para os olhos, a boca e o corpo se mexerem separados.
- Animação estilo desenho animado, sem "pulsar" de tamanho: em repouso flutua, pisca e olha para os lados;
  ouvindo inclina a cabeça, arregala os olhos e acena; pensando olha para cima; falando abre a boca por
  sílabas e quica junto. Nos ícones da barra lateral e da barra de abas (`ambient`) só flutua e pisca, em
  laços do driver nativo.
- Protótipo: não há comando de voz.

## Esmaecido nas bordas das listas

- `useEdgeFade()` (`src/ui/edge-fade.tsx`): quando há conteúdo escondido acima ou abaixo, a borda da lista
  desfoca e some na cor do fundo. A borda de cima só aparece depois que o usuário começa a rolar.
- Usado em Clientes, Produtos (cartões e lista) e Ajustes.

## Barra lateral

- Cada app num bloco cinza arredondado (112 × 92) com ícone de contorno; o ativo fica azul, com barra azul
  na borda esquerda, e o destaque desliza por mola. Largura da barra: 136 px.
- Ícones em `src/shell/app-icons.tsx`: mapa, loja e engrenagem do Ionicons (MIT); cabide e rota desenhados
  em SVG no mesmo traço. Não usamos ícones dos apps da Apple (arte protegida) nem SF Symbols (licença só
  para aparelhos Apple; a central multimídia é Android).

## Legenda da Havena

- Abaixo do orbe, as palavras surgem uma a uma já na posição final (a frase inteira é diagramada invisível desde o início) (fade, leve subida e, na Web, saída de um desfoque de 6 px)
  e a frase some antes da próxima. Fonte SF Pro Display Light, 30 px. Falas fixas de exemplo; a Havena
  ainda não fala. O orbe fica em "falando" enquanto as palavras surgem.

## Alvos de toque (Clientes, Produtos, Rotas, Ajustes)

- Linhas de lista com 112 px de altura mínima, título 28 px e subtítulo 21 px; busca com 88 px; filtros
  com 80 px; seletor segmentado com 84 px; interruptor 112 × 68. Avatares e ícones das linhas maiores.

## Escala em qualquer tela

- O app é desenhado para 1600×900 e, em qualquer aparelho, é montado nesse tamanho e reduzido por igual
  para caber na área útil (sem entalhe nem barras do sistema). Em telas mais largas que 16:9 (celular) a
  área de desenho cresce para os lados; em mais altas (tablet), para baixo. Nunca é ampliado acima de 1.
- Gestos que usam distâncias em pixels da tela (arrastar o mapa) dividem pela escala (`useFrameScale`).

## Desfoque no Android

- O expo-blur no Android só desfoca quando o BlurView aponta para uma área marcada (`BlurTargetView`);
  sem isso mostra só a cor. `src/ui/blur-target.tsx` organiza as áreas: barra lateral → conteúdo;
  janelas e Havena → conteúdo + barra lateral; cartões do Mapa → mapa. Um desfoque nunca fica dentro da
  área que ele desfoca; onde não há área própria, vale a cor de reserva do material.

## Celular em pé × multimídia (mesmo app)

O app do Automotive tem dois formatos, escolhidos pela orientação da tela
(`src/layout/form-factor.tsx`, decidido em `src/preview/automotive-frame.tsx`):

- **Deitado (multimídia ou celular deitado):** referência 1600×900, barra lateral.
- **Em pé (celular):** referência de **720 de largura** (altura livre), reduzida para a largura
  real do aparelho (≈0,55× num celular comum). Assim os mesmos componentes ficam do tamanho
  usual de apps de celular, sem uma segunda biblioteca de interface.

No celular, a barra lateral vira **barra de abas flutuante** (referência: Instagram no iOS 26):
pílula de vidro só com ícones — Mapa · Kyte · Lucas (orbe) · Ajustes —,
bolha clara atrás do ícone ativo que desliza; arrastar o dedo pela barra move a bolha e troca a
tela ao soltar. Clientes, Produtos e Rotas abrem pela aba puxável do Mapa.

**Mapa no celular (referência: Apple Maps):** mapa aberto e uma aba puxável com três alturas,
proporcionais à tela: recolhida = pílula flutuante só com a busca; média = cartão flutuante
(~60%); cheia = tela inteira, com a busca fixa no topo e a lista rolando por baixo. Margens e
cantos acompanham a altura. Se o sistema interromper o gesto, a aba volta para uma altura válida. Explorando: busca, Atalhos (Clientes, Produtos, Rotas),
Recentes, Rota de hoje. Com destino escolhido, a mesma aba mostra o cliente, chegada/tempo/km,
Navegar, anterior/próximo (rota do dia), ações rápidas, pedido e detalhes. Arrasta-se pela alça
e pelo cabeçalho; com a aba cheia, puxar a lista para baixo no topo recolhe. Botões dentro da
aba ignoram o toque que encerra um arrasto. Código: `src/map/phone-sheet.tsx`.

**Havena no celular:** o círculo sobe de baixo e fica embaixo, centrado (236), com a legenda em
cima. O desfoque nasce embaixo e esvanece para cima com faixas sobrepostas (sem máscara: o
Safari do iPhone não aplica `backdrop-filter` junto com `mask-image`). As rotas são as mesmas nos dois formatos, então
girar o celular mantém a tela e o resto do estado.

Adaptações em pé: cartão do Mapa vira painel acima das abas; fichas (cliente, produto) viram
folha de baixo para cima na largura toda; Produtos em 2 colunas; Rotas com resumo fixo
embaixo; login empilhado.

Cuidado de implementação: para desfazer um `flex: 1` ao empilhar em coluna, use `NO_FLEX`
(`flexGrow: 0, flexShrink: 0, flexBasis: 'auto'`). `flex: 0` mantém a base 0% na web e o bloco
some.
