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

**Decisão necessária do produto** antes da fase de Música: aceitar o limite (piloto), adotar o
controle via MediaSession, ou ambos. (Controlar a sessão de mídia de
outro app exige que o usuário conceda ao GoClient acesso às notificações — a validar nas
centrais-alvo.)

## WhatsApp

Integração por links `https://wa.me/<número>?text=<mensagem>` — não depende de API nem de
aprovação. Implementado em `packages/core/src/whatsapp.ts` (normalização de números brasileiros).

## Mapas e rotas

Ainda não definido. A otimização de sequência de visitas (problema do caixeiro-viajante para
dezenas de paradas) pode rodar no servidor; o que exige provedor externo é a **matriz de
distâncias/tempos reais** e a **geocodificação** de endereços. Opções a comparar na fase de Rotas
(custos e limites mudam com frequência): Google Routes API, Mapbox, OpenRouteService/OSRM
auto-hospedado. A navegação curva a curva continua no app de navegação do usuário (Waze/Google
Maps), aberto por link.

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
