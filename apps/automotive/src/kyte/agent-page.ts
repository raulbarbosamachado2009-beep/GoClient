/**
 * Ações dentro da página do Kyte Web, usadas pela janela invisível da Havena (agent.tsx).
 *
 * O Kyte não tem API pública: as ações são feitas na própria página, como uma pessoa faria
 * (menu → busca → abrir a ficha → ler os campos). As telas foram mapeadas pelos prints do
 * Kyte Web logado (22/11/2026): menu "Vendedor · Pedidos · Produtos · Kai · Catálogo Online ·
 * Clientes · Histórico · Finanças · Estatísticas"; Clientes com busca "Procure por nome" e
 * botão "+ Cliente"; ficha com Nome, Telefone/Celular e Endereço/Complemento; Produtos com
 * "+ Produto" ("Nome do Produto", "Preço de Venda"); Histórico com "Hoje / Ontem / Esta
 * semana / Este mês". As classes CSS do Kyte são geradas (sem nomes estáveis), então tudo é
 * encontrado por texto. Se o Kyte mudar a página, a ação falha com uma mensagem clara.
 */

// biome-ignore format: código que roda dentro da página, mantido legível num bloco só
export const AGENT_HELPERS = `(function(){
  if (window.__gcA) return;
  var A = window.__gcA = {};
  A.sleep = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  A.norm = function(t){ return String(t || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim(); };
  A.visible = function(e){ var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  A.waitFor = async function(fn, ms, what){
    var start = Date.now();
    while (Date.now() - start < (ms || 9000)) {
      try { var v = fn(); if (v) return v; } catch (e) {}
      await A.sleep(80);
    }
    throw new Error('O Kyte não mostrou ' + (what || 'a tela esperada') + ' a tempo.');
  };
  /** Assinatura de um resultado (para saber se mudou). */
  A.sig = function(v){ try { return JSON.stringify(v); } catch (e) { return String(v); } };
  /**
   * Espera o resultado de \`fn\` mudar em relação a \`before\` (ex.: a lista depois de digitar
   * na busca) e parar de mudar por \`quiet\` ms. Se não mudar até \`max\` ms, segue com o que
   * tem (antes era sempre uma pausa fixa de 1,3 s).
   */
  A.afterChange = async function(fn, before, max, quiet){
    var start = Date.now(), last = A.sig(fn()), since = Date.now(), changed = last !== before;
    max = max || 1300; quiet = quiet || 250;
    while (Date.now() - start < max) {
      await A.sleep(80);
      var now = A.sig(fn());
      if (now !== last) { last = now; since = Date.now(); changed = changed || now !== before; }
      else if (changed && Date.now() - since >= quiet) return;
    }
  };
  /** Espera a página parar de receber dados do servidor por \`quiet\` ms (até \`max\` ms). */
  A.netQuiet = async function(quiet, max){
    var start = Date.now(), net = window.__gcNet;
    // Dá tempo de a página pedir a próxima parte da lista depois da rolagem.
    await A.sleep(300);
    while (Date.now() - start < (max || 1500)) {
      var l = net && net.list[net.list.length - 1];
      if (!l || Date.now() - l.t >= (quiet || 400)) return;
      await A.sleep(100);
    }
  };
  A.click = function(e){
    try { e.scrollIntoView({ block: 'center' }); } catch (x) {}
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(function(t){
      e.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    });
    e.click();
  };
  A.leaves = function(re, root){
    return Array.prototype.filter.call((root || document).querySelectorAll('a,button,li,div,span,p,h1,h2,h3,td,label'), function(e){
      return e.children.length <= 3 && re.test((e.innerText || '').trim());
    });
  };
  /** Abre uma tela pelo menu do Kyte (mesmo escondido). */
  A.menu = async function(label){
    var re = new RegExp('^' + label + '$', 'i');
    var nav = document.querySelector('[data-goclient-nav]') || document.body;
    var hit = A.leaves(re, nav)[0];
    if (!hit) throw new Error('Não achei "' + label + '" no menu do Kyte.');
    A.click(hit.closest('a,button,li') || hit);
    await A.sleep(120);
  };
  /** Rótulo de um campo: placeholder, aria-label ou a legenda escrita junto dele. */
  A.labelOf = function(i){
    var t = (i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '') + ' ' + (i.name || '');
    var box = i.parentElement;
    for (var k = 0; box && k < 3; k++, box = box.parentElement) {
      var lab = box.querySelector('label,legend');
      if (lab && lab.innerText) { t += ' ' + lab.innerText; break; }
    }
    return t;
  };
  A.field = function(re){
    return Array.prototype.find.call(document.querySelectorAll('input,textarea'), function(i){
      return A.visible(i) && re.test(A.labelOf(i));
    });
  };
  A.set = function(i, v){
    var proto = i.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(i, v);
    i.dispatchEvent(new Event('input', { bubbles: true }));
    i.dispatchEvent(new Event('change', { bubbles: true }));
    i.dispatchEvent(new Event('blur', { bubbles: true }));
  };
  A.button = function(re){
    return Array.prototype.find.call(document.querySelectorAll('button,a,[role=button]'), function(b){
      return A.visible(b) && re.test((b.innerText || b.getAttribute('aria-label') || '').trim());
    });
  };
  /** Nomes de clientes visíveis na lista (linhas com as iniciais + nome). */
  A.clientNames = function(){
    var seen = {}, out = [];
    Array.prototype.forEach.call(document.querySelectorAll('div,span,p,td,a'), function(e){
      if (e.children.length) return;
      var t = (e.innerText || '').trim();
      if (t.length < 3 || t.length > 80 || /^R\\$|^[A-Z]{2}$|Procure|Exportar|Cliente$|Nome$|Saldo|E-mail|Celular/.test(t)) return;
      if (!A.visible(e) || e.getBoundingClientRect().left > innerWidth * 0.55) return;
      // Linha da lista: um ancestral próximo e curto que mostra o saldo (R$).
      var row = null;
      for (var p = e.parentElement, k = 0; p && k < 4; p = p.parentElement, k++) {
        var tx = p.innerText || '';
        if (tx.length > 160) break;
        if (/R\\$/.test(tx)) { row = p; break; }
      }
      if (!row) return;
      if (!seen[t]) { seen[t] = 1; out.push({ name: t, el: e }); }
    });
    return out;
  };
  /** Lê a ficha do cliente aberta. */
  A.readClient = function(){
    var get = function(re){ var f = A.field(re); return f ? f.value.trim() : ''; };
    var title = (document.querySelector('h1,h2') || {}).innerText || '';
    var addr = get(/^\\s*endere[cç]o|endere[cç]o\\s*$/i) || get(/endere[cç]o/i);
    var comp = get(/complemento/i);
    return {
      name: get(/^\\s*nome/i) || title.trim(),
      phone: get(/celular/i) || get(/telefone/i),
      address: [addr, comp].filter(Boolean).join(', '),
    };
  };
  A.job = function(id, fn){
    var send = function(m){ try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} };
    Promise.resolve().then(fn).then(function(data){ send({ type: 'job', id: id, ok: true, data: data }); },
      function(err){ send({ type: 'job', id: id, ok: false, error: String(err && err.message || err) }); });
  };
})(); true;`;

/** Venda montada nas telas do GoClient, para registrar no Kyte. */
export interface SalePlan {
  items: { name: string; qty: number; unitCents: number | null }[];
  customer: string | null;
  payment: string;
  /** 'sale' = concluir; 'order' = "Salvar pedido"; 'fiado' = "Venda Fiado". */
  mode: 'sale' | 'order' | 'fiado';
  receivedCents: number | null;
  discountCents: number;
  note: string;
}

/**
 * Põe no carrinho do Kyte (tela Vendedor) os itens e o cliente. Deixa em `miss` o que não
 * achou.
 */
const fillCart = (plan: { items: { name: string; qty: number }[]; customer: string | null }) => `
    await A.menu('Vendedor');
    var box = await A.waitFor(function(){ return A.field(/nome ou c[oó]digo|buscar|procur/i); }, 12000, 'a busca de produtos do Kyte');
    var miss = [];
    var items = ${JSON.stringify(plan.items)};
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      A.set(box, it.name);
      var want = A.norm(it.name);
      // Espera só até o produto aparecer (antes: pausa fixa de 0,9 s por item).
      var tile = await A.waitFor(function(){
        return A.leaves(/./).filter(function(e){ return A.visible(e) && A.norm(e.innerText) === want; })[0];
      }, 2000).catch(function(){ return null; });
      if (!tile) { miss.push(it.name); continue; }
      var target = tile.closest('[role=button],button,a,li') || tile.parentElement || tile;
      for (var n = 0; n < Math.round(it.qty); n++) { A.click(target); await A.sleep(250); }
    }
    A.set(box, '');
    var cust = ${JSON.stringify(plan.customer)};
    if (cust) {
      var sel = A.leaves(/^selecionar cliente$/i)[0];
      if (sel) {
        A.click(sel.closest('a,button,[role=button]') || sel);
        var cbox = await A.waitFor(function(){ return A.field(/procure|nome|cliente/i); }, 9000, 'a busca de clientes');
        A.set(cbox, cust);
        var row = await A.waitFor(function(){
          return A.leaves(/./).filter(function(e){ return A.visible(e) && A.norm(e.innerText) === A.norm(cust); })[0];
        }, 2500).catch(function(){ return null; });
        if (row) A.click(row.closest('tr,li,[role=row],[role=button],a,button') || row); else miss.push('cliente ' + cust);
      } else miss.push('cliente ' + cust);
    }
`;

/** Corpo dos trabalhos (rodam com `A` = helpers acima). Cada um devolve dados simples. */
export const JOBS = {
  /** Busca clientes pelo nome; se houver um só (ou um igual), abre a ficha e lê os dados. */
  findClient: (name: string) => `
    await A.menu('Clientes');
    var box = await A.waitFor(function(){ return A.field(/procure|busc|nome/i); }, 9000, 'a lista de clientes');
    var before = A.sig(A.clientNames().map(function(c){ return c.name; }));
    A.set(box, ${JSON.stringify(name)});
    await A.afterChange(function(){ return A.clientNames().map(function(c){ return c.name; }); }, before);
    var q = A.norm(${JSON.stringify(name)});
    var list = A.clientNames().filter(function(c){ return A.norm(c.name).indexOf(q) >= 0; });
    if (!list.length) return { matches: [] };
    var exact = list.filter(function(c){ return A.norm(c.name) === q; });
    var pick = exact.length === 1 ? exact[0] : list.length === 1 ? list[0] : null;
    if (!pick) return { matches: list.slice(0, 8).map(function(c){ return c.name; }) };
    A.click(pick.el.closest('tr,li,[role=row]') || pick.el);
    await A.waitFor(function(){ return A.field(/endere[cç]o/i); }, 9000, 'a ficha do cliente');
    // Campos preenchidos (o Kyte põe os valores logo depois de mostrar a ficha).
    await A.afterChange(function(){ return A.readClient(); }, '', 600, 150);
    var c = A.readClient();
    c.name = c.name || pick.name;
    return { client: c };`,
  /** Nomes da lista de clientes (com busca opcional). */
  listClients: (query: string) => `
    await A.menu('Clientes');
    var box = await A.waitFor(function(){ return A.field(/procure|busc|nome/i); }, 9000, 'a lista de clientes');
    var before = A.sig(A.clientNames().map(function(c){ return c.name; }));
    A.set(box, ${JSON.stringify(query)});
    await A.afterChange(function(){ return A.clientNames().map(function(c){ return c.name; }); }, before, ${query ? 1300 : 700});
    return { names: A.clientNames().slice(0, 40).map(function(c){ return c.name; }) };`,
  /** Abre a ficha de um cliente pelo nome exato e lê os dados. */
  openClient: (name: string) => `
    await A.menu('Clientes');
    var box = await A.waitFor(function(){ return A.field(/procure|busc|nome/i); }, 9000, 'a lista de clientes');
    var before = A.sig(A.clientNames().map(function(c){ return c.name; }));
    A.set(box, ${JSON.stringify(name)});
    await A.afterChange(function(){ return A.clientNames().map(function(c){ return c.name; }); }, before);
    var q = A.norm(${JSON.stringify(name)});
    var hit = A.clientNames().find(function(c){ return A.norm(c.name) === q; }) || A.clientNames()[0];
    if (!hit) return { client: null };
    A.click(hit.el.closest('tr,li,[role=row]') || hit.el);
    await A.waitFor(function(){ return A.field(/endere[cç]o/i); }, 9000, 'a ficha do cliente');
    // Campos preenchidos (o Kyte põe os valores logo depois de mostrar a ficha).
    await A.afterChange(function(){ return A.readClient(); }, '', 600, 150);
    return { client: A.readClient() };`,
  /** Números do Histórico de vendas: hoje, ontem, semana e mês. */
  salesSummary: () => `
    await A.menu('Hist[oó]rico');
    var block = await A.waitFor(function(){
      return A.leaves(/Hoje:/).map(function(e){ return e.closest('div'); }).find(function(d){ return d && /Este m[eê]s/.test(d.parentElement ? d.parentElement.innerText : ''); });
    }, 9000, 'o histórico de vendas');
    var text = (block.parentElement.parentElement || block.parentElement).innerText.replace(/\\s+/g, ' ');
    var grab = function(label){
      var m = new RegExp(label + ':?\\\\s*(\\\\d+)\\\\s*vendas?\\\\s*R\\\\$\\\\s*([\\\\d.,]+)', 'i').exec(text);
      return m ? { count: Number(m[1]), total: 'R$ ' + m[2] } : null;
    };
    var all = document.body.innerText.replace(/\\s+/g, ' ');
    var m30 = /[ÚU]ltimos 30 dias:?\\s*R\\$\\s*([\\d.,]+)\\s*em\\s*(\\d+)\\s*vendas?/i.exec(all);
    return { today: grab('Hoje'), yesterday: grab('Ontem'), week: grab('Esta semana'), month: grab('Este m[eê]s'), last30: m30 ? { count: Number(m30[2]), total: 'R$ ' + m30[1] } : null };`,
  /** Cadastra um cliente (nome, celular e endereço). */
  createClient: (c: { name: string; phone?: string; address?: string }) => `
    await A.menu('Clientes');
    var add = await A.waitFor(function(){ return A.button(/^\\+?\\s*Cliente$/i); }, 9000, 'o botão + Cliente');
    A.click(add);
    var nome = await A.waitFor(function(){ return A.field(/^\\s*nome/i); }, 9000, 'o cadastro de cliente');
    A.set(nome, ${JSON.stringify(c.name)});
    ${c.phone ? `var tel = A.field(/celular/i) || A.field(/telefone/i); if (tel) A.set(tel, ${JSON.stringify(c.phone)});` : ''}
    ${c.address ? `var end = A.field(/endere[cç]o/i); if (end) A.set(end, ${JSON.stringify(c.address)});` : ''}
    await A.sleep(600);
    var save = A.button(/^(salvar|concluir|cadastrar|confirmar)$/i);
    if (save) { A.click(save); await A.sleep(1200); }
    else { history.back(); await A.sleep(1200); }
    return { saved: true, viaButton: !!save };`,
  /** Cadastra um produto (nome e preço). */
  createProduct: (p: { name: string; price: string }) => `
    await A.menu('Produtos');
    var add = await A.waitFor(function(){ return A.button(/^\\+?\\s*Produto$/i); }, 9000, 'o botão + Produto');
    A.click(add);
    var nome = await A.waitFor(function(){ return A.field(/nome do produto/i); }, 9000, 'o cadastro de produto');
    A.set(nome, ${JSON.stringify(p.name)});
    var preco = A.field(/pre[cç]o de venda/i); if (preco) A.set(preco, ${JSON.stringify(p.price)});
    await A.sleep(600);
    var save = A.button(/^(salvar|concluir|cadastrar|confirmar)$/i);
    if (save) { A.click(save); await A.sleep(1200); }
    else { history.back(); await A.sleep(1200); }
    return { saved: true, viaButton: !!save };`,
  /**
   * Lista de produtos, clientes ou vendas (ver data-page.ts). Abre a tela no Kyte para ela
   * buscar os dados e rola a lista até o fim para trazer as páginas seguintes.
   */
  readData: (kind: 'product' | 'customer' | 'sale') => `
    var label = ${JSON.stringify({ product: 'Produtos', customer: 'Clientes', sale: 'Hist[oó]rico' })}[${JSON.stringify(kind)}];
    try { await A.menu(label); } catch (e) {}
    var list = [], start = Date.now();
    while (Date.now() - start < 9000) { list = await A.read(${JSON.stringify(kind)}); if (list.length) break; await A.sleep(250); }
    // Listas longas chegam aos poucos: rola até parar de crescer (2 voltas sem novidade). Cada
    // volta espera só a página parar de receber dados (antes: pausa fixa de 1,3 s).
    for (var round = 0, last = -1, still = 0; round < 70 && still < 2 && Date.now() - start < 100000; round++) {
      still = list.length === last ? still + 1 : 0;
      last = list.length;
      Array.prototype.forEach.call(document.querySelectorAll('div,main,section,ul'), function(e){
        if (e.scrollHeight > e.clientHeight + 60 && e.clientHeight > 150) { e.scrollTop = e.scrollHeight; e.dispatchEvent(new Event('scroll', { bubbles: true })); }
      });
      var rows = document.querySelectorAll('[role=row],li,tr');
      if (rows.length) try { rows[rows.length - 1].scrollIntoView({ block: 'end' }); } catch (e) {}
      window.scrollTo(0, document.body.scrollHeight);
      await A.netQuiet(400, 1500);
      list = await A.read(${JSON.stringify(kind)});
    }
    return { list: list };`,
  /**
   * Põe no carrinho do Kyte (tela Vendedor, visível) os itens e o cliente escolhidos no
   * GoClient. Não conclui: o pagamento e a conclusão são feitos pela pessoa no próprio Kyte.
   */
  fillSale: (plan: { items: { name: string; qty: number }[]; customer: string | null }) =>
    `${fillCart(plan)}
    return { missing: miss };`,
  /**
   * Registra no Kyte a venda montada nas telas do GoClient (fluxo do vídeo do usuário):
   * carrinho → valores editados e desconto → observação → Pagamento → forma de pagamento →
   * (Dinheiro: valor recebido) → Concluir. Tudo achado por texto, como uma pessoa faria. O
   * que não der para aplicar volta em `missing`; se uma etapa falhar, o app abre o Kyte
   * com o carrinho montado para a pessoa concluir.
   */
  registerSale: (plan: SalePlan) => `
    ${fillCart(plan)}
    var money = function(c){ return (c / 100).toFixed(2).replace('.', ','); };
    var lines = ${JSON.stringify(plan.items)};
    // Abre o carrinho (botão "N itens = R$ ...").
    var cartBtn = A.button(/itens?\\s*=|carrinho/i);
    if (cartBtn) { A.click(cartBtn); await A.sleep(500); }
    for (var k = 0; k < lines.length; k++) {
      var ln = lines[k];
      if (ln.unitCents == null) continue;
      var row = A.leaves(/./).filter(function(e){ return A.visible(e) && A.norm(e.innerText) === A.norm(ln.name); })[0];
      if (!row) { miss.push('valor de ' + ln.name); continue; }
      A.click(row.closest('[role=button],button,li,tr,a') || row);
      await A.sleep(400);
      var unit = A.leaves(/unidade|valor unit/i)[0];
      if (unit) { A.click(unit.closest('[role=button],button,a,div') || unit); await A.sleep(400); }
      var pf = A.field(/valor unit|pre[cç]o|valor/i);
      if (!pf) { miss.push('valor de ' + ln.name); continue; }
      A.set(pf, money(ln.unitCents));
      var okb = A.button(/^(ok|salvar|confirmar|aplicar|concluir)$/i);
      if (okb) { A.click(okb); await A.sleep(400); }
    }
    if (${plan.discountCents} > 0) {
      var dd = A.leaves(/^dar desconto$|^adicionar desconto$/i)[0];
      if (dd) {
        A.click(dd.closest('[role=button],button,a,li') || dd);
        var df = await A.waitFor(function(){ return A.field(/desconto|valor/i); }, 4000).catch(function(){ return null; });
        if (df) {
          A.set(df, money(${plan.discountCents}));
          var dok = A.button(/^(ok|salvar|confirmar|aplicar)$/i); if (dok) { A.click(dok); await A.sleep(400); }
        } else miss.push('desconto');
      } else miss.push('desconto');
    }
    var note = ${JSON.stringify(plan.note)};
    if (note) {
      var ob = A.leaves(/observa[cç][aã]o/i)[0];
      if (ob) {
        A.click(ob.closest('[role=button],button,a,li') || ob);
        var tf = await A.waitFor(function(){ return document.querySelector('textarea') || A.field(/observa/i); }, 4000).catch(function(){ return null; });
        if (tf) { A.set(tf, note); var sv = A.button(/^salvar$/i); if (sv) { A.click(sv); await A.sleep(400); } }
        else miss.push('observação');
      } else miss.push('observação');
    }
    // Pagamento.
    var go = A.button(/itens?\\s*=|^pagamento$|^avan[cç]ar|^finalizar|^cobrar/i);
    if (!go) throw new Error('Não achei o botão de pagamento no Kyte.');
    A.click(go);
    await A.waitFor(function(){ return A.leaves(/^dinheiro$/i)[0] || A.button(/salvar pedido/i); }, 9000, 'a tela de pagamento');
    var mode = ${JSON.stringify(plan.mode)};
    if (mode === 'order') {
      var sp = A.button(/salvar pedido/i);
      if (!sp) throw new Error('Não achei "Salvar pedido" no Kyte.');
      A.click(sp);
      await A.sleep(1500);
      return { concluded: true, number: '', missing: miss };
    }
    if (mode === 'fiado') {
      var vf = A.leaves(/^venda fiado$/i)[0];
      if (!vf) throw new Error('Não achei "Venda Fiado" no Kyte.');
      A.click(vf.closest('[role=button],button,a') || vf);
    } else {
      var pay = ${JSON.stringify(plan.payment)};
      var m = A.leaves(new RegExp('^' + pay.replace(/[.*+?^$()|[\\]\\\\]/g, '\\\\$&') + '$', 'i'))[0];
      if (!m) throw new Error('Não achei "' + pay + '" no pagamento do Kyte.');
      A.click(m.closest('[role=button],button,a,li') || m);
    }
    await A.sleep(500);
    var adv = A.button(/^avan[cç]ar/i); if (adv) { A.click(adv); await A.sleep(600); }
    if (${plan.receivedCents ?? 0} > 0) {
      var rf = A.field(/recebido|valor/i);
      if (rf) A.set(rf, money(${plan.receivedCents ?? 0}));
      await A.sleep(300);
    }
    var fin = await A.waitFor(function(){ return A.button(/^concluir/i); }, 6000).catch(function(){ return null; });
    if (fin) A.click(fin);
    await A.waitFor(function(){ return /venda conclu[ií]da/i.test(document.body.innerText); }, 12000, 'a venda concluída');
    var num = /#\\s*(\\d{3,})/.exec(document.body.innerText);
    return { concluded: true, number: num ? num[1] : '', missing: miss };`,
  /** Nome e textos da loja (para o recibo). */
  readStore: () => `return await A.store();`,
  /** Estrutura dos dados do Kyte (só nomes de campos e quantidades). */
  diagnose: () => `
    for (var label of ['Produtos', 'Clientes', 'Hist[oó]rico']) { try { await A.menu(label); await A.sleep(2500); } catch (e) {} }
    return await A.diagnose();`,
  /**
   * Cancela uma venda pelo número (#14159): Histórico → busca → abre → "Cancelar venda" →
   * confirma. Só roda depois do "sim" da pessoa.
   */
  cancelSale: (number: string) => `
    await A.menu('Hist[oó]rico');
    var box = await A.waitFor(function(){ return A.field(/item|cliente|c[oó]digo|busc|procur/i); }, 9000, 'a busca do histórico');
    A.set(box, ${JSON.stringify(number)});
    await A.sleep(1500);
    var tag = A.leaves(new RegExp('#\\s*' + ${JSON.stringify(number)} + '\\b'))[0];
    if (!tag) throw new Error('Não achei a venda #' + ${JSON.stringify(number)} + ' no Kyte.');
    A.click(tag.closest('tr,li,[role=row],a,button') || tag);
    var btn = await A.waitFor(function(){ return A.button(/cancelar venda/i); }, 9000, 'o botão Cancelar venda');
    A.click(btn);
    await A.sleep(700);
    var ok = await A.waitFor(function(){ return A.button(/^(sim|confirmar|cancelar venda|ok|continuar)$/i); }, 6000, 'a confirmação do cancelamento');
    A.click(ok);
    await A.sleep(1500);
    return { canceled: /cancelad/i.test(document.body.innerText) };`,
  /** Sai da conta do Kyte (limpa o login guardado nesta janela). */
  logout: () => `
    var sair = A.leaves(/^Sair$/i)[0];
    if (!sair) {
      var who = A.leaves(/Brasil Cosm|@|plano/i).find(function(e){ return e.getBoundingClientRect().top < 140; });
      if (who) { A.click(who); await A.sleep(500); sair = A.leaves(/^Sair$/i)[0]; }
    }
    if (sair) { A.click(sair.closest('a,button,li') || sair); await A.sleep(1200); }
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    document.cookie.split(';').forEach(function(c){ document.cookie = c.split('=')[0].trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'; });
    return { ok: true };`,
};
