/* ===== META ===== */
function renderMeta(){
  const m = state.meta;
  bindInput('meta-salario', m, 'salario');
  bindInput('meta-margem', m, 'margem');
  const box = document.getElementById('meta-gastos');
  box.innerHTML = '';
  if (m.gastos.length === 0) {
    box.innerHTML = `
      <div class="empty">
        <strong>Nenhum gasto fixo ainda</strong>
        Coloque tudo que sai do bolso todo mês: gás, luz, internet, embalagem...
        <div class="empty-actions">
          <button class="btn sec" data-vazio-add="meta-gastos"><svg class="ico"><use href="#i-plus"/></svg>Adicionar</button>
          <button class="btn sec" data-vazio-exemplo="meta"><svg class="ico"><use href="#i-sparkles"/></svg>Carregar exemplo</button>
        </div>
      </div>`;
  } else {
    m.gastos.forEach(g => box.appendChild(criarLinhaSimples(g, m.gastos, 'Gasto', 'R$ / mês', renderMeta)));
  }
}
document.getElementById('meta-add-gasto').onclick = () => {
  state.meta.gastos.push({ id: uid(), nome:'', valor:'' });
  save(); renderMeta();
};
document.getElementById('meta-calcular').onclick = () => {
  const m = state.meta;
  const salario = +m.salario || 0;
  const margem = +m.margem || 55;
  const gastos = m.gastos.reduce((s,g)=> s + (+g.valor||0), 0);
  if (!salario && !gastos) { alert('Informe o salário desejado ou algum gasto.'); return; }
  const totalNecessario = gastos + salario;
  const faturamento = totalNecessario / (margem/100);
  const diario = faturamento/30;
  const semanal = faturamento/4.3;
  document.getElementById('meta-res').innerHTML = `
    <h3>${SVG.chart} Sua meta financeira</h3>
    <div class="metrica"><span class="k">Gastos fixos do mês</span><span class="v">${brl(gastos)}</span></div>
    <div class="metrica"><span class="k">Salário desejado</span><span class="v">${brl(salario)}</span></div>
    <div class="metrica"><span class="k"><strong>Precisa sobrar no mês</strong></span><span class="v">${brl(totalNecessario)}</span></div>
    <div class="metrica"><span class="k">Margem média sobre vendas</span><span class="v">${margem}%</span></div>
    <div class="destaque"><span class="rotulo">Faturamento mínimo por mês</span><span class="valor">${brl(faturamento)}</span></div>
    <div class="metrica"><span class="k">Meta por semana</span><span class="v">${brl(semanal)}</span></div>
    <div class="metrica"><span class="k">Meta por dia</span><span class="v">${brl(diario)}</span></div>
    <div class="dica"><strong>Traduzindo em bolos:</strong> se cada bolo sai em média a R$ 45, precisa vender cerca de <strong>${Math.ceil(faturamento/45)} bolos por mês</strong> (≈ ${Math.ceil(faturamento/45/30)} por dia).</div>`;
  document.getElementById('meta-res').classList.add('mostrar');
};
