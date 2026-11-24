/**
 * Ponte entre o GoClient e o Kyte Web de verdade.
 *
 * O GoClient não cria nada por fora do Kyte: abre o próprio Kyte Web e edita a página por
 * dentro (CSS e elementos injetados):
 * - esconde o menu lateral do Kyte e põe, no topo da própria página, as pílulas do GoClient:
 *   **Início · Vender · Produtos · Clientes · Histórico** (as únicas telas usadas);
 * - **Início** é um resumo desenhado dentro da página, com os números do Histórico de vendas
 *   (lidos pela janela invisível da Havena) e o botão "Registrar venda";
 * - na ficha do cliente, acrescenta **Colocar na rota** e **Ir agora** (usam o endereço
 *   cadastrado no próprio Kyte);
 * - aplica o visual do app (fonte, cantos, tema escuro).
 *
 * As telas foram mapeadas pelos prints do Kyte Web logado (22/11/2026). O Kyte usa classes CSS
 * geradas (sem nomes estáveis): o menu e os campos são achados pelo texto. Se o Kyte mudar a
 * página, o pior caso é o menu dele voltar a aparecer ou um botão nosso sumir.
 */

export const KYTE_ORIGIN = 'https://web.kyteapp.com';
/** Entrada: o próprio Kyte Web decide (logado → Vendedor; sem login → tela de login). */
export const KYTE_HOME = `${KYTE_ORIGIN}/`;

/** Seções do Kyte no GoClient e o item do menu do Kyte que cada uma abre. */
export const KYTE_SECTIONS = [
  { key: 'inicio', label: 'Início', menu: null },
  { key: 'vender', label: 'Vender', menu: 'Vendedor' },
  { key: 'produtos', label: 'Produtos', menu: 'Produtos' },
  { key: 'clientes', label: 'Clientes', menu: 'Clientes' },
  { key: 'historico', label: 'Histórico', menu: 'Hist[oó]rico' },
] as const;

export type KyteSectionKey = (typeof KYTE_SECTIONS)[number]['key'];

/** Mensagens que a página do Kyte manda para o app. */
export type KyteMessage =
  /** `logged`: true = menu do Kyte visível; false = tela de login; null = ainda carregando. */
  | { type: 'route'; host: string; path: string; logged: boolean | null }
  | { type: 'nav'; hidden: boolean }
  /** Pílula Início aberta: o app busca os números e devolve com `__gcHomeData`. */
  | { type: 'home' }
  /** Botões da ficha do cliente. */
  | {
      type: 'client-route';
      now: boolean;
      client: { name: string; phone: string; address: string };
    };

export interface HomeData {
  today: { count: number; total: string } | null;
  yesterday: { count: number; total: string } | null;
  week: { count: number; total: string } | null;
  month: { count: number; total: string } | null;
  error?: string;
}

/**
 * Script injetado na página do Kyte (Android/WebView). Roda a cada carregamento e acompanha a
 * navegação interna do Kyte (que troca de tela sem recarregar). Com `agent`, é a janela
 * invisível da Havena: sem menu nosso, sem tema e com o menu do Kyte à mostra.
 */
export function kyteScript({
  dark,
  phone,
  agent = false,
  minimal = false,
}: {
  dark: boolean;
  phone: boolean;
  agent?: boolean;
  /**
   * Página real só para Vender e para o login: sem as pílulas, o Início e os botões de rota
   * (as telas do GoClient fazem isso); só esconde o menu do Kyte e aplica a fonte.
   */
  minimal?: boolean;
}): string {
  const accent = '#0A84FF';
  const css = [
    // Fonte do sistema (a mesma família do app) e cantos arredondados nos controles.
    'html,body,input,button,select,textarea{font-family:-apple-system,"SF Pro Text","SF Pro Display",Roboto,"Helvetica Neue",Arial,sans-serif!important;-webkit-font-smoothing:antialiased}',
    'button,input,select,textarea{border-radius:12px!important}',
    '::-webkit-scrollbar{width:0!important;height:0!important}',
    // Chat de ajuda flutuante do Kyte (Intercom) fica escondido: o app tem a Havena.
    '#intercom-container,.intercom-lightweight-app,.intercom-launcher{display:none!important}',
    // Pílulas do GoClient no topo da própria página.
    `#gc-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;gap:12px;align-items:center;padding:14px 24px;background:${dark ? '#0b0b0c' : '#f2f2f7'};border-bottom:1px solid ${dark ? '#2c2c2e' : '#d8d8dc'}}`,
    `#gc-bar button{all:unset;cursor:pointer;font:600 ${phone ? 26 : 20}px -apple-system,Roboto,sans-serif;padding:${phone ? '14px 26px' : '10px 22px'};border-radius:999px!important;color:${dark ? '#f2f2f7' : '#1c1c1e'};background:${dark ? '#1c1c1e' : '#fff'};transition:background .25s,color .25s,transform .2s}`,
    '#gc-bar button:active{transform:scale(.96)}',
    `#gc-bar button.on{background:${accent};color:#fff}`,
    `body{padding-top:${phone ? 92 : 72}px!important}`,
    // Início desenhado dentro da página.
    `#gc-home{position:fixed;left:0;right:0;bottom:0;top:${phone ? 92 : 72}px;z-index:2147482000;overflow:auto;padding:32px;background:${dark ? '#0b0b0c' : '#f2f2f7'};color:${dark ? '#f2f2f7' : '#1c1c1e'};font-family:-apple-system,Roboto,sans-serif;animation:gcIn .35s cubic-bezier(.2,.8,.2,1)}`,
    '@keyframes gcIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '#gc-home h1{font-size:44px;margin:0 0 4px;font-weight:700;letter-spacing:-.5px}',
    `#gc-home .sub{opacity:.6;font-size:${phone ? 24 : 18}px;margin-bottom:28px}`,
    '#gc-home .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:24px}',
    `#gc-home .card{background:${dark ? '#1c1c1e' : '#fff'};border-radius:22px;padding:22px}`,
    `#gc-home .card .l{opacity:.6;font-size:${phone ? 24 : 18}px}`,
    `#gc-home .card .v{font-size:${phone ? 40 : 32}px;font-weight:700;margin-top:6px}`,
    `#gc-home .card .n{opacity:.6;font-size:${phone ? 22 : 16}px;margin-top:2px}`,
    `#gc-home .sell{all:unset;cursor:pointer;display:block;text-align:center;background:${accent};color:#fff;font-weight:600;font-size:${phone ? 30 : 22}px;padding:${phone ? '26px' : '20px'};border-radius:999px!important}`,
    '#gc-home .err{opacity:.7;margin-bottom:20px}',
    // Botões de rota na ficha do cliente.
    `#gc-route{position:fixed;right:28px;bottom:28px;z-index:2147482500;display:flex;gap:12px;padding:12px;border-radius:999px;background:${dark ? 'rgba(28,28,30,.96)' : 'rgba(255,255,255,.96)'};box-shadow:0 8px 30px rgba(0,0,0,.25);animation:gcIn .3s cubic-bezier(.2,.8,.2,1)}`,
    `#gc-route button{all:unset;cursor:pointer;font:600 ${phone ? 26 : 19}px -apple-system,Roboto,sans-serif;padding:${phone ? '16px 28px' : '12px 22px'};border-radius:999px!important;color:#fff;background:${accent}}`,
    `#gc-route button.alt{background:${dark ? '#2c2c2e' : '#e5e5ea'};color:${dark ? '#f2f2f7' : '#1c1c1e'}}`,
    `#gc-route .msg{font:500 ${phone ? 22 : 16}px -apple-system,Roboto,sans-serif;align-self:center;padding:0 10px;opacity:.75;color:${dark ? '#f2f2f7' : '#1c1c1e'}}`,
    // Tema escuro do app: inverte as cores da página e desinverte fotos e vídeos (nossos
    // elementos já vêm escuros, então também são desinvertidos).
    ...(dark
      ? [
          'html{background:#fff!important;filter:invert(.92) hue-rotate(180deg)!important}',
          'img,video,canvas,picture,iframe,[style*="background-image"],#gc-bar,#gc-home,#gc-route{filter:invert(1) hue-rotate(180deg)!important}',
        ]
      : []),
  ].join('\n');
  const sections = KYTE_SECTIONS.map((s) => [s.key, s.label, s.menu]);

  // biome-ignore format: script injetado, mantido legível em uma função só
  return `(function(){
  var AGENT = ${agent ? 'true' : 'false'};
  var MINIMAL = ${minimal ? 'true' : 'false'};
  var CSS = ${JSON.stringify(agent ? '' : minimal ? minimalCss(dark) : css)};
  var PHONE = ${phone ? 'true' : 'false'};
  var SECTIONS = ${JSON.stringify(sections)};
  function post(m){ try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch(e){} }
  // Login de verdade: não basta estar em web.kyteapp.com (a página "/" abre antes de o Kyte
  // mandar para a tela de login). Só conta como logado quando o menu do Kyte aparece; e conta
  // como deslogado só na tela de login ou com campo de senha. No meio disso: null (sem saber).
  var sessionOk = false;
  function onLoginPage(){
    return location.hostname !== 'web.kyteapp.com' || /^\\/(login|external-login|signin)/.test(location.pathname) || !!document.querySelector('input[type=password]');
  }
  function hasMenu(){
    var seen = {};
    Array.prototype.forEach.call(document.querySelectorAll('a,button,li,span,p'), function(e){
      if (e.children.length > 4) return;
      var t = (e.textContent || '').trim(); if (LABELS.test(t)) seen[t.toLowerCase()] = 1;
    });
    return Object.keys(seen).length >= 3;
  }
  function loginState(){
    if (onLoginPage()) { sessionOk = false; return false; }
    if (!sessionOk && (document.querySelector('[data-goclient-nav]') || hasMenu())) sessionOk = true;
    return sessionOk ? true : null;
  }
  function logged(){ return loginState() === true; }
  function style(){
    if (CSS && !document.getElementById('goclient-style')) {
      var s = document.createElement('style'); s.id = 'goclient-style'; s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    }
    // No celular o Kyte Web (versão de computador) é desenhado mais largo e reduzido para caber.
    if (PHONE && document.head && !document.getElementById('goclient-viewport')) {
      var old = document.querySelector('meta[name=viewport]'); if (old) old.remove();
      var m = document.createElement('meta'); m.id = 'goclient-viewport'; m.name = 'viewport';
      m.content = 'width=860'; document.head.appendChild(m);
    }
  }
  var LABELS = /^(Vendedor|In[ií]cio|Painel|Produtos|Clientes|Pedidos|Kai|Cat[aá]logo Online|Vendas|Hist[oó]rico|Finan[cç]as|Estat[ií]sticas|Configura[cç][oõ]es|Usu[aá]rios)$/i;
  function hideNav(){
    if (AGENT || !logged() || document.querySelector('[data-goclient-nav]')) return;
    var hits = Array.prototype.filter.call(document.querySelectorAll('a,button,li,div,span,p'), function(e){
      if (e.children.length > 4) return false;
      var t = (e.innerText || '').trim(); if (!LABELS.test(t)) return false;
      var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left < innerWidth * 0.3;
    });
    if (hits.length < 3) return;
    // A coluna do menu: o ancestral estreito (até 35% da largura) que reúne mais itens do
    // menu. Títulos soltos com o mesmo texto (ex.: "Produtos" no topo da página) ficam fora.
    var counts = new Map();
    hits.forEach(function(h){
      for (var e = h.parentElement, i = 0; e && e !== document.body && i < 14; e = e.parentElement, i++) {
        counts.set(e, (counts.get(e) || 0) + 1);
      }
    });
    var anc = null, best = 0, bestW = 0;
    counts.forEach(function(n, e){
      var w = e.getBoundingClientRect().width;
      if (n < 3 || w <= 0 || w > innerWidth * 0.35) return;
      if (n > best || (n === best && w > bestW)) { anc = e; best = n; bestW = w; }
    });
    if (!anc) return;
    anc.setAttribute('data-goclient-nav', '1');
    anc.style.setProperty('display', 'none', 'important');
    post({ type: 'nav', hidden: true });
  }
  function click(e){
    ['pointerdown','mousedown','pointerup','mouseup'].forEach(function(t){ e.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); });
    e.click();
  }
  /** Abre uma tela do Kyte clicando no item do menu dele (escondido). */
  function openMenu(label){
    var re = new RegExp('^' + label + '$', 'i');
    var nav = document.querySelector('[data-goclient-nav]') || document.body;
    var hit = Array.prototype.find.call(nav.querySelectorAll('a,button,li,div,span'), function(e){
      return e.children.length <= 3 && re.test((e.innerText || e.textContent || '').trim());
    });
    if (hit) { click(hit.closest('a,button,li') || hit); return true; }
    return false;
  }
  var homeOpen = false;
  function current(){
    if (homeOpen) return 'inicio';
    var h = (document.querySelector('h1,h2') || {}).innerText || '';
    if (/^Vendedor/i.test(h)) return 'vender';
    if (/^Produto|Cadastrar produto/i.test(h)) return 'produtos';
    if (/^Hist[oó]rico/i.test(h)) return 'historico';
    if (/^Clientes|Cadastro de clientes/i.test(h) || document.querySelector('#gc-route')) return 'clientes';
    return '';
  }
  function select(key){
    var sec = SECTIONS.find(function(s){ return s[0] === key; }); if (!sec) return;
    if (key === 'inicio') { showHome(); }
    else { hideHome(); openMenu(sec[2]); }
    setTimeout(paintBar, 120);
  }
  window.__goclientSelect = select;
  function paintBar(){
    var bar = document.getElementById('gc-bar'); if (!bar) return;
    var cur = current();
    Array.prototype.forEach.call(bar.children, function(b){ b.className = b.getAttribute('data-k') === cur ? 'on' : ''; });
  }
  function ensureBar(){
    if (AGENT || MINIMAL || !logged()) { var old = document.getElementById('gc-bar'); if (old) old.remove(); return; }
    if (!document.body || document.getElementById('gc-bar')) { paintBar(); return; }
    var bar = document.createElement('div'); bar.id = 'gc-bar';
    SECTIONS.forEach(function(s){
      var b = document.createElement('button'); b.textContent = s[1]; b.setAttribute('data-k', s[0]);
      b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); select(s[0]); });
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
    paintBar();
  }
  // Início: desenhado aqui; os números chegam do app (janela invisível lê o Histórico).
  function showHome(){
    homeOpen = true;
    var h = document.getElementById('gc-home');
    if (!h) { h = document.createElement('div'); h.id = 'gc-home'; document.body.appendChild(h); }
    h.innerHTML = '<h1>Início</h1><div class="sub">Resumo das vendas no Kyte</div><div class="sub">Carregando os números…</div>' + sellBtn();
    bindSell(h);
    post({ type: 'home' });
  }
  function hideHome(){ homeOpen = false; var h = document.getElementById('gc-home'); if (h) h.remove(); }
  function sellBtn(){ return '<button class="sell">Registrar venda</button>'; }
  function bindSell(h){ var b = h.querySelector('.sell'); if (b) b.addEventListener('click', function(){ select('vender'); }); }
  window.__gcHomeData = function(d){
    var h = document.getElementById('gc-home'); if (!h) return;
    var card = function(l, v){ return '<div class="card"><div class="l">' + l + '</div><div class="v">' + (v ? v.total : '—') + '</div><div class="n">' + (v ? v.count + (v.count === 1 ? ' venda' : ' vendas') : '') + '</div></div>'; };
    h.innerHTML = '<h1>Início</h1><div class="sub">Resumo das vendas no Kyte</div>' +
      (d.error ? '<div class="err">' + d.error + '</div>' : '') +
      '<div class="grid">' + card('Hoje', d.today) + card('Ontem', d.yesterday) + card('Esta semana', d.week) + card('Este mês', d.month) + '</div>' + sellBtn();
    bindSell(h);
  };
  // Ficha do cliente: Colocar na rota / Ir agora (com o endereço cadastrado no Kyte).
  function field(re){
    return Array.prototype.find.call(document.querySelectorAll('input,textarea'), function(i){
      if (!i.offsetParent) return false;
      var t = (i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '');
      var box = i.parentElement;
      for (var k = 0; box && k < 3; k++, box = box.parentElement) { var lab = box.querySelector('label,legend'); if (lab) { t += ' ' + lab.innerText; break; } }
      return re.test(t);
    });
  }
  function readClient(){
    var v = function(re){ var f = field(re); return f ? f.value.trim() : ''; };
    var title = ((document.querySelector('h1,h2') || {}).innerText || '').trim();
    return {
      name: v(/^\\s*nome/i) || title,
      phone: v(/celular/i) || v(/telefone/i),
      address: [v(/endere[cç]o/i), v(/complemento/i)].filter(Boolean).join(', '),
    };
  }
  function ensureRoute(){
    var isClient = !AGENT && !MINIMAL && logged() && !homeOpen && field(/endere[cç]o/i) && field(/^\\s*nome/i) && !/Cadastrar produto/i.test(((document.querySelector('h1,h2') || {}).innerText || ''));
    var box = document.getElementById('gc-route');
    if (!isClient) { if (box) box.remove(); return; }
    if (box) return;
    box = document.createElement('div'); box.id = 'gc-route';
    box.innerHTML = '<span class="msg"></span><button class="alt" data-now="0">Colocar na rota</button><button data-now="1">Ir agora</button>';
    Array.prototype.forEach.call(box.querySelectorAll('button'), function(b){
      b.addEventListener('click', function(){
        var c = readClient(), msg = box.querySelector('.msg');
        if (!c.address) { msg.textContent = 'Cadastre o endereço deste cliente primeiro.'; return; }
        msg.textContent = b.getAttribute('data-now') === '1' ? 'Abrindo a rota…' : 'Colocado na rota ✓';
        post({ type: 'client-route', now: b.getAttribute('data-now') === '1', client: c });
      });
    });
    document.body.appendChild(box);
  }
  var last = '';
  function report(){
    var state = loginState();
    var key = location.host + location.pathname + '|' + state;
    if (key === last) return; last = key;
    post({ type: 'route', host: location.hostname, path: location.pathname, logged: state });
  }
  function tidy(){ style(); report(); hideNav(); ensureBar(); ensureRoute(); paintBar(); }
  if (!window.__goclient) {
    window.__goclient = true;
    ['pushState', 'replaceState'].forEach(function(fn){
      var orig = history[fn];
      history[fn] = function(){ var r = orig.apply(this, arguments); setTimeout(tidy, 60); return r; };
    });
    addEventListener('popstate', function(){ setTimeout(tidy, 60); });
    var pending = 0;
    new MutationObserver(function(){
      if (pending) return;
      pending = setTimeout(function(){ pending = 0; tidy(); }, 300);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  tidy();
})(); true;`;
}

/** CSS da página real no modo `minimal`: fonte do sistema, sem barras de rolagem e sem chat. */
function minimalCss(dark: boolean): string {
  return [
    'html,body,input,button,select,textarea{font-family:-apple-system,"SF Pro Text",Roboto,"Helvetica Neue",Arial,sans-serif!important;-webkit-font-smoothing:antialiased}',
    '::-webkit-scrollbar{width:0!important;height:0!important}',
    '#intercom-container,.intercom-lightweight-app,.intercom-launcher{display:none!important}',
    ...(dark ? [] : []),
  ].join('\n');
}
