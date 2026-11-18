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
| `/onboarding`, `/onboarding/permissoes` | Boas-vindas e permissões |
| `/mapa` (`?rota=cliente&id=…`, `?rota=dia`) | Mapa em tela cheia + cartão do cliente |
| `/clientes` | Lista e ficha do cliente (botão IR) |
| `/produtos` | Catálogo em cartões ou lista |
| `/rotas` | Seleção do dia + "Calculando rota" |
| `/musica`, `/musica/buscar`, `/musica/biblioteca`, `/player` | Música (login, início, busca, biblioteca, player; player minimizado só na Música, acima das abas) |
| `/configuracoes` | Ajustes |
