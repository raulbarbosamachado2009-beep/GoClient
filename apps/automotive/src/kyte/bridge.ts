import type { IconName } from '../ui/primitives';

/**
 * Ponte entre o GoClient e o Kyte Web de verdade (o sistema do Kyte, com a conta GROW).
 *
 * O GoClient não recria telas do Kyte: ele abre o próprio Kyte Web e
 * - navega pelas rotas reais do sistema (lidas do código público do Kyte Web em 20/11/2026:
 *   /products, /customers, /orders, /sales, /finances, /analytics, /catalog, /config);
 * - troca a "casca" do Kyte pela do GoClient (título, subtítulo, busca e botões de seção ficam
 *   no app; o menu lateral do Kyte é escondido) e aplica o visual do app por CSS injetado;
 * - repassa a busca do app para o campo de busca da tela do Kyte que estiver aberta.
 *
 * O Kyte Web usa classes CSS geradas automaticamente (sem nomes estáveis). Por isso o menu e
 * a busca são encontrados pelo conteúdo (textos do menu, posição, placeholder), não por
 * seletores fixos. Se o Kyte mudar a página, o pior caso é o menu dele voltar a aparecer.
 */

export const KYTE_ORIGIN = 'https://web.kyteapp.com';
/** Entrada: o próprio Kyte Web decide (logado → painel; sem login → tela de login). */
export const KYTE_HOME = `${KYTE_ORIGIN}/`;

export interface KyteSection {
  key: string;
  label: string;
  subtitle: string;
  icon: IconName;
  /** Rota do Kyte Web; `null` = tela do próprio GoClient. */
  path: string | null;
  /** Tela do GoClient (quando `path` é nulo). */
  app?: '/rotas';
  /** A tela tem busca no Kyte (repassamos o texto da barra de busca). */
  searchable?: boolean;
  placeholder?: string;
}

export const KYTE_SECTIONS: KyteSection[] = [
  {
    key: 'inicio',
    label: 'Início',
    subtitle: 'Resumo da sua loja no Kyte',
    icon: 'home-outline',
    path: '/',
  },
  {
    key: 'clientes',
    label: 'Clientes',
    subtitle: 'Sua carteira de clientes no Kyte',
    icon: 'people-outline',
    path: '/customers',
    searchable: true,
    placeholder: 'Buscar cliente',
  },
  {
    key: 'produtos',
    label: 'Produtos',
    subtitle: 'Catálogo, preços e estoque',
    icon: 'pricetags-outline',
    path: '/products',
    searchable: true,
    placeholder: 'Buscar produto ou código',
  },
  {
    key: 'rotas',
    label: 'Rotas',
    subtitle: 'Visitas do dia (GoClient)',
    icon: 'trail-sign-outline',
    path: null,
    app: '/rotas',
  },
  {
    key: 'pedidos',
    label: 'Pedidos',
    subtitle: 'Pedidos da loja e do catálogo',
    icon: 'receipt-outline',
    path: '/orders',
    searchable: true,
    placeholder: 'Buscar pedido',
  },
  {
    key: 'vendas',
    label: 'Vendas',
    subtitle: 'Vendas registradas no Kyte',
    icon: 'cash-outline',
    path: '/sales',
    searchable: true,
    placeholder: 'Buscar venda',
  },
  {
    key: 'financas',
    label: 'Finanças',
    subtitle: 'Entradas, saídas e saldo',
    icon: 'wallet-outline',
    path: '/finances',
  },
  {
    key: 'estatisticas',
    label: 'Estatísticas',
    subtitle: 'Desempenho da loja',
    icon: 'stats-chart-outline',
    path: '/analytics',
  },
  {
    key: 'catalogo',
    label: 'Catálogo',
    subtitle: 'Seu catálogo online',
    icon: 'storefront-outline',
    path: '/catalog',
  },
  {
    key: 'config',
    label: 'Ajustes do Kyte',
    subtitle: 'Loja, usuários e preferências',
    icon: 'settings-outline',
    path: '/config',
  },
];

export function sectionByKey(key: string | undefined) {
  return KYTE_SECTIONS.find((s) => s.key === key);
}

export function sectionByPath(path: string) {
  const clean = path.replace(/\/+$/, '') || '/';
  return (
    KYTE_SECTIONS.find((s) => s.path && s.path !== '/' && clean.startsWith(s.path)) ??
    (clean === '/' ? KYTE_SECTIONS[0] : undefined)
  );
}

/** Mensagens que a página do Kyte manda para o app. */
export type KyteMessage =
  | { type: 'route'; host: string; path: string; logged: boolean }
  | { type: 'search'; ok: boolean }
  | { type: 'nav'; hidden: boolean };

/**
 * Script injetado na página do Kyte (Android/WebView). Roda a cada carregamento e acompanha a
 * navegação interna do Kyte (que troca de tela sem recarregar).
 */
export function kyteScript({ dark, phone }: { dark: boolean; phone: boolean }): string {
  const css = [
    // Fonte do sistema (a mesma família do app) e cantos arredondados nos controles.
    'html,body,input,button,select,textarea{font-family:-apple-system,"SF Pro Text","SF Pro Display",Roboto,"Helvetica Neue",Arial,sans-serif!important;-webkit-font-smoothing:antialiased}',
    'button,input,select,textarea{border-radius:12px!important}',
    '::-webkit-scrollbar{width:0!important;height:0!important}',
    // Chat de ajuda flutuante do Kyte (Intercom) fica escondido: o app tem a Havena.
    '#intercom-container,.intercom-lightweight-app,.intercom-launcher{display:none!important}',
    // Tema escuro do app: inverte as cores da página e desinverte fotos e vídeos.
    ...(dark
      ? [
          'html{background:#fff!important;filter:invert(.92) hue-rotate(180deg)!important}',
          'img,video,canvas,picture,iframe,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important}',
        ]
      : []),
  ].join('\n');

  // biome-ignore format: script injetado, mantido legível em uma função só
  return `(function(){
  var CSS = ${JSON.stringify(css)};
  var PHONE = ${phone ? 'true' : 'false'};
  function post(m){ try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch(e){} }
  function logged(){ return location.hostname === 'web.kyteapp.com' && !/^\\/(login|external-login)/.test(location.pathname); }
  function style(){
    if (!document.getElementById('goclient-style')) {
      var s = document.createElement('style'); s.id = 'goclient-style'; s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    }
    // No celular o Kyte Web (versão de computador) é desenhado largo e reduzido para caber.
    if (PHONE && document.head && !document.getElementById('goclient-viewport')) {
      var old = document.querySelector('meta[name=viewport]'); if (old) old.remove();
      var m = document.createElement('meta'); m.id = 'goclient-viewport'; m.name = 'viewport';
      m.content = 'width=1100'; document.head.appendChild(m);
    }
  }
  var LABELS = /^(In[ií]cio|Painel|Produtos|Clientes|Pedidos|Vendas|Finan[cç]as|Estat[ií]sticas|Cat[aá]logo|Configura[cç][oõ]es|Usu[aá]rios|Products|Customers|Orders|Sales|Analytics|Catalog|Settings)$/i;
  function hideNav(){
    if (!logged() || document.querySelector('[data-goclient-nav]')) return;
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
  var last = '';
  function report(){
    var key = location.host + location.pathname;
    if (key === last) return; last = key;
    post({ type: 'route', host: location.hostname, path: location.pathname, logged: logged() });
  }
  function tidy(){ style(); report(); hideNav(); }
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
    // Navegação pedida pelo app (botões de seção): troca de tela dentro do próprio Kyte.
    window.__goclientGo = function(path){
      if (location.hostname !== 'web.kyteapp.com') { location.href = 'https://web.kyteapp.com' + path; return; }
      history.pushState({}, '', path);
      dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      setTimeout(function(){ if (location.pathname !== path) location.href = path; }, 500);
    };
    // Busca pedida pelo app: preenche o campo de busca da tela aberta no Kyte.
    window.__goclientSearch = function(q){
      var inputs = Array.prototype.filter.call(document.querySelectorAll('input'), function(i){
        return i.offsetParent !== null && (i.type === 'search' || /(busc|pesquis|procur|search|filtr)/i.test((i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '')));
      });
      var i = inputs[0];
      if (!i) { post({ type: 'search', ok: false }); return; }
      var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(i, q);
      i.dispatchEvent(new Event('input', { bubbles: true }));
      i.dispatchEvent(new Event('change', { bubbles: true }));
      post({ type: 'search', ok: true });
    };
  }
  tidy();
})(); true;`;
}
