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

### No GoClient (atualizado em 22/11/2026, segunda versão)

- **Telas próprias** no visual do Kyte (prints do usuário), celular e multimídia: Início,
  Produtos (Itens/Estoque), Clientes (filtros de saldo, WhatsApp, totais de débito/crédito,
  ficha com rota), Histórico (por dia, busca, vendedores, últimos 30 dias), venda aberta
  (Itens/Detalhes/Cliente, cancelar) e recibo (PDF, e-mail, imprimir, compartilhar). Código em
  `apps/automotive/src/kyte/screens/`.
- **Página real do Kyte** só para entrar na conta e para **Vender** (registrar venda), em modo
  mínimo (menu do Kyte escondido; `kyteScript({ minimal: true })`).
- **Dados:** a janela invisível (`kyte/agent.tsx`) guarda as respostas JSON que a própria
  página do Kyte recebe do servidor e lê o banco local do navegador (IndexedDB); depois
  reconhece produtos, clientes e vendas pelos nomes dos campos (`kyte/data-page.ts`, aceita
  vários nomes em inglês/português e documentos do Firestore). A lista fica num arquivo do
  aparelho e é atualizada a cada 5 min de uso. Os totais do Início vêm, quando possível, do
  próprio Histórico do Kyte (texto da tela).
- **Diagnóstico** (Ajustes → Diagnóstico do Kyte): mostra só caminhos, nomes de campos e
  quantidades, para ajustar o reconhecimento se o Kyte usar nomes diferentes.
- **Cancelar venda:** com confirmação, a janela invisível abre a venda no Histórico do Kyte e
  usa o botão "Cancelar venda" dele.
- **Cadastros:** o "+" abre "Novo produto" (nome e preço) e "Adicionar cliente" (nome,
  celular e endereço), no celular e na multimídia, e a janela invisível preenche o cadastro no
  Kyte (`kyte/screens/create.tsx`). O Lucas também cadastra, com confirmação. No Preview nada é
  gravado.
- **Limitações:** sem API pública e sem acesso a uma conta para testar ao vivo, os nomes dos
  campos do Kyte são presumidos; se o reconhecimento não achar algo, a tela diz isso e aponta
  o Diagnóstico. Listas muito longas dependem do Kyte entregá-las à página (a janela rola a
  lista para trazer as páginas seguintes). Só no app Android; no Preview, dados de exemplo.

## Lucas (IA, antes "Havena")

O assistente se chama **Lucas** (voz masculina). No código, a pasta `havena/` e o canal
`havena` das permissões mantêm o nome antigo, para não quebrar API e testes.

- **Com internet:** modelo da NVIDIA (plano gratuito, ~40 pedidos/min; termos: uso de
  desenvolvimento). Escolhido por teste real com a chave: `nvidia/nemotron-3.5-super-vl-120b-a12b`
  (7/7 conversas certas, ~2 s); reserva `mistralai/mistral-large-4-1t-a52b` (certo, mas lento).
  Workflow "NVIDIA check" repete o teste.
- **Ferramentas** (`havena/tools.ts`): buscar
  cliente no Kyte, pôr na rota / ir agora, rota do dia, WhatsApp e aviso de chegada (abre a
  conversa com a mensagem pronta; o envio é um toque da pessoa), cadastrar cliente/produto no Kyte, resumo de vendas, abrir
  telas. **Rota, WhatsApp e cadastros sempre pedem confirmação** ("sim"/"não" ou botões).
- **Voz:** reconhecimento do próprio Android (`expo-speech-recognition`, serviço do Google) e
  fala do aparelho (`expo-speech`). Sem custo. A voz escolhida é pt-BR **masculina** instalada
  no aparelho (`pickAssistantVoice`, @goclient/core); o sistema não informa o gênero, então a
  escolha é pelos nomes conhecidos (Google `pt-br-x-ptd`, Samsung `SMTm`, Apple Felipe/Reed…).
  Sem voz masculina instalada, usa a padrão com tom mais grave. Voz gerada por IA: fase futura.
- **Escuta contínua** (`havena/listener.ts`): depois de ativado, o Lucas ouve até a pessoa
  fechar; só desliga o microfone enquanto pensa e fala. A frase é entregue depois de ~1 s de
  silêncio, juntando os trechos que o Android manda separados (antes chegava só "bom" de
  "bom dia"). Modo contínuo exige Android 13+; abaixo disso, o microfone reabre sozinho.
- **Ativação por voz** (`havena/wake.tsx`, ligada em Ajustes): com o app aberto, "olá/oi/ei
  Lucas", "bom dia", "oh IA" e "olá, inteligência artificial" (`matchWakePhrase`, @goclient/core).
  O que vem junto ("olá Lucas, que horas são") já é respondido. Só funciona com o app aberto e
  na tela (o Android não deixa ouvir com o app fechado sem um serviço próprio).
- **Sem internet / sem chave:** hora e data (`answerClock`), comandos fixos
  (`havena/offline.ts`): rota do dia; abrir telas (Mapa, Kyte, Ajustes).
  Com o modelo, a data e a hora de agora também vão no contexto.
- **Próxima fase:** modelo local (llama.cpp) em multimídias com 6 GB ou mais de RAM.

## WhatsApp (WhatsApp Web dentro do app)

Decisão do usuário (26/11/2026): WhatsApp **normal** (não Business), sem API paga, um número
compartilhado pela equipe.

- **Aba WhatsApp** (celular e multimídia, `app/(main)/whatsapp.tsx`): o WhatsApp Web oficial
  (`web.whatsapp.com`) numa WebView, como o Kyte, com user agent de Chrome de desktop (o
  WhatsApp só mostra a versão web a navegadores de computador). Uso completo pelas pessoas.
- **Vínculo:** QR code lido no celular dono do número (WhatsApp › Aparelhos conectados). A
  multimídia **não precisa de chip**, só de internet. Cada número aceita até 4 aparelhos
  conectados. A sessão fica salva na WebView (cookies, localStorage e IndexedDB, sem modo
  anônimo): o QR só aparece na primeira vez ou se o vínculo cair. O WhatsApp desliga os
  aparelhos conectados se o celular principal ficar ~14 dias sem uso.
- **Lucas avisa o cliente** ("avisa o próximo cliente que estamos indo", "avisa o Adão do
  Jardim Selma que chego em 10 minutos"): regras em `packages/core/src/arrival.ts` (com
  testes). O Mapa publica a próxima parada e o tempo até ela (`map/trip.ts`); o Lucas diz "Só
  um segundo!", escreve uma mensagem que varia a cada envio, pergunta "Posso falar para o
  Adão do Selma que chegamos em 6 minutos?" e, com o "pode", abre a conversa no WhatsApp Web
  do app com o texto já escrito (`/send?phone=…&text=…`).
- **Envio = toque da pessoa.** O app **não** clica em enviar nem digita no WhatsApp Web:
  automatizar o WhatsApp vai contra as regras dele e pode banir o número. O script da página
  (`whatsapp/bridge.ts`) só observa: se a conta está vinculada e quando sai uma mensagem nova
  na conversa aberta, para o Lucas dizer "Enviado!". Não há caminho oficial e gratuito para
  enviar sem o toque (Android Auto só responde notificações; a API oficial é paga).
- **Preview (web):** o WhatsApp Web não abre dentro de outra página; a aba mostra um aviso com
  link para abrir em outra aba.

## Fontes

- OpenRouteService — planos: https://openrouteservice.org/plans/
- OpenRouteService — novo endereço da API: https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912
- OpenFreeMap: https://openfreemap.org
- Central de Ajuda Kyte — exportação de relatórios: https://docs.kyteapp.com/en/articles/7861123-export-your-business-reports
- Central de Ajuda Kyte — produtos em massa: https://docs.kyteapp.com/en/articles/7861135-register-products-in-bulk-on-kyte-web
- Central de Ajuda Kyte — clientes em massa: https://docs.kyteapp.com/en/articles/7915387-how-to-register-your-customers-in-bulk
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
