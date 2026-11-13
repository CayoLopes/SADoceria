const $ = id => document.getElementById(id);
const insumo = id => state.catalogo.find(i => i.id === id);
const custoLinha = it => (+it.qtd || 0) * (insumo(it.insumo)?.preco || 0);
const fld = (k, label, { step = 'any', pre, suf, dica } = {}) => `<div class="campo"><label for="pk-${k}">${label}</label>
  <div class="in ${suf ? 'suf' : ''}">${pre ? `<span class="pre">${pre}</span>` : ''}<input id="pk-${k}" data-pk="${k}" type="number" min="0" step="${step}" value="${state.prec[k]}" inputmode="decimal">${suf ? `<span class="sf">${suf}</span>` : ''}</div>
  ${dica ? `<small class="dica">${dica}</small>` : ''}</div>`;
const sec = (k, t, corpo, aberto = false) => `<details class="sec" ${aberto ? 'open' : ''}><summary><span>${t}</span><span class="chip calc" data-sub="${k}" title="Calculado automaticamente">R$ 0,00</span></summary><div class="sec-corpo">${corpo}</div></details>`;

function renderPrec() {
  const p = state.prec;
  $('prec-app').innerHTML = `<div class="prec-grid"><div>
    <section class="card"><h3 class="card-t">Receita</h3>
      <div class="campo"><label for="p-nome">Qual doce?</label><input id="p-nome" data-pk="nome" list="lista-produtos" value="${esc(p.nome)}" placeholder="Escolha ou digite"></div>
      <div class="duas" style="margin-top:.75rem">${fld('rend', 'Unidades que rende', { step: 1, suf: 'un' })}${fld('perda', 'Perdas na produção', { step: 1, suf: '%', dica: 'Sobras, massa que gruda…' })}</div></section>
    <section class="card"><div class="card-cab"><h3 class="card-t">Ingredientes</h3><span class="chip calc" data-sub="ing" title="Calculado automaticamente">R$ 0,00</span>
      <button class="btn soft sm" id="p-gerir"><svg class="ico"><use href="#i-edit"/></svg>Preços</button></div><div id="p-lista"></div></section>
    ${sec('mao', 'Mão de obra', `<div class="duas">${fld('horas', 'Horas na receita', { step: 0.5, suf: 'h' })}${fld('hora', 'Valor da sua hora', { step: 0.5, pre: 'R$' })}</div>`)}
    ${sec('gas', 'Gás', `<div class="duas">${fld('botPreco', 'Preço do botijão', { step: 0.5, pre: 'R$' })}${fld('botKg', 'Peso do botijão', { step: 1, suf: 'kg' })}${fld('gasKgH', 'Consumo do fogão', { step: 0.01, suf: 'kg/h', dica: 'Pese o botijão antes e depois.' })}${fld('gasHoras', 'Horas de fogão/forno', { step: 0.25, suf: 'h' })}</div>`)}
    ${sec('energia', 'Energia elétrica', `<div class="duas">${fld('potW', 'Potência dos aparelhos', { step: 10, suf: 'W', dica: 'Está na etiqueta.' })}${fld('enHoras', 'Horas de uso', { step: 0.25, suf: 'h' })}${fld('tarifa', 'Tarifa da conta de luz', { step: 0.01, pre: 'R$', dica: 'Por kWh.' })}</div>`)}
    ${sec('indireto', 'Custos indiretos', `<div class="duas">${fld('fixosMes', 'Custos fixos por mês', { step: 1, pre: 'R$', dica: 'Aluguel, internet, taxas…' })}${fld('horasMes', 'Horas produzidas no mês', { step: 1, suf: 'h', dica: 'Rateio proporcional às horas.' })}</div>`)}
  </div>
  <aside class="card resumo" aria-live="polite">
    <div class="hero"><span>Preço de venda por unidade</span><strong id="r-preco">—</strong><small id="r-nome"></small></div>
    <div class="resumo-corpo">
      <div><div class="slide-cab"><span>Lucro desejado</span><b id="p-margem-v">${p.margem}%</b></div>
        <input id="p-margem" class="fill-range" type="range" min="0" max="200" step="5" value="${p.margem}" style="--pct:${p.margem / 2}%" aria-label="Lucro desejado em porcentagem sobre o custo"></div>
      <div id="prec-res"></div></div></aside></div>`;
  renderLista(); resPrec();
}
function renderLista() {
  const opts = sel => state.catalogo.map(i => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${esc(i.nome)}</option>`).join('');
  $('p-lista').innerHTML = (state.prec.itens.length ? state.prec.itens.map(it => `<div class="ing-row" data-id="${it.id}">
    <select data-k="insumo" aria-label="Ingrediente">${opts(it.insumo)}</select>
    <label class="qtd"><input type="number" data-k="qtd" min="0" step="any" value="${it.qtd}" aria-label="Quantidade" placeholder="Qtd" inputmode="decimal"><span>${esc(insumo(it.insumo)?.un || '')}</span></label>
    <span class="custo-linha">${brl(custoLinha(it))}</span>
    <button class="ib perigo" data-rm="${it.id}" aria-label="Remover ingrediente"><svg class="ico"><use href="#i-x"/></svg></button></div>`).join('')
    : '<div class="vazio"><b>Nenhum ingrediente</b>Toque em “Adicionar ingrediente”.</div>')
    + '<button class="btn ghost sm" id="p-add" style="margin-top:.4rem"><svg class="ico"><use href="#i-plus"/></svg>Adicionar ingrediente</button>';
}
function resPrec() {
  const p = state.prec, falta = [], mk = rend => Calc.precificar({ ...p, rend, itens: p.itens.map(i => ({ qtd: i.qtd, preco: insumo(i.insumo)?.preco })) });
  const sub = mk(+p.rend > 0 ? +p.rend : 1);
  [['ing', sub.ing], ['mao', sub.mao], ['gas', sub.gas], ['energia', sub.energia], ['indireto', sub.indireto]].forEach(([k, v]) => document.querySelectorAll(`[data-sub=${k}]`).forEach(e => e.textContent = brl(v)));
  if (!p.itens.length) falta.push('adicione ao menos um ingrediente');
  if (!(+p.rend > 0)) falta.push('informe quantas unidades a receita rende');
  $('r-nome').textContent = p.nome ? 'para ' + p.nome : '';
  const el = $('prec-res');
  if (falta.length) { $('r-preco').textContent = '—'; el.innerHTML = `<div class="nota aviso">Para calcular: ${falta.join(' e ')}.</div>`; return; }
  const r = mk(+p.rend); $('r-preco').textContent = brl(r.preco);
  const partes = [['Ingredientes', r.ing, '#b0345a'], ['Mão de obra', r.mao, '#d98a3d'], ['Gás', r.gas, '#c9b037'], ['Energia', r.energia, '#3f7cac'], ['Indiretos', r.indireto, '#7b5ea7']];
  el.innerHTML = `<div class="stats"><div class="stat"><small>Custo por unidade</small><b>${brl(r.custoUn)}</b></div><div class="stat"><small>Lucro por unidade</small><b>${brl(r.lucroUn)}</b></div><div class="stat"><small>Unid. vendáveis</small><b>${r.vend.toFixed(1).replace('.', ',')}</b></div></div>
  <div style="margin-top:.9rem"><div class="stack" role="img" aria-label="Composição do custo">${partes.map(([n, v, c]) => `<span style="width:${r.total ? v / r.total * 100 : 0}%;background:${c}"></span>`).join('')}</div>
  <div style="margin-top:.5rem">${partes.filter(x => x[1] > 0).map(([n, v, c]) => `<div class="linha-m"><span><i class="dot" style="background:${c}"></i>${n}</span><b>${brl(v)} <small>${(v / r.total * 100).toFixed(0)}%</small></b></div>`).join('')}
  <div class="linha-m"><span>Custo total da receita</span><b>${brl(r.total)}</b></div>
  <div class="linha-m"><span>Lucro da receita toda</span><b>${brl(r.lucroUn * r.vend)}</b></div></div></div>
  ${r.pe ? `<div class="nota ok" style="margin-top:.8rem">Para cobrir os custos fixos, venda cerca de <b>${r.pe} unidades por mês</b> deste doce.</div>` : ''}`;
}
// ---- gerenciar ingredientes (diálogo) ----
const UNIDADES = ['kg', 'g', 'L', 'ml', 'un', 'dúzia', 'lata', 'caixa', 'pacote'];
const selUn = (v, attrs) => `<select ${attrs} aria-label="Unidade">${[...new Set([...UNIDADES, v])].map(u => `<option ${u === v ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>`;
function abrirCat() {
  let d = $('dlg-cat');
  if (!d) { d = document.createElement('dialog'); d.id = 'dlg-cat'; document.body.appendChild(d); ligarCat(d); }
  desenharCat(d); d.showModal();
}
function desenharCat(d) {
  d.innerHTML = `<div class="dlg-h"><h3>Ingredientes e preços</h3><p>Mudou o preço no mercado? Altere aqui: todas as receitas se atualizam na hora.</p></div>
  <div class="dlg-b"><div class="cat-head"><span>Ingrediente</span><span>Unidade</span><span>Preço</span><span></span></div>
  ${state.catalogo.map(i => `<div class="cat-row" data-cat="${i.id}"><input class="nome" data-cn value="${esc(i.nome)}" aria-label="Nome">${selUn(i.un, 'data-cu')}
    <div class="preco-in"><span>R$</span><input type="number" min="0" step="0.01" data-cp value="${i.preco}" aria-label="Preço" inputmode="decimal"></div>
    <button class="ib perigo" data-del="${i.id}" aria-label="Excluir ${esc(i.nome)}"><svg class="ico"><use href="#i-x"/></svg></button></div>`).join('')}</div>
  <div class="dlg-f"><b>Novo ingrediente</b><div class="cat-row"><input id="cn-nome" class="nome" placeholder="Nome" aria-label="Nome do novo ingrediente">${selUn('un', 'id="cn-un"')}
    <div class="preco-in"><span>R$</span><input id="cn-preco" type="number" min="0" step="0.01" placeholder="0,00" aria-label="Preço do novo ingrediente" inputmode="decimal"></div><span></span></div>
    <div class="dlg-acoes"><button class="btn ghost" id="cn-add">+ Adicionar</button><button class="btn" id="cn-fim">Pronto</button></div></div>`;
}
function ligarCat(d) {
  d.addEventListener('input', e => {
    const row = e.target.closest('[data-cat]'); if (!row) return; const i = insumo(row.dataset.cat), t = e.target;
    if ('cn' in t.dataset) i.nome = t.value; else if ('cu' in t.dataset) i.un = t.value; else if ('cp' in t.dataset) i.preco = +t.value || 0;
    save(); renderLista(); resPrec();
  });
  d.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'cn-fim') return d.close();
    if (b.dataset.del) { state.catalogo = state.catalogo.filter(i => i.id !== b.dataset.del); state.prec.itens = state.prec.itens.filter(i => i.insumo !== b.dataset.del); }
    else if (b.id === 'cn-add') {
      const nome = $('cn-nome').value.trim(); if (!nome) return toast('Digite o nome do ingrediente');
      state.catalogo.push({ id: uid(), nome, un: $('cn-un').value, preco: +$('cn-preco').value || 0 });
    } else return;
    save(); desenharCat(d); renderLista(); resPrec();
  });
}
(() => {
  const r = $('prec-app');
  r.addEventListener('input', e => {
    const t = e.target, row = t.closest('[data-id]');
    if (t.id === 'p-margem') { state.prec.margem = +t.value; t.style.setProperty('--pct', t.value / 2 + '%'); $('p-margem-v').textContent = t.value + '%'; }
    else if (t.dataset.pk) state.prec[t.dataset.pk] = t.value;
    else if (row && t.dataset.k === 'qtd') { const it = state.prec.itens.find(i => i.id === row.dataset.id); it.qtd = t.value; row.querySelector('.custo-linha').textContent = brl(custoLinha(it)); }
    else return;
    save(); resPrec();
  });
  r.addEventListener('change', e => {
    const row = e.target.closest('[data-id]');
    if (row && e.target.dataset.k === 'insumo') { state.prec.itens.find(i => i.id === row.dataset.id).insumo = e.target.value; save(); renderLista(); resPrec(); }
  });
  r.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'p-gerir') return abrirCat();
    if (b.id === 'p-add') state.prec.itens.push({ id: uid(), insumo: state.catalogo[0]?.id, qtd: '' });
    else if (b.dataset.rm) state.prec.itens = state.prec.itens.filter(i => i.id !== b.dataset.rm);
    else return;
    save(); renderLista(); resPrec();
  });
})();
