/* ===== PRODUTOS ===== */
function renderProdutos(){
  const box = document.getElementById('prod-lista');
  box.innerHTML = '';
  if (state.produtos.length === 0) {
    box.innerHTML = `
      <div class="empty">
        <strong>Nenhum produto cadastrado</strong>
        Cadastre os produtos que você faz. Opcionalmente, adicione a receita para importar depois.
        <div class="empty-actions">
          <button class="btn sec" data-vazio-add="prod-lista"><svg class="ico"><use href="#i-plus"/></svg>Adicionar</button>
          <button class="btn sec" data-vazio-exemplo="produtos"><svg class="ico"><use href="#i-sparkles"/></svg>Carregar exemplo</button>
        </div>
      </div>`;
  } else {
    state.produtos.forEach(p => box.appendChild(criarBlocoProduto(p)));
  }
  atualizarImportPrec();
}

function criarBlocoProduto(p){
  p = normalizarProduto(p);
  const div = document.createElement('div');
  div.className = 'produto';
  const numIng = p.receita.ingredientes.length;

  div.innerHTML = `
    <div class="produto-topo">
      <input type="text" placeholder="Nome do produto" value="${p.nome || ''}" class="p-nome">
      <button class="btn-remover" type="button"><svg class="ico"><use href="#i-x"/></svg></button>
    </div>
    <div class="produto-campos">
      <div><label>Preço de venda (R$)</label><input type="number" step="0.01" min="0" value="${p.preco || ''}" placeholder="Ex.: 45" class="p-preco"></div>
      <div><label>Custo de produção (R$)</label><input type="number" step="0.01" min="0" value="${p.custo || ''}" placeholder="Ex.: 18" class="p-custo"></div>
      <div><label>Margem</label><div class="margem">—</div></div>
    </div>

    <details class="receita-details">
      <summary>
        <span>Receita do produto (opcional)</span>
        ${numIng > 0 ? `<span class="badge-count">${numIng} ingrediente${numIng === 1 ? '' : 's'}</span>` : ''}
      </summary>
      <div class="receita-conteudo">
        <span class="label-secao" style="margin-top:0;">Ingredientes e preço atual</span>
        <div class="ing-lista"></div>
        <button class="btn sec mt-1 add-ing" type="button"><svg class="ico"><use href="#i-plus"/></svg>Adicionar ingrediente</button>

        <span class="label-secao mt-2">Rendimento e custos do lote</span>
        <div class="linha">
          <div class="campo" style="margin-bottom:.5rem;">
            <label>Rendimento (unidades)</label>
            <input type="number" min="1" class="r-rend" value="${p.receita.rendimento || ''}" placeholder="Ex.: 20">
          </div>
          <div class="campo" style="margin-bottom:.5rem;">
            <label>Gás / energia por lote (R$)</label>
            <input type="number" step="0.01" min="0" class="r-gas" value="${p.receita.gas || ''}" placeholder="Ex.: 8">
          </div>
        </div>
        <div class="linha">
          <div class="campo" style="margin-bottom:.5rem;">
            <label>Horas de trabalho</label>
            <input type="number" step="0.5" min="0" class="r-horas" value="${p.receita.horas || ''}" placeholder="Ex.: 3">
          </div>
          <div class="campo" style="margin-bottom:.5rem;">
            <label>Valor da sua hora (R$)</label>
            <input type="number" step="0.01" min="0" class="r-hora" value="${p.receita.hora || ''}" placeholder="Ex.: 15">
          </div>
        </div>

        <div class="custo-receita-box"></div>
      </div>
    </details>`;

  const inNome = div.querySelector('.p-nome');
  const inPreco = div.querySelector('.p-preco');
  const inCusto = div.querySelector('.p-custo');
  const spanMargem = div.querySelector('.margem');
  const ingLista = div.querySelector('.ing-lista');
  const inRend = div.querySelector('.r-rend');
  const inGas = div.querySelector('.r-gas');
  const inHoras = div.querySelector('.r-horas');
  const inHora = div.querySelector('.r-hora');
  const custoBox = div.querySelector('.custo-receita-box');
  const details = div.querySelector('.receita-details');
  const badge = div.querySelector('.badge-count');

  const calcMargem = () => {
    const pr = +p.preco || 0, cu = +p.custo || 0;
    spanMargem.textContent = pr > 0 ? pct(((pr-cu)/pr)*100) : '—';
  };

  const renderIngredientes = () => {
    ingLista.innerHTML = '';
    if (p.receita.ingredientes.length === 0) {
      ingLista.innerHTML = `<div style="font-size:.78rem;color:var(--suave);padding:.35rem 0;">Sem ingredientes ainda.</div>`;
    } else {
      p.receita.ingredientes.forEach(it => {
        const row = document.createElement('div');
        row.className = 'item-linha';
        row.innerHTML = `
          <input type="text" placeholder="Ingrediente" value="${it.nome || ''}">
          <input type="number" placeholder="R$" step="0.01" min="0" value="${it.valor || ''}">
          <button class="btn-remover" type="button"><svg class="ico"><use href="#i-x"/></svg></button>`;
        const [iN, iV] = row.querySelectorAll('input');
        iN.oninput = () => { it.nome = iN.value; save(); };
        iV.oninput = () => { it.valor = iV.value; save(); renderCusto(); };
        row.querySelector('.btn-remover').onclick = () => {
          const idx = p.receita.ingredientes.indexOf(it);
          if (idx > -1) p.receita.ingredientes.splice(idx, 1);
          save(); renderIngredientes(); renderCusto();
        };
        ingLista.appendChild(row);
      });
    }
    // Atualiza badge
    const n = p.receita.ingredientes.length;
    const summary = details.querySelector('summary');
    let b = summary.querySelector('.badge-count');
    if (n > 0) {
      if (!b) {
        b = document.createElement('span');
        b.className = 'badge-count';
        summary.appendChild(b);
      }
      b.textContent = `${n} ingrediente${n === 1 ? '' : 's'}`;
    } else if (b) {
      b.remove();
    }
  };

  const renderCusto = () => {
    const soma = p.receita.ingredientes.reduce((s,i) => s + (+i.valor || 0), 0);
    const gas = +p.receita.gas || 0;
    const horas = +p.receita.horas || 0;
    const hora = +p.receita.hora || 0;
    const mao = horas * hora;
    const rend = +p.receita.rendimento || 0;
    const lote = soma + gas + mao;
    const unit = rend > 0 ? lote / rend : 0;

    if (lote === 0) {
      custoBox.innerHTML = '';
      return;
    }

    custoBox.innerHTML = `
      <div class="linha-calc"><span>Ingredientes</span><span>${brl(soma)}</span></div>
      ${gas > 0 ? `<div class="linha-calc"><span>Gás / energia</span><span>${brl(gas)}</span></div>` : ''}
      ${mao > 0 ? `<div class="linha-calc"><span>Trabalho (${horas}h × ${brl(hora)})</span><span>${brl(mao)}</span></div>` : ''}
      <div class="linha-calc total"><span>Custo do lote</span><span>${brl(lote)}</span></div>
      ${rend > 0 ? `<div class="linha-calc total"><span>Custo por unidade (÷ ${rend})</span><span>${brl(unit)}</span></div>` : ''}
      ${rend > 0 ? `<button class="btn-usar" type="button"><svg class="ico ico-sm"><use href="#i-check"/></svg>Usar ${brl(unit)} como custo de produção</button>` : ''}`;

    const btn = custoBox.querySelector('.btn-usar');
    if (btn && rend > 0) {
      btn.onclick = () => {
        p.custo = unit.toFixed(2);
        inCusto.value = p.custo;
        save();
        calcMargem();
        renderFormVenda();
        toast('Custo de produção atualizado');
      };
    }
  };

  // Binds
  inNome.oninput = () => { p.nome = inNome.value; save(); renderFormVenda(); atualizarImportPrec(); };
  inPreco.oninput = () => { p.preco = inPreco.value; save(); calcMargem(); renderFormVenda(); };
  inCusto.oninput = () => { p.custo = inCusto.value; save(); calcMargem(); };
  inRend.oninput = () => { p.receita.rendimento = inRend.value; save(); renderCusto(); };
  inGas.oninput = () => { p.receita.gas = inGas.value; save(); renderCusto(); };
  inHoras.oninput = () => { p.receita.horas = inHoras.value; save(); renderCusto(); };
  inHora.oninput = () => { p.receita.hora = inHora.value; save(); renderCusto(); };

  div.querySelector('.add-ing').onclick = () => {
    p.receita.ingredientes.push({ id: uid(), nome:'', valor:'' });
    save(); renderIngredientes(); renderCusto();
  };

  div.querySelector('.btn-remover').onclick = () => {
    if (!confirm('Remover este produto? As vendas já registradas com ele ficam mantidas.')) return;
    const i = state.produtos.indexOf(p);
    if (i > -1) state.produtos.splice(i, 1);
    save(); renderProdutos(); renderFormVenda(); renderVendas();
  };

  calcMargem();
  renderIngredientes();
  renderCusto();
  return div;
}

document.getElementById('prod-add').onclick = () => {
  state.produtos.push(normalizarProduto({ id: uid(), nome:'', preco:'', custo:'', receita: receitaVazia() }));
  save(); renderProdutos(); renderFormVenda();
};
