/* ===== ENTREGA ===== */
function renderEnt(){
  const e = state.ent;
  bindInput('ent-pedido', e, 'pedido');
  bindInput('ent-km', e, 'km');
  bindInput('ent-min', e, 'min');
  bindInput('ent-hora', e, 'hora');
  bindInput('ent-custo-km', e, 'custoKm');
  bindInput('ent-limite', e, 'limite');
}
document.getElementById('ent-calcular').onclick = () => {
  const e = state.ent;
  const pedido = +e.pedido || 0;
  const km = +e.km || 0;
  const min = +e.min || 0;
  const hora = +e.hora || 0;
  const custoKm = +e.custoKm || 0;
  const limite = +e.limite || 20;
  if (!pedido) { alert('Informe o valor do pedido.'); return; }
  const custoComb = km * custoKm;
  const custoTempo = (min/60) * hora;
  const custoTotal = custoComb + custoTempo;
  const pedidoMin = custoTotal / (limite/100);
  const sobra = pedido - custoTotal;
  const pctUsado = (custoTotal/pedido)*100;
  let c, i, v, r;
  if (pedido >= pedidoMin) {
    c='ok'; i=SVG.check; v='Pode entregar sem medo';
    r = `Depois de pagar a viagem, ainda sobram <strong>${brl(sobra)}</strong> do pedido.`;
  } else {
    c='erro'; i=SVG.alert; v='Essa entrega come seu lucro';
    const faltando = pedidoMin - pedido;
    r = `Você precisa de um pedido de pelo menos <strong>${brl(pedidoMin)}</strong> para essa distância.
         <br><br><strong>Alternativas:</strong> pedir mais ${brl(faltando)} em produto, cobrar taxa de entrega, ou agrupar com outro pedido do mesmo bairro.`;
  }
  document.getElementById('ent-res').innerHTML = `
    <h3>${SVG.chart} Análise da entrega</h3>
    <div class="metrica"><span class="k">Combustível e desgaste (${km} km)</span><span class="v">${brl(custoComb)}</span></div>
    <div class="metrica"><span class="k">Seu tempo (${min} min)</span><span class="v">${brl(custoTempo)}</span></div>
    <div class="metrica"><span class="k"><strong>Custo total da viagem</strong></span><span class="v">${brl(custoTotal)}</span></div>
    <div class="metrica"><span class="k">Pedido vale</span><span class="v">${brl(pedido)}</span></div>
    <div class="metrica"><span class="k">% do pedido consumido</span><span class="v">${pct(pctUsado)}</span></div>
    <div class="destaque"><span class="rotulo">Pedido mínimo para essa distância</span><span class="valor">${brl(pedidoMin)}</span></div>
    <div class="veredito ${c}">${i}<span>${v}</span></div>
    <div class="dica">${r}</div>`;
  document.getElementById('ent-res').classList.add('mostrar');
};
