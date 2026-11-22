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
      await A.sleep(150);
    }
    throw new Error('O Kyte não mostrou ' + (what || 'a tela esperada') + ' a tempo.');
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
    await A.sleep(400);
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

/** Corpo dos trabalhos (rodam com `A` = helpers acima). Cada um devolve dados simples. */
export const JOBS = {
  /** Busca clientes pelo nome; se houver um só (ou um igual), abre a ficha e lê os dados. */
  findClient: (name: string) => `
    await A.menu('Clientes');
    var box = await A.waitFor(function(){ return A.field(/procure|busc|nome/i); }, 9000, 'a lista de clientes');
    A.set(box, ${JSON.stringify(name)});
    await A.sleep(1300);
    var q = A.norm(${JSON.stringify(name)});
    var list = A.clientNames().filter(function(c){ return A.norm(c.name).indexOf(q) >= 0; });
    if (!list.length) return { matches: [] };
    var exact = list.filter(function(c){ return A.norm(c.name) === q; });
    var pick = exact.length === 1 ? exact[0] : list.length === 1 ? list[0] : null;
    if (!pick) return { matches: list.slice(0, 8).map(function(c){ return c.name; }) };
    A.click(pick.el.closest('tr,li,[role=row]') || pick.el);
    await A.waitFor(function(){ return A.field(/endere[cç]o/i); }, 9000, 'a ficha do cliente');
    await A.sleep(400);
    var c = A.readClient();
    c.name = c.name || pick.name;
    return { client: c };`,
  /** Nomes da lista de clientes (com busca opcional). */
  listClients: (query: string) => `
    await A.menu('Clientes');
    var box = await A.waitFor(function(){ return A.field(/procure|busc|nome/i); }, 9000, 'a lista de clientes');
    A.set(box, ${JSON.stringify(query)});
    await A.sleep(${query ? 1300 : 700});
    return { names: A.clientNames().slice(0, 40).map(function(c){ return c.name; }) };`,
  /** Abre a ficha de um cliente pelo nome exato e lê os dados. */
  openClient: (name: string) => `
    await A.menu('Clientes');
    var box = await A.waitFor(function(){ return A.field(/procure|busc|nome/i); }, 9000, 'a lista de clientes');
    A.set(box, ${JSON.stringify(name)});
    await A.sleep(1300);
    var q = A.norm(${JSON.stringify(name)});
    var hit = A.clientNames().find(function(c){ return A.norm(c.name) === q; }) || A.clientNames()[0];
    if (!hit) return { client: null };
    A.click(hit.el.closest('tr,li,[role=row]') || hit.el);
    await A.waitFor(function(){ return A.field(/endere[cç]o/i); }, 9000, 'a ficha do cliente');
    await A.sleep(400);
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
    return { today: grab('Hoje'), yesterday: grab('Ontem'), week: grab('Esta semana'), month: grab('Este m[eê]s') };`,
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
    while (Date.now() - start < 9000) { list = await A.read(${JSON.stringify(kind)}); if (list.length) break; await A.sleep(700); }
    // Listas longas chegam aos poucos: rola até parar de crescer.
    for (var round = 0, last = -1; round < 18 && list.length !== last && Date.now() - start < 40000; round++) {
      last = list.length;
      Array.prototype.forEach.call(document.querySelectorAll('div,main,section,ul'), function(e){
        if (e.scrollHeight > e.clientHeight + 60 && e.clientHeight > 200) e.scrollTop = e.scrollHeight;
      });
      window.scrollTo(0, document.body.scrollHeight);
      await A.sleep(900);
      list = await A.read(${JSON.stringify(kind)});
    }
    return { list: list };`,
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
