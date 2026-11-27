/**
 * Script posto na página do WhatsApp Web (dentro da janela do GoClient). Ele **só observa**:
 * conta se a conta está vinculada (lista de conversas na tela), lê o número de não lidas
 * do título da aba (para a bolinha do menu) e percebe quando uma mensagem
 * nova sai na conversa aberta, para o Lucas dizer "Enviado!". Não clica, não digita e não
 * envia nada: automatizar o WhatsApp Web vai contra as regras dele e pode bloquear o número.
 */
export type WhatsAppMessage =
  | { type: 'wa'; logged: boolean }
  | { type: 'wa-sent' }
  /** Conversas não lidas, do título da página ("(3) WhatsApp"), para a bolinha do menu. */
  | { type: 'wa-unread'; count: number };

export const WHATSAPP_SCRIPT = `
(function () {
  if (window.__gcWa) return;
  window.__gcWa = true;
  var post = function (m) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {}
  };
  var lastLogged = null;
  var lastUnread = -1;
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
    var t = /^\\((\\d+)\\)/.exec(document.title || '');
    var unread = t ? parseInt(t[1], 10) : 0;
    if (unread !== lastUnread) { lastUnread = unread; post({ type: 'wa-unread', count: unread }); }
    if (!watching) return;
    var n = outgoing();
    if (n < 0) return;
    if (base < 0) { base = n; return; }
    if (n > base) { watching = false; post({ type: 'wa-sent' }); }
  }, 800);
})();
true;
`;
