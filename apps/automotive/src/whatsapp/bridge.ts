/**
 * Script posto na página do WhatsApp Web (dentro da janela do GoClient). Ele **só observa**:
 * conta se a conta está vinculada (lista de conversas na tela) e percebe quando uma mensagem
 * nova sai na conversa aberta, para o Lucas dizer "Enviado!". Não clica, não digita e não
 * envia nada: automatizar o WhatsApp Web vai contra as regras dele e pode bloquear o número.
 */
export type WhatsAppMessage = { type: 'wa'; logged: boolean } | { type: 'wa-sent' };

export const WHATSAPP_SCRIPT = `
(function () {
  if (window.__gcWa) return;
  window.__gcWa = true;
  var post = function (m) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {}
  };
  var lastLogged = null;
  var watching = false;
  var base = -1;
  var outgoing = function () {
    var main = document.querySelector('#main');
    return main ? main.querySelectorAll('.message-out').length : -1;
  };
  // O app avisa quando abriu uma conversa com a mensagem pronta.
  window.__gcWatchSend = function () { watching = true; base = -1; };
  setInterval(function () {
    var logged = !!document.querySelector('#side, #pane-side');
    if (logged !== lastLogged) { lastLogged = logged; post({ type: 'wa', logged: logged }); }
    if (!watching) return;
    var n = outgoing();
    if (n < 0) return;
    if (base < 0) { base = n; return; }
    if (n > base) { watching = false; post({ type: 'wa-sent' }); }
  }, 800);
})();
true;
`;
