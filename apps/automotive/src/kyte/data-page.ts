/**
 * Leitura dos dados do Kyte dentro da janela invisível (agent.tsx).
 *
 * O Kyte não tem API pública. Em vez de ler a tela (frágil para listas grandes), a janela
 * guarda as respostas que a própria página do Kyte recebe do servidor (fetch/XHR) e olha o
 * banco local do navegador (IndexedDB, usado por apps que funcionam sem internet). Depois
 * reconhece o que é produto, cliente e venda pelos nomes dos campos e devolve só os campos
 * que o GoClient usa.
 *
 * Como os nomes exatos dos campos do Kyte não são públicos, o reconhecimento aceita vários
 * nomes possíveis (inglês e português). O Diagnóstico (Ajustes → Kyte) mostra o que foi
 * encontrado — só nomes de campos e quantidades, nunca valores — para ajustar se preciso.
 */

/** Roda antes da página do Kyte carregar: guarda as respostas em JSON (até ~8 MB). */
// biome-ignore format: código que roda dentro da página
export const CAPTURE_SCRIPT = String.raw`(function(){
  if (window.__gcNet) return;
  var net = window.__gcNet = { list: [], bytes: 0 };
  function keep(url, method, text) {
    if (!text || text.length < 2 || net.bytes > 8e6) return;
    var c = text.charAt(0);
    if (c !== '{' && c !== '[') return;
    try { var json = JSON.parse(text); } catch (e) { return; }
    net.bytes += text.length;
    net.list.push({ url: String(url), method: method || 'GET', t: Date.now(), json: json });
    if (net.list.length > 400) { var old = net.list.shift(); net.bytes -= JSON.stringify(old.json).length; }
  }
  var f = window.fetch;
  if (f) window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = (init && init.method) || (input && input.method) || 'GET';
    return f.apply(this, arguments).then(function(res) {
      try {
        var ct = res.headers && res.headers.get && res.headers.get('content-type') || '';
        if (/json|text\/plain/.test(ct)) res.clone().text().then(function(t){ keep(url, method, t); }, function(){});
      } catch (e) {}
      return res;
    });
  };
  var open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(m, u) { this.__gc = { m: m, u: u }; return open.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function() {
    var x = this;
    x.addEventListener('load', function() {
      try {
        if (x.responseType === '' || x.responseType === 'text') keep(x.__gc && x.__gc.u, x.__gc && x.__gc.m, x.responseText);
        else if (x.responseType === 'json' && x.response) keep(x.__gc && x.__gc.u, x.__gc && x.__gc.m, JSON.stringify(x.response));
      } catch (e) {}
    });
    return send.apply(this, arguments);
  };
})(); true;`;

/**
 * Reconhecimento e leitura (usa `A`, os ajudantes de agent-page.ts). Define `A.read(kind)` e
 * `A.diagnose()`.
 */
// biome-ignore format: código que roda dentro da página
export const DATA_HELPERS = String.raw`(function(){
  var A = window.__gcA; if (!A || A.read) return;
  var low = function(s){ return String(s).toLowerCase().replace(/[_\-\s]/g, ''); };

  // Documentos do Firestore ({ fields: { nome: { stringValue: ... } } }) viram objetos comuns.
  function fsValue(v) {
    if (!v || typeof v !== 'object') return v;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('mapValue' in v) return fsFields((v.mapValue || {}).fields || {});
    if ('arrayValue' in v) return ((v.arrayValue || {}).values || []).map(fsValue);
    return v;
  }
  function fsFields(f) { var o = {}; Object.keys(f).forEach(function(k){ o[k] = fsValue(f[k]); }); return o; }
  function plain(o) {
    if (o && typeof o === 'object' && o.fields && typeof o.fields === 'object' && !Array.isArray(o.fields)) {
      var r = fsFields(o.fields); if (o.name && !r.id) r.id = String(o.name).split('/').pop(); return r;
    }
    if (o && o.document && o.document.fields) return plain(o.document);
    return o;
  }

  /** Valor de um campo pelo nome (vários nomes possíveis), também um nível abaixo. */
  function pick(o, names, depth) {
    if (!o || typeof o !== 'object') return undefined;
    var keys = Object.keys(o), want = names.map(low);
    for (var i = 0; i < want.length; i++)
      for (var k = 0; k < keys.length; k++)
        if (low(keys[k]) === want[i] && o[keys[k]] != null && o[keys[k]] !== '') return o[keys[k]];
    if ((depth || 0) < 1)
      for (var j = 0; j < keys.length; j++) {
        var v = o[keys[j]];
        if (v && typeof v === 'object' && !Array.isArray(v)) { var r = pick(v, names, 1); if (r !== undefined) return r; }
      }
    return undefined;
  }
  function has(o, names) { return pick(o, names, 1) !== undefined; }
  var N = {
    id: ['id', '_id', 'uid', 'key', 'objectId'],
    name: ['name', 'nome', 'title', 'titulo'],
    price: ['salePrice', 'sellPrice', 'price', 'preco', 'precoVenda', 'precoDeVenda', 'unitPrice', 'valorVenda'],
    stock: ['stock', 'estoque', 'currentStock', 'stockQuantity', 'quantityInStock', 'inventory'],
    image: ['image', 'imageUrl', 'imageURL', 'photo', 'photoUrl', 'picture', 'img', 'thumbnail', 'thumb', 'imagem', 'foto'],
    code: ['code', 'codigo', 'sku', 'barcode', 'codigoDeBarras'],
    category: ['category', 'categoria', 'categoryName'],
    phone: ['celPhone', 'cellPhone', 'cellphone', 'celular', 'mobile', 'phone', 'telefone', 'phoneNumber', 'whatsapp', 'fone'],
    email: ['email', 'e-mail', 'mail'],
    address: ['address', 'endereco', 'street', 'logradouro', 'addressLine', 'fullAddress'],
    complement: ['addressComplement', 'complement', 'complemento'],
    district: ['neighborhood', 'bairro', 'district'],
    city: ['city', 'cidade'],
    balance: ['accountBalance', 'balance', 'saldo', 'creditBalance', 'currentBalance'],
    number: ['number', 'saleNumber', 'numero', 'orderNumber', 'sequential', 'serial', 'code', 'codigo'],
    date: ['dateClosed', 'closedAt', 'dateCreation', 'createdAt', 'created_at', 'date', 'data', 'timestamp', 'creationDate'],
    total: ['totalNet', 'total', 'totalValue', 'totalPaid', 'amount', 'valorTotal', 'valor', 'grandTotal'],
    items: ['items', 'itens', 'products', 'produtos', 'cart', 'lineItems', 'saleItems'],
    qty: ['amount', 'quantity', 'qty', 'quantidade', 'qtd', 'fraction'],
    payments: ['payments', 'pagamentos', 'payment', 'paymentMethod', 'paymentType', 'pagamento', 'formaDePagamento'],
    status: ['status', 'situacao', 'state'],
    canceled: ['canceled', 'cancelled', 'isCanceled', 'isCancelled', 'cancelado'],
    seller: ['userName', 'sellerName', 'seller', 'vendedor', 'user', 'createdBy'],
    customer: ['customer', 'cliente', 'client', 'customerData'],
  };

  function kindOf(o) {
    o = plain(o);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    var items = pick(o, N.items, 1);
    if (Array.isArray(items) && has(o, N.total)) return 'sale';
    if (has(o, N.total) && has(o, N.date) && (has(o, N.customer) || has(o, N.payments))) return 'sale';
    if (has(o, N.name) && has(o, N.price) && !Array.isArray(items)) return 'product';
    if (has(o, N.name) && (has(o, N.phone) || has(o, N.email) || has(o, N.balance) || has(o, N.address)) && !has(o, N.price)) return 'customer';
    return null;
  }

  /** Todas as listas de objetos dentro de um JSON (até 4 níveis). */
  function arrays(json, out, depth) {
    out = out || []; depth = depth || 0;
    if (depth > 4 || !json || typeof json !== 'object') return out;
    if (Array.isArray(json)) {
      if (json.length && typeof json[0] === 'object') out.push(json);
      if (json.length && Array.isArray(json[0])) json.forEach(function(a){ arrays(a, out, depth + 1); });
      return out;
    }
    // Dentro de uma venda, os itens não são o cadastro de produtos.
    if (kindOf(json) === 'sale') return out;
    // Mapa id → objeto (comum em bancos sincronizados).
    var vals = Object.keys(json).map(function(k){ return json[k]; });
    if (vals.length > 3 && vals.every(function(v){ return v && typeof v === 'object' && !Array.isArray(v); })) out.push(vals);
    vals.forEach(function(v){ if (v && typeof v === 'object') arrays(v, out, depth + 1); });
    return out;
  }
  function classify(list) {
    var c = { sale: 0, product: 0, customer: 0 }, n = Math.min(list.length, 12);
    for (var i = 0; i < n; i++) { var k = kindOf(list[i]); if (k) c[k]++; }
    var best = null; Object.keys(c).forEach(function(k){ if (c[k] > n / 2 && (!best || c[k] > c[best])) best = k; });
    return best;
  }

  /** Banco local do navegador: todas as tabelas (até 3000 registros cada). */
  A.idb = async function() {
    var out = [];
    if (!window.indexedDB || !indexedDB.databases) return out;
    var dbs = await indexedDB.databases().catch(function(){ return []; });
    for (var d = 0; d < dbs.length; d++) {
      var name = dbs[d].name; if (!name) continue;
      var db = await new Promise(function(res){ var r = indexedDB.open(name); r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ res(null); }; r.onupgradeneeded = function(){ try { r.transaction.abort(); } catch (e) {} res(null); }; });
      if (!db) continue;
      var stores = Array.prototype.slice.call(db.objectStoreNames);
      for (var s = 0; s < stores.length; s++) {
        var rows = await new Promise(function(res){
          try { var q = db.transaction(stores[s], 'readonly').objectStore(stores[s]).getAll(null, 3000); q.onsuccess = function(){ res(q.result || []); }; q.onerror = function(){ res([]); }; }
          catch (e) { res([]); }
        });
        out.push({ db: name, store: stores[s], rows: rows });
      }
      db.close();
    }
    return out;
  };

  /** Junta as listas de um tipo vindas da rede e do banco local, sem repetir. */
  A.collect = async function(kind) {
    var seen = {}, out = [];
    function add(list) {
      list.forEach(function(o){
        o = plain(o); if (kindOf(o) !== kind) return;
        var id = String(pick(o, N.id, 1) || pick(o, N.number, 1) || JSON.stringify(o).slice(0, 80));
        if (!seen[id]) { seen[id] = 1; out.push(o); }
      });
    }
    var net = (window.__gcNet || { list: [] }).list;
    for (var i = net.length - 1; i >= 0; i--) arrays(net[i].json).forEach(function(l){ if (classify(l.map(plain)) === kind) add(l); });
    var dbs = await A.idb();
    dbs.forEach(function(t){
      if (t.rows.length && typeof t.rows[0] === 'object') {
        if (classify(t.rows.map(plain)) === kind) add(t.rows);
        else t.rows.slice(0, 50).forEach(function(r){ arrays(r).forEach(function(l){ if (classify(l.map(plain)) === kind) add(l); }); });
      }
    });
    return out;
  };

  function num(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { var s = v.replace(/[^\d,.\-]/g, ''); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); var n = Number(s); return isNaN(n) ? null : n; }
    if (v && typeof v === 'object') return num(pick(v, ['value', 'valor', 'amount', 'current', 'quantity', 'total'], 1));
    return null;
  }
  function str(v) { return v == null ? '' : typeof v === 'object' ? str(pick(v, N.name.concat(['text', 'value', 'label']), 1)) : String(v); }
  function time(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v < 1e11 ? v * 1000 : v;
    if (typeof v === 'object') return time(v.seconds != null ? v.seconds : v._seconds != null ? v._seconds : v.$date || v.value);
    var t = Date.parse(v); return isNaN(t) ? null : t;
  }
  function img(v) {
    var s = typeof v === 'string' ? v : v && typeof v === 'object' ? (pick(v, ['url', 'uri', 'src', 'thumb', 'small', 'medium'], 1) || '') : '';
    return /^https?:/.test(s) ? s : '';
  }
  var mapper = {
    product: function(o) {
      return { id: str(pick(o, N.id, 1)), name: str(pick(o, N.name, 1)), price: num(pick(o, N.price, 1)),
        stock: num(pick(o, N.stock, 1)), image: img(pick(o, N.image, 1)), code: str(pick(o, N.code, 1)),
        category: str(pick(o, N.category, 1)) };
    },
    customer: function(o) {
      return { id: str(pick(o, N.id, 1)), name: str(pick(o, N.name, 1)), phone: str(pick(o, N.phone, 1)),
        email: str(pick(o, N.email, 1)), address: str(pick(o, N.address, 1)), complement: str(pick(o, N.complement, 1)),
        district: str(pick(o, N.district, 1)), city: str(pick(o, N.city, 1)), balance: num(pick(o, N.balance, 1)) };
    },
    sale: function(o) {
      var items = pick(o, N.items, 1), c = pick(o, N.customer, 0), pay = pick(o, N.payments, 1);
      var payName = Array.isArray(pay) ? pay.map(function(p){ return str(pick(p, ['description', 'type', 'name', 'method', 'tipo', 'descricao'], 1)); }).filter(Boolean).join(' + ') : str(pay);
      var st = str(pick(o, N.status, 0)), cancel = pick(o, N.canceled, 0);
      return {
        id: str(pick(o, N.id, 1)), number: str(pick(o, N.number, 0)), date: time(pick(o, N.date, 1)),
        total: num(pick(o, N.total, 0)), payment: payName, seller: str(pick(o, N.seller, 0)),
        canceled: cancel === true || /cancel/i.test(st),
        customer: c && typeof c === 'object' ? { name: str(pick(c, N.name, 1)), phone: str(pick(c, N.phone, 1)), district: str(pick(c, N.district, 1)) } : (c ? { name: str(c), phone: '', district: '' } : null),
        items: Array.isArray(items) ? items.map(function(it){
          it = plain(it);
          var q = num(pick(it, N.qty, 0)), unit = num(pick(it, N.price, 1)), tot = num(pick(it, ['total', 'totalValue', 'subtotal', 'value', 'valor'], 0));
          var NM = ['name', 'nome', 'productName', 'product_name', 'description', 'descricao', 'title', 'label'];
          var prod = pick(it, ['product', 'produto', 'item', 'productData'], 1);
          var nm = str(pick(it, NM, 1)) || (prod && typeof prod === 'object' ? str(pick(prod, NM, 1)) : '') || str(pick(it, NM, 0));
          return { name: nm, qty: q == null ? 1 : q, unitPrice: unit, total: tot != null ? tot : (unit != null ? unit * (q || 1) : null) };
        }) : [],
      };
    },
  };

  /** Dados da loja para o recibo (nome, cabeçalho e rodapé que o Kyte guarda). */
  A.store = async function() {
    var names = ['companyName', 'storeName', 'fantasyName', 'tradeName', 'businessName', 'nomeFantasia', 'razaoSocial'];
    var found = null;
    function look(o, depth) {
      if (found || !o || typeof o !== 'object' || depth > 5) return;
      o = plain(o);
      if (!Array.isArray(o) && has(o, names)) { found = o; return; }
      (Array.isArray(o) ? o.slice(0, 50) : Object.keys(o).map(function(k){ return o[k]; })).forEach(function(v){ look(v, depth + 1); });
    }
    ((window.__gcNet || { list: [] }).list).forEach(function(h){ look(h.json, 0); });
    if (!found) (await A.idb()).forEach(function(t){ t.rows.slice(0, 50).forEach(function(r){ look(r, 0); }); });
    if (!found) return null;
    return {
      name: str(pick(found, names, 1)),
      header: str(pick(found, ['receiptHeader', 'headerText', 'receiptTitle', 'cabecalho', 'description', 'descricao', 'slogan'], 0)),
      footer: str(pick(found, ['receiptFooter', 'footerText', 'receiptMessage', 'rodape', 'observation', 'observacao', 'receiptNote'], 0)),
      logo: img(pick(found, ['logo', 'logoUrl', 'image', 'imageUrl', 'photo'], 0)),
    };
  };

  /** Lista já mapeada de um tipo. */
  A.read = async function(kind) { return (await A.collect(kind)).map(mapper[kind]); };

  /** Só a estrutura (nomes de campos e quantidades), sem nenhum valor. */
  A.diagnose = async function() {
    var path = function(u){ try { var x = new URL(u, location.href); return x.host + x.pathname.replace(/\/[A-Za-z0-9_-]{12,}/g, '/:id').replace(/\/\d+/g, '/:n'); } catch (e) { return '?'; } };
    var keysOf = function(o){ o = plain(o); return o && typeof o === 'object' ? Object.keys(o).slice(0, 40) : []; };
    var eps = {};
    ((window.__gcNet || { list: [] }).list).forEach(function(h){
      var p = h.method + ' ' + path(h.url), e = eps[p] || (eps[p] = { path: p, hits: 0, lists: [] });
      e.hits++;
      arrays(h.json).forEach(function(l){ if (e.lists.length < 4) e.lists.push({ size: l.length, kind: classify(l.map(plain)), keys: keysOf(l[0]) }); });
      if (!e.top) e.top = Array.isArray(h.json) ? ['[lista]'] : keysOf(h.json);
    });
    var dbs = (await A.idb()).map(function(t){ return { db: t.db, store: t.store, size: t.rows.length, kind: t.rows.length ? classify(t.rows.map(plain)) : null, keys: keysOf(t.rows[0]) }; });
    var ls = []; try { for (var i = 0; i < localStorage.length; i++) ls.push(localStorage.key(i)); } catch (e) {}
    var counts = {};
    for (var k of ['product', 'customer', 'sale']) counts[k] = (await A.collect(k)).length;
    return { page: path(location.href), endpoints: Object.keys(eps).map(function(k){ return eps[k]; }), idb: dbs, localStorage: ls, counts: counts };
  };
})(); true;`;
