/* ===== VENDAS — FORMULÁRIO ===== */
function precoProduto(id){
  const p = state.produtos.find(x => x.id === id);
  return p ? (+p.preco || 0) : 0;
}
function custoProduto(id){
  const p = state.produtos.find(x => x.id === id);
  return p ? (+p.custo || 0) : 0;
}
function nomeProduto(id){
  const p = state.produtos.find(x => x.id === id);
  return p ? (p.nome || '(sem nome)') : '(produto removido)';
}

function opcoesProdutosForm(){
  if (state.produtos.length === 0) return `<option value="">— Cadastre um produto primeiro —</option>`;
  return `<option value="">— Escolha o produto —</option>` +
    state.produtos.map(p => `<option value="${p.id}">${(p.nome||'(sem nome)').replace(/</g,'&lt;')} — ${brl(+p.preco||0)}</option>`).join('');
}

function renderFormVenda(){
  const dataEl = document.getElementById('nv-data');
  const horaEl = document.getElementById('nv-hora');
  const prodEl = document.getElementById('nv-produto');
  if (!dataEl.value) dataEl.value = hojeISO();
  if (!horaEl.value) horaEl.value = horaAgora();
  const atual = prodEl.value;
  prodEl.innerHTML = opcoesProdutosForm();
  if (atual && state.produtos.some(p => p.id === atual)) prodEl.value = atual;
  atualizarTotalNovaVenda();
}

function atualizarTotalNovaVenda(){
  const qtd = +document.getElementById('nv-qtd').value || 0;
  const prodId = document.getElementById('nv-produto').value;
  const precoInput = document.getElementById('nv-preco').value;
  const preco = precoInput !== '' ? (+precoInput || 0) : (prodId ? precoProduto(prodId) : 0);
  const frete = +document.getElementById('nv-frete').value || 0;
  const total = qtd * preco + frete;
  document.getElementById('nv-total').textContent = brl(total);
}

document.getElementById('nv-produto').addEventListener('change', () => {
  const prodId = document.getElementById('nv-produto').value;
  if (prodId) {
    const pr = precoProduto(prodId);
    if (pr > 0) document.getElementById('nv-preco').value = pr;
  } else {
    document.getElementById('nv-preco').value = '';
  }
  atualizarTotalNovaVenda();
});
document.getElementById('nv-qtd').addEventListener('input', atualizarTotalNovaVenda);
document.getElementById('nv-preco').addEventListener('input', atualizarTotalNovaVenda);
document.getElementById('nv-frete').addEventListener('input', atualizarTotalNovaVenda);

document.getElementById('nv-registrar').onclick = () => {
  const data = document.getElementById('nv-data').value;
  const hora = document.getElementById('nv-hora').value;
  const produtoId = document.getElementById('nv-produto').value;
  const qtd = document.getElementById('nv-qtd').value;
  const precoInput = document.getElementById('nv-preco').value;
  const frete = document.getElementById('nv-frete').value;

  if (!isISODate(data)) { alert('Escolha uma data válida.'); return; }
  if (!produtoId) { alert('Escolha um produto. Se o cardápio estiver vazio, cadastre na aba Produtos.'); return; }
  const qtdNum = +qtd || 0;
  if (qtdNum <= 0) { alert('Quantidade precisa ser maior que zero.'); return; }

  let precoFinal = precoInput;
  if (precoFinal === '') {
    const pr = precoProduto(produtoId);
    if (pr > 0) precoFinal = String(pr);
    else { alert('Informe o preço unitário (o produto não tem preço cadastrado).'); return; }
  }

  state.vendas.push({
    id: uid(),
    data, hora, produtoId,
    qtd: String(qtdNum),
    precoUnit: precoFinal,
    frete: frete || '',
    criadaEm: Date.now()
  });
  save();
  renderVendas();

  document.getElementById('nv-qtd').value = '1';
  document.getElementById('nv-frete').value = '';
  const pr = precoProduto(produtoId);
  document.getElementById('nv-preco').value = pr > 0 ? pr : '';
  atualizarTotalNovaVenda();

  toast('Venda registrada');
};

/* ===== VENDAS — LISTAGEM ===== */
function renderVendas(){
  const box = document.getElementById('vendas-lista');
  box.innerHTML = '';
  if (state.vendas.length === 0) {
    box.innerHTML = `
      <div class="empty">
        <strong>Nenhuma venda registrada ainda</strong>
        Use o formulário acima para registrar a primeira venda. Ela fica guardada aqui, agrupada por dia.
      </div>`;
    return;
  }
  const porDia = {};
  state.vendas.forEach(v => {
    const d = isISODate(v.data) ? v.data : '';
    if (!porDia[d]) porDia[d] = [];
    porDia[d].push(v);
  });
  const dias = Object.keys(porDia).sort((a,b) => b.localeCompare(a));

  dias.forEach(dia => {
    const vendas = porDia[dia];
    vendas.sort((a,b) => (a.hora||'').localeCompare(b.hora||'') || (a.criadaEm||0) - (b.criadaEm||0));
    let totalDia = 0;
    vendas.forEach(v => {
      const preco = v.precoUnit !== '' ? (+v.precoUnit || 0) : precoProduto(v.produtoId);
      const q = +v.qtd || 0;
      const f = +v.frete || 0;
      totalDia += q * preco + f;
    });
    const num = vendas.length;
    const resumoTexto = `${num} ${num === 1 ? 'venda' : 'vendas'} · ${brl(totalDia)}`;
    const bloco = document.createElement('div');
    bloco.className = 'dia-bloco';
    const titulo = dia ? tituloDia(dia) : 'Sem data';
    bloco.innerHTML = `
      <div class="dia-head">
        <span class="dia-titulo">${titulo}</span>
        <span class="dia-resumo">${resumoTexto}</span>
      </div>
      <div class="dia-vendas"></div>`;
    const vendasBox = bloco.querySelector('.dia-vendas');
    vendas.forEach(v => vendasBox.appendChild(criarItemVenda(v)));
    box.appendChild(bloco);
  });
}

function criarItemVenda(v){
  const item = document.createElement('div');
  item.className = 'venda-item';
  const prodNome = nomeProduto(v.produtoId);
  const qtd = +v.qtd || 0;
  const preco = v.precoUnit !== '' ? (+v.precoUnit || 0) : precoProduto(v.produtoId);
  const frete = +v.frete || 0;
  const subtotal = qtd * preco;
  const total = subtotal + frete;
  const freteTexto = frete > 0 ? `<span class="venda-item-frete">+ frete ${brl(frete)}</span>` : '';
  item.innerHTML = `
    <div class="venda-item-info">
      <span class="venda-item-hora">${v.hora || '—'}</span>
      <span class="venda-item-prod">${prodNome} ×${qtd}</span>
      ${freteTexto}
    </div>
    <span class="venda-item-valor">${brl(total)}</span>
    <button class="venda-item-del" type="button" title="Excluir venda"><svg class="ico"><use href="#i-x"/></svg></button>`;
  item.querySelector('.venda-item-del').onclick = () => {
    if (!confirm('Excluir esta venda? Não é possível desfazer.')) return;
    const i = state.vendas.indexOf(v);
    if (i > -1) state.vendas.splice(i, 1);
    save(); renderVendas();
    toast('Venda excluída');
  };
  return item;
}
