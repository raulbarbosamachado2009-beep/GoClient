# Registro de mudanças — GoClient

Toda alteração no projeto é registrada aqui, com data e hora (horário de Brasília). Antes de
começar um trabalho, leia o **Estado atual** e as últimas entradas.

## Estado atual

_Última atualização: 24/11/2026, 09:40 (horário de Brasília)._

- **Onde está o trabalho:** quase tudo em `apps/automotive` (Expo), que roda na central
  multimídia (1600×900, barra lateral) e no celular em pé (barra de abas embaixo). Mobile e Web
  ainda são telas de diagnóstico.
- **Integrações:** Kyte por dentro da página (WebView), Spotify App Remote, mapa real
  OpenFreeMap + OpenRouteService no Android; no Preview (web) o mapa é uma imagem de exemplo.
- **Design:** linguagem do Apple CarPlay/iOS, escuro por padrão, SF Pro. Regra de **bordas
  concêntricas** (`concentric()` em `src/theme.tsx`): raio de dentro = raio de fora − espaçamento.
- **Onboarding e login:** novos (ver entrada de 24/11/2026), com ilustrações animadas.
- **Em andamento em outras frentes:** opção "Rota" no lugar de "Pedido" no cartão do cliente,
  assistente de voz renomeado para "Lucas" (voz masculina) e correções do Spotify.

## 24/11/2026, 09:40 — Design: bordas concêntricas, vidro, onboarding, Kyte e mapa

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
