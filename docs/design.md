# Design — GoClient Automotive

Estado: protótipo navegável de design (sem funcionalidades). Dados fictícios em
`apps/automotive/src/mocks/`.

## Linguagem visual

- **Referência:** Apple CarPlay. Barra lateral com hora, sinal e ícones de app; Ajustes no rodapé.
- **Temas:** claro e escuro com as cores de sistema da Apple (`src/theme.tsx`). A troca acontece em
  Ajustes → Tema (Claro, Escuro, Automático), e todas as telas leem a paleta via `useColors()`.
  Nenhuma cor fixa fora do tema, exceto na Música, onde a referência pede verde e o player é
  sempre imersivo/escuro.
- **Materiais (desfoque):** `Material` (cartão do mapa, quadro de carregamento), `Blur` (barra
  lateral) e `BlurBackdrop` (fundo de toda janela/pop-up) em `src/ui/primitives.tsx`. Na Web usam
  `backdrop-filter` com raio forte (40 px); no Android/iOS, o BlurView nativo. A barra lateral fica
  por cima do conteúdo e, no Mapa, o mapa passa por baixo dela.
- **Player:** o fundo é a própria capa da música, ampliada e com desfoque forte.
- **Listas:** padrão "inset grouped" do iOS (`Group` + `Row`).
- **Movimento** (`src/ui/motion.tsx`): entrada escalonada de listas (`Appear`), transição entre
  telas, resposta por mola ao toque, controles com "polegar" deslizante (segmentado, interruptor,
  indicador da barra lateral e das abas da Música), janela que sobe com mola, player minimizado
  que sobe ao aparecer.

## Mapa

`src/map/pannable-map.tsx` + `src/map/world.tsx`. O mapa atual é uma **imagem de exemplo**
(`assets/map/map-light.jpg`, recortada sem os controles e ampliada 2,4×; `map-dark.jpg` é derivada
dela para o tema escuro), com rotas, paradas e veículo desenhados por cima em SVG, alinhados às
vias expressas da imagem. Serve para validar a interação: arrastar (com inércia), pinça e roda do mouse para zoom, toque duplo para
aproximar e limites nas bordas. Não há botões de zoom. O mapa real (tiles, GPS, rotas) substitui
`MapWorld` numa fase própria, mantendo o mesmo comportamento de navegação.

## Interações do protótipo

Funcionam apenas como demonstração visual (sem API, sem Spotify):

- **Filtros:** categorias de produtos, regiões em Rotas, filtros do Início e da Biblioteca da
  Música e gêneros da playlist filtram os dados fictícios.
- **Música:** tocar uma faixa define a fila (lista visível); "próxima"/"anterior" percorrem a fila
  e o fundo do player troca com transição.
- **Janelas:** o desfoque do fundo cresce e diminui gradualmente (`useTween` + `BlurBackdrop`).
  Elementos com desfoque não animam opacidade (`Appear fade={false}`), porque opacidade abaixo de 1
  desliga o desfoque do navegador durante a animação.
- **Mapa:** sem cliente escolhido, o cartão mostra "Para onde vamos?" com atalhos para Clientes e
  Rotas.

## Capas de música

`assets/covers/` contém capas fornecidas para o protótipo (convertidas para JPG, até 640 px). No
app final, capas, faixas e artistas vêm do Spotify; essas imagens são apenas conteúdo de exemplo e
pertencem aos respectivos titulares.

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
| `/musica`, `/musica/buscar`, `/musica/biblioteca`, `/musica/playlist/[id]`, `/player` | Música (login, início, busca, biblioteca, player; player minimizado só na Música, acima das abas) |
| `/configuracoes` | Ajustes |

## Havena (orbe da IA)

- O orbe fica na barra lateral, logo abaixo do Spotify. Tocar nele faz o círculo aparecer grande no canto
  direito da tela, sem painel nem texto. Tocar fora fecha; tocar no círculo alterna os estados da animação.
- Atrás do círculo, o desfoque nasce na borda direita e esvanece para a esquerda. Na Web é um único
  `backdrop-filter` com `mask-image` em degradê; no Android/iOS são faixas de `BlurView` sobrepostas
  (o BlurView não aceita máscara). O desfoque cresce com `useTween`, sem animar opacidade.
- Visual do orbe copiado da referência enviada: aquarela com creme no topo, azul-claro no meio e azul forte
  embaixo, sem brilho de vidro nem sombra. As manchas derivam em volta de pontos fixos.
- O componente OrbBloop recebido usa WebGPU (pacote `vgpu`) e depende de arquivos que não vieram junto
  (shader WGSL, `gpu-runtime`, `use-orb-audio`). WebGPU não roda na central multimídia em React Native,
  então `src/havena/orb.tsx` usa SVG. Os estados `idle`, `listen`, `think` e `speak` só mudam o ritmo.
- Protótipo: não há comando de voz.

## Esmaecido nas bordas das listas

- `useEdgeFade()` (`src/ui/edge-fade.tsx`): quando há conteúdo escondido acima ou abaixo, a borda da lista
  desfoca e some na cor do fundo. A borda de cima só aparece depois que o usuário começa a rolar.
- Usado em Clientes, Produtos (cartões e lista), Ajustes e Sua Biblioteca.

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

## Música tocando na barra lateral

- Fora da Música, com uma faixa em andamento, o bloco do Spotify mostra a capa levemente desfocada (ainda
  reconhecível) dentro do quadrado arredondado e barras de equalizador na frente
  (`src/shell/now-playing-tile.tsx`). As barras usam o tom da capa (a mesma cor do player minimizado),
  com saturação e brilho altos para destacar.
- Ao sair da Música, o logo encolhe e some enquanto a capa cresce no lugar; ao voltar, o inverso.
- Sem áudio no protótipo: o movimento é ruído suave gerado; pausado, as barras param baixas.
