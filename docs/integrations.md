# Integrações externas — viabilidade e limitações

Pesquisa feita em 18/11/2026. Nada aqui foi presumido: onde não há documentação pública, isso
está dito explicitamente.

## Kyte

**Direção do produto:** usar a Kyte como fonte oficial dos registros comerciais.

**O que foi encontrado:**

- A Kyte é um app de PDV/estoque/catálogo para pequenos negócios (app móvel + Kyte Web).
- **Não foi encontrada API pública documentada** (REST, webhooks ou portal de desenvolvedores).
- Caminhos oficiais de dados, segundo a Central de Ajuda da Kyte:
  - Exportação de relatórios de **vendas, produtos e clientes** em CSV; o app envia o arquivo
    para o e-mail da conta.
  - **Importação e atualização em massa** de produtos e clientes por planilha-modelo no **Kyte
    Web** (o modelo não pode ter colunas alteradas ou reordenadas).

**Consequências para a arquitetura:**

1. Sem API, a Kyte **não pode ser fonte da verdade em tempo real**. O GoClient precisa ter seu
   próprio banco (já tem) e tratar a Kyte como sistema sincronizado por arquivos.
2. Adaptador planejado (`apps/api/src/integrations/kyte/`, fase própria):
   - **Importar**: o usuário envia o CSV exportado da Kyte; o GoClient cria/atualiza registros e
     grava o vínculo em `external_links` (provider `kyte`).
   - **Exportar**: o GoClient gera a planilha no modelo oficial para o usuário importar no Kyte Web.
3. Automação sem intervenção humana (ex.: ler o e-mail do relatório, automatizar o Kyte Web)
   seria frágil e possivelmente contrária aos termos de uso — **não recomendado**.
4. **Ação recomendada:** contato comercial com a Kyte perguntando por API de parceiros ou
   integração oficial. Se existir, o adaptador troca a origem sem mudar o restante do sistema.

Pendente de validação com a Kyte: formato exato dos arquivos atuais, se há identificador estável
dos registros nas exportações (necessário para vincular sem duplicar) e o plano necessário.

### Kyte Web com a interface do GoClient (Automotive e celular)

O GoClient abre o **sistema real** do Kyte Web (`https://web.kyteapp.com`) e troca a casca: título,
subtítulo, busca e botões de seção (Clientes, Produtos, Rotas, Pedidos, Vendas, Finanças,
Estatísticas, Catálogo, Ajustes do Kyte) são do app; a tela de cada seção é a do Kyte.
Código: `apps/automotive/src/kyte/bridge.ts` (rotas e script injetado) e `src/app/(main)/kyte.tsx`.

- **Rotas reais** lidas do código público do Kyte Web (20/11/2026): `/products`, `/customers`,
  `/orders`, `/sales`, `/finances`, `/analytics`, `/catalog`, `/config`. "Rotas" é a tela do GoClient.
- **Script injetado (Android):** fonte do sistema, cantos arredondados, tema escuro (inversão de
  cores com fotos preservadas), esconde o chat flutuante e o **menu lateral do Kyte** (achado pelos
  textos do menu, porque o Kyte usa classes CSS geradas, sem nomes fixos), avisa o app da tela
  atual e do login, e repassa a busca do app para o campo de busca da tela aberta.
- **Testado:** na página de login real do Kyte (tema e detecção de "não logado") e numa página de
  teste com menu lateral (menu escondido, busca preenchida). **Falta confirmar** as telas logadas
  (Produtos, Clientes...) no primeiro login de verdade: se o Kyte desenhar algo diferente do
  esperado, o menu dele pode continuar aparecendo — o resto funciona igual.
- **Web/Preview:** o navegador não deixa o app mexer na página de outro site; ali os botões só
  trocam o endereço da janela, sem o visual adaptado.

### No GoClient (atualizado em 22/11/2026)

- A aba Kyte mostra **só a página do Kyte Web**. Por dentro dela o app esconde o menu do Kyte e
  põe as pílulas **Início · Vender · Produtos · Clientes · Histórico** (`kyte/bridge.ts`).
- **Início** não existe no Kyte Web: é desenhado dentro da página com os números do
  Histórico de vendas (Hoje, Ontem, Esta semana, Este mês) e o botão "Registrar venda".
- **Ficha do cliente:** botões **Colocar na rota** e **Ir agora**, com o endereço cadastrado
  no próprio Kyte (campo "Endereço" + "Complemento").
- **Janela invisível** (`kyte/agent.tsx`, `agent-page.ts`): uma segunda janela do Kyte, fora
  da tela, usada pela Havena e pelo Início — busca cliente, lê endereço/telefone, lê o resumo
  de vendas, cadastra cliente/produto. Mesmo login (cookies do aparelho).
- **Limitações:** sem API, tudo é feito na página, achando os elementos pelo texto (as telas
  foram mapeadas por prints; não houve acesso a uma conta para testar ao vivo — testado num
  Kyte simulado). Se o Kyte mudar a página, uma ação pode falhar até ajustarmos. O
  cadastro de cliente/produto procura um botão "Salvar/Concluir"; se não houver, volta a tela
  (o Kyte pode salvar sozinho) — **a confirmar no aparelho**. Só no app Android.

## Havena (IA)

- **Com internet:** modelo da NVIDIA (plano gratuito, ~40 pedidos/min; termos: uso de
  desenvolvimento). Escolhido por teste real com a chave: `nvidia/nemotron-3.5-super-vl-120b-a12b`
  (7/7 conversas certas, ~2 s); reserva `mistralai/mistral-large-4-1t-a52b` (certo, mas lento).
  Workflow "NVIDIA check" repete o teste.
- **Ferramentas** (`havena/tools.ts`): música (controle, buscar e tocar/pôr na fila), buscar
  cliente no Kyte, pôr na rota / ir agora, rota do dia, WhatsApp (abre com a mensagem pronta;
  o envio é um toque da pessoa), cadastrar cliente/produto no Kyte, resumo de vendas, abrir
  telas. **Rota, WhatsApp e cadastros sempre pedem confirmação** ("sim"/"não" ou botões).
- **Voz:** reconhecimento do próprio Android (`expo-speech-recognition`, serviço do Google) e
  fala do aparelho (`expo-speech`). Sem custo.
- **Sem internet / sem chave:** comandos fixos (`havena/offline.ts`): passar, voltar, pausar,
  continuar música; rota do dia; abrir telas.
- **Próxima fase:** modelo local (llama.cpp) em multimídias com 6 GB ou mais de RAM.

## Spotify

**O que foi encontrado:**

- Apps novos começam em **Development Mode**: até **5 usuários** autorizados manualmente, conta
  **Premium** do desenvolvedor exigida e cotas de uso não publicadas (regras de 11/02/2026).
- **Extended Quota Mode** (uso público) desde 2025 exige empresa registrada e **250 mil usuários
  ativos mensais**, entre outros critérios.
- O **App Remote SDK** (Android/iOS) controla o app oficial do Spotify instalado no aparelho:
  tocar, pausar, pular, ler a faixa atual e capas. Exige o app Spotify instalado e conta Premium
  para controle completo.

**Consequências:**

1. O módulo Música é viável para **uso interno/piloto (até 5 contas)**. Para distribuir o GoClient
   amplamente com Spotify, o critério de 250 mil MAU é um **bloqueio real**, fora do nosso controle.
2. Abordagem técnica: App Remote SDK via módulo Expo (exige build de desenvolvimento, não roda
   no Expo Go nem no Preview do navegador). Telas de playlists usariam a Web API, sujeita às
   mesmas cotas.
3. Alternativa a avaliar: integrar com o **controle de mídia do Android** (MediaSession), que
   comanda qualquer player ativo (Spotify incluso) sem a Web API — perde-se a navegação por
   playlists dentro do GoClient, mas não há limite de usuários.

### Implementado (Automotive, Android) — Web API + Spotify Connect

Decisão: Web API com login PKCE e controle via **Spotify Connect** (o som sai do app oficial do
Spotify na multimídia). Sem `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` na compilação, a Música continua em
demonstração. Código em `apps/automotive/src/spotify/`.

- **Login:** janela interna (WebView) com a página do próprio Spotify; o retorno vai para
  `http://127.0.0.1:43821/callback`, que a janela intercepta (não há servidor). Tokens ficam no
  armazenamento seguro do Android (`expo-secure-store`), uma entrada por conta; várias contas no
  mesmo aparelho, trocadas pelo menu da foto do perfil.
- **Dados:** Músicas Curtidas, playlists, álbuns e programas salvos, artistas seguidos,
  tocadas recentemente, busca de músicas (máx. 10 resultados, regra de fev/2026).
- **Reprodução:** tocar/pausar/próxima/anterior e tocar playlist/álbum/programa pela Web API; o
  estado é lido a cada 4 s. Sem aparelho ativo, o GoClient liga o app do Spotify **por trás**
  com o SDK oficial App Remote 0.8.0 (módulo local `apps/automotive/modules/spotify-remote`, aar
  do repositório github.com/spotify/android-sdk, licença Apache 2.0), espera ele aparecer como
  aparelho e manda o comando; se não aparecer, manda o comando direto pelo SDK. A pessoa não sai
  do GoClient. Exige o app do Spotify instalado e logado na multimídia; na primeira conexão o
  Spotify pode mostrar uma tela pedindo para autorizar o GoClient.

**Limitações reais (não contornáveis pelo GoClient):**

- Conta **Premium** para controlar a reprodução; no máximo **5 contas** liberadas por Client ID
  (painel do app → User Management).
- Playlists de **outras pessoas** (ex.: editoriais seguidas) não têm a lista de faixas liberada em
  modo de desenvolvimento: a página mostra um aviso e o play toca a playlist inteira.
- Categorias do "Buscar", lançamentos e gêneros por faixa não existem mais na API: essas partes
  só aparecem na demonstração.
- O login pelo **Google** é bloqueado pelo Google dentro de WebViews: usar e-mail e senha.
- A cor de fundo do player/mini player das capas remotas é um tom estável derivado do item, não
  a cor extraída da capa (exigiria biblioteca nativa).
- O áudio sai pelo Spotify da conta ativa: se outra pessoa da família trocar de conta, o app do
  Spotify da multimídia precisa estar com a mesma conta, senão o som toca no aparelho dela.

**Configuração (uma vez):**

1. developer.spotify.com/dashboard → Create app → APIs: **Web API**. Redirect URI:
   `http://127.0.0.1:43821/callback`.
2. User Management: adicionar o e-mail Spotify de cada pessoa (até 5).
3. GitHub → Settings → Secrets and variables → Actions → New repository secret:
   `SPOTIFY_CLIENT_ID` = Client ID do app. Rodar de novo o workflow "Android APK".
4. Para o App Remote: no app do painel → Edit → marcar **Android** em "APIs used" e em
   "Android packages" cadastrar o pacote `com.goclient.automotive` com a impressão digital SHA-1
   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (a chave de assinatura que o
   APK usa hoje é a chave de depuração padrão do modelo do Expo; se um dia o APK passar a ser
   assinado com chave própria, a SHA-1 muda e precisa ser cadastrada de novo).

## WhatsApp

Integração por links `https://wa.me/<número>?text=<mensagem>` — não depende de API nem de
aprovação. Implementado em `packages/core/src/whatsapp.ts` (normalização de números brasileiros).

## Mapas e rotas

### Implementado (Automotive, Android) — OpenStreetMap, sem custo

Sem `EXPO_PUBLIC_ORS_API_KEY` na compilação, o app usa o mapa de demonstração. Código em
`apps/automotive/src/map/`. O Google Maps foi descartado: a conta exigia pré-pagamento.

- **Desenho do mapa:** OpenFreeMap (estilo escuro/claro), dados do OpenStreetMap, desenhado
  pelo MapLibre GL JS numa WebView (`map-html.ts`, `live-map.tsx`). Gratuito, sem chave e sem
  limite de uso. A biblioteca vem do unpkg (jsDelivr de reserva): sem internet, não há mapa.
- **Rotas, endereços e ordem das paradas:** OpenRouteService (`routing.ts`), plano gratuito
  Standard, em `api.heigit.org` (o antigo `api.openrouteservice.org` foi desligado em
  set/2026). Cotas por dia (vistas na verificação real): rotas 2.000, endereços 3.000,
  ordem das paradas 500.
- **Preferência de caminho:** rota **mais curta**, evitando vias expressas — corta por
  dentro dos bairros (objetivo: chegar às barbearias da periferia). Na verificação real
  (Campinas, 3 pontos): "recomendada" 18,5 km/27 min pelas avenidas; "mais curta" 17,6 km/
  34 min por ruas de bairro. Trocar em `ROUTE_PREFERENCE`.
- **Rota do dia:** uma rota só para todas as paradas, na melhor ordem (VROOM); o último
  cliente continua o último.
- **Navegação com voz dentro do GoClient** (`navigation.ts`): próxima manobra, distância,
  voz em português (expo-speech) aos ~400 m, ~150 m e na hora da manobra; câmera segue o
  carro. Ao chegar numa parada, passa para a próxima. **Recalcula só quando o carro sai do
  caminho** (mais de 60 m da linha em duas leituras do GPS). O app do Google Maps não é
  usado: ele refaria o caminho pelas avenidas.

**Limitações:** sem trânsito em tempo real (a estimativa de tempo vem do tipo de rua); ruas
de periferia podem faltar ou estar com a mão errada no OpenStreetMap (dá para corrigir em
openstreetmap.org); serviços gratuitos podem mudar as regras; a voz usa o sintetizador do
aparelho (precisa de português instalado).

**Configuração (uma vez):** account.heigit.org → conta gratuita → chave Standard →
GitHub → Secrets → `ORS_API_KEY`. O workflow "ORS check" testa a chave com pedidos reais.

## Fontes

- OpenRouteService — planos: https://openrouteservice.org/plans/
- OpenRouteService — novo endereço da API: https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912
- OpenFreeMap: https://openfreemap.org
- Central de Ajuda Kyte — exportação de relatórios: https://docs.kyteapp.com/en/articles/7861123-export-your-business-reports
- Central de Ajuda Kyte — produtos em massa: https://docs.kyteapp.com/en/articles/7861135-register-products-in-bulk-on-kyte-web
- Central de Ajuda Kyte — clientes em massa: https://docs.kyteapp.com/en/articles/7915387-how-to-register-your-customers-in-bulk
- Spotify — migração do Development Mode (fev/2026): https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- Spotify — critérios de Extended Access: https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access
- Spotify App Remote SDK (Android): https://spotify.github.io/android-sdk/app-remote-lib
- Android for Cars: https://developer.android.com/cars

### Kyte Web dentro do GoClient (janela interna)

Decisão de 19/11/2026: uso familiar (cerca de 10 pessoas), conta Kyte no plano GROW. O app mostra o
Kyte Web numa janela interna; a Havena vai operar essa janela com confirmação por voz (próxima etapa).

- Endereço: `https://web.auth.kyteapp.com/pt-br/signin` (link "Acessar o Kyte" do site oficial).
- Login por e-mail e senha na página do Kyte; o GoClient não vê nem guarda a senha. Entrar com Google
  não funciona em janelas embutidas (o Google bloqueia).
- Android (multimídia e celular): `react-native-webview`, cookies persistentes (login continua valendo),
  agente de usuário de Chrome de desktop para receber o Kyte Web e não a página de instalar o app.
- Web: iframe. No Preview publicado, a página bloqueia iframes de outros sites; ali aparece um aviso
  com link para abrir o Kyte em outra aba. O Kyte não envia `X-Frame-Options` nem `frame-ancestors` (verificado em
  19/11/2026), mas navegadores podem bloquear os cookies de terceiros dentro do iframe; o teste de
  login de verdade é na multimídia.
- Fragilidade aceita: mudanças no Kyte Web podem exigir ajustes no GoClient.
