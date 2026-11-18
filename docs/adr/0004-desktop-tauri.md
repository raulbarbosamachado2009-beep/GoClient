# 0004 — Desktop com Tauri sobre a Web (adiado)

**Contexto.** O Desktop precisa das mesmas funções de gestão da Web, possivelmente com recursos
do sistema (atalhos, notificações, impressão, arquivos locais para importação da Kyte).

**Decisão proposta.** Tauri 2 empacotando a aplicação Web. Tauri usa o WebView do sistema, o que
gera instaladores pequenos e baixo consumo de memória em comparação com Electron (que embute um
Chromium inteiro). Alternativa válida: PWA instalável, sem código extra.

**Por que adiado:** sem as telas da Web, um app Desktop agora seria só uma janela vazia, e a
estrutura de pastas dele não teria o que validar. A pasta `apps/desktop` será criada quando a
Web tiver as primeiras telas.

**Consequências a validar.** Diferenças entre WebViews (WebView2 no Windows, WebKit no macOS e
Linux) exigem testes nas três plataformas; o build exige Rust no ambiente.
