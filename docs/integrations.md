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
  estado é lido a cada 4 s. Sem aparelho ativo, o GoClient usa o primeiro disponível ou abre o
  app do Spotify.

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

## WhatsApp

Integração por links `https://wa.me/<número>?text=<mensagem>` — não depende de API nem de
aprovação. Implementado em `packages/core/src/whatsapp.ts` (normalização de números brasileiros).

## Mapas e rotas

### Implementado (Automotive, Android) — Google Maps Platform

Sem `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` na compilação, o app usa o mapa de demonstração (o SDK do
Google fecha o app se abrir sem chave). Código em `apps/automotive/src/map/`.

- **Mapa:** Maps SDK for Android via `react-native-maps` (uso móvel sem cobrança), tema noturno,
  posição do carro pelo GPS (`expo-location`), trânsito durante a rota.
- **Endereços → coordenadas:** Places API (New) · Text Search, com cache durante o uso.
- **Rotas:** Routes API `computeRoutes` com trânsito; rota do dia com
  `optimizeWaypointOrder` (o Google reordena as paradas do meio; o último cliente continua o
  último). Recalcula ao mudar as paradas ou a cada ~2 km rodados, para não gastar a cota.
- **Navegação com voz:** botão **Navegar** abre o app do Google Maps já navegando (com as
  paradas restantes). Sem custo. O Navigation SDK (curva a curva dentro do GoClient) não foi
  incluído: cobra por destino acima de 1.000/mês e exige integração nativa própria.

**Limitações:** a multimídia precisa ter os **serviços do Google Play** (sem eles o mapa não
carrega); o desfoque dos cartões por cima do mapa real pode virar só translucidez em alguns
Android (o mapa do Google é desenhado numa superfície que o desfoque não captura) — a confirmar
no aparelho.

**Configuração (uma vez):**

1. console.cloud.google.com → novo projeto → ativar faturamento (cobre a cota gratuita).
2. Ativar: **Maps SDK for Android**, **Routes API**, **Places API (New)**.
3. Credenciais → Criar chave de API → Restrições: app Android `com.goclient.automotive` com
   SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`; APIs: as três acima.
4. GitHub → Secrets → `GOOGLE_MAPS_API_KEY` = a chave. Rodar de novo o workflow "Android APK".
5. Recomendado: cotas diárias por API no console, para não haver cobrança surpresa.

## Fontes

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
