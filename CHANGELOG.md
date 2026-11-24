# Registro de mudanças — GoClient

Toda alteração no projeto é registrada aqui, com data e hora (horário de Brasília, UTC−3).
Leia este arquivo antes de começar qualquer trabalho.

## Estado atual do app

_Última atualização: 2026-11-24 09:45 — Spotify: reprodução pelo próprio aparelho, player
sincronizado e informações reais da faixa._

- **Automotive (`apps/automotive`)** é onde está quase todo o produto: Mapa (OSM +
  OpenRouteService, navegação com voz), Kyte (telas próprias sobre a janela do Kyte), Música
  (Spotify) e assistente de voz. Mobile e Web ainda são telas de diagnóstico.
- **Spotify:** com o app do Spotify na multimídia, o GoClient comanda o Spotify do próprio
  aparelho pelo SDK oficial App Remote e recebe o estado por evento. Sem ele, usa a Web API
  (Spotify Connect). Detalhes e limitações em `docs/integrations.md`.
- Ainda não testado num aparelho de verdade: o SDK do Spotify só existe na compilação Android.

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
