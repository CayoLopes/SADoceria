/* ===== ANÁLISE DAS VENDAS ===== */
document.getElementById('vendas-calcular').onclick = () => {
  const validas = state.vendas
    .map(v => {
      const prod = state.produtos.find(p => p.id === v.produtoId);
      const preco = v.precoUnit !== '' ? (+v.precoUnit || 0) : (prod ? (+prod.preco || 0) : 0);
      const custo = prod ? (+prod.custo || 0) : 0;
      const qtd = +v.qtd || 0;
      const frete = +v.frete || 0;
      const total = qtd * preco + frete;
      const lucro = qtd * (preco - custo);
      return {
        ...v,
        prodNome: prod ? (prod.nome || '(sem nome)') : '(sem produto)',
        prodId: v.produtoId,
        preco, custo, qtd, frete, total, lucro,
        valida: !!v.data && !!v.produtoId && qtd > 0 && preco >= 0
      };
    })
    .filter(v => v.valida);

  if (validas.length < 3) {
    alert('Registre pelo menos 3 vendas completas (produto + data + qtd + preço).');
    return;
  }

  const totalFat = validas.reduce((s,v)=>s+v.total, 0);
  const totalLucro = validas.reduce((s,v)=>s+v.lucro, 0);
  const totalFrete = validas.reduce((s,v)=>s+v.frete, 0);
  const numVendas = validas.length;
  const ticketMedio = totalFat / numVendas;
  const itensVendidos = validas.reduce((s,v)=>s+v.qtd, 0);

  const porProduto = {};
  validas.forEach(v => {
    const key = v.prodId || '(removido)';
    if (!porProduto[key]) porProduto[key] = { nome: v.prodNome, qtd:0, fat:0, lucro:0 };
    porProduto[key].qtd += v.qtd;
    porProduto[key].fat += v.total;
    porProduto[key].lucro += v.lucro;
  });
  const produtosRank = Object.values(porProduto).sort((a,b)=>b.lucro - a.lucro);
  const campeao = produtosRank[0];

  const porDowFat = [0,0,0,0,0,0,0];
  const porDowN = [0,0,0,0,0,0,0];
  validas.forEach(v => {
    const dt = parseISODate(v.data);
    if (!dt) return;
    const dow = dt.getDay();
    porDowFat[dow] += v.total;
    porDowN[dow] += 1;
  });
  const mediaDow = porDowFat.map((s,i) => porDowN[i] > 0 ? s / porDowN[i] : 0);
  const maxDow = Math.max(...mediaDow);
  const idxForte = mediaDow.indexOf(maxDow);
  const diasComVenda = mediaDow.filter(v => v > 0);
  const idxFraco = diasComVenda.length ? mediaDow.findIndex(v => v === Math.min(...diasComVenda) && v > 0) : -1;

  const porHora = Array.from({length:24}, () => ({ soma:0, n:0 }));
  validas.forEach(v => {
    if (!v.hora) return;
    const h = parseInt(v.hora.split(':')[0], 10);
    if (h >= 0 && h < 24) { porHora[h].soma += v.total; porHora[h].n += 1; }
  });
  const horasAtivas = porHora.map((o,i) => ({ h:i, ...o }))
    .filter(o => o.n > 0)
    .sort((a,b) => b.soma - a.soma);
  const maxHoraSoma = horasAtivas.length ? horasAtivas[0].soma : 0;

  const porMes = {};
  validas.forEach(v => {
    const mes = v.data.slice(0,7);
    if (!porMes[mes]) porMes[mes] = { total:0, n:0 };
    porMes[mes].total += v.total;
    porMes[mes].n += 1;
  });
  const meses = Object.entries(porMes).map(([k,o]) => ({
    mes:k, total:o.total, n:o.n, media:o.total/o.n
  })).sort((a,b) => a.mes.localeCompare(b.mes));

  const ordenadas = [...validas].sort((a,b)=>a.data.localeCompare(b.data));
  const meio = Math.floor(ordenadas.length/2);
  const m1Fat = ordenadas.slice(0,meio).reduce((s,v)=>s+v.total,0) / meio;
  const m2Fat = ordenadas.slice(meio).reduce((s,v)=>s+v.total,0) / (ordenadas.length-meio);
  const variacao = m1Fat > 0 ? ((m2Fat - m1Fat)/m1Fat)*100 : 0;

  let verC, verI, verTxt, verDica;
  if (variacao > 10) {
    verC='ok'; verI=SVG.check;
    verTxt=`Faturamento crescendo (${variacao>0?'+':''}${variacao.toFixed(1)}%)`;
    verDica='Bom momento para investir em divulgação e testar um novo produto no cardápio.';
  } else if (variacao < -10) {
    verC='erro'; verI=SVG.alert;
    verTxt=`Faturamento caindo (${variacao.toFixed(1)}%)`;
    verDica='Verifique se algum preço subiu demais, se a divulgação parou, ou se a concorrência lançou algo novo.';
  } else {
    verC='info'; verI=SVG.info;
    verTxt=`Faturamento estável (${variacao>0?'+':''}${variacao.toFixed(1)}%)`;
    verDica='Momento de ajustar processo e buscar margem: reveja os preços dos produtos com margem mais baixa.';
  }

  const top5 = [...validas].sort((a,b)=>b.total - a.total).slice(0,5);

  const barrasHTML = [1,2,3,4,5,6,0].map(dow => {
    const v = mediaDow[dow];
    const h = maxDow > 0 ? (v / maxDow) * 100 : 0;
    const classe = v > 0 ? '' : 'vazio';
    return `
      <div class="dow-col">
        <span class="dow-val">${v > 0 ? brl(v) : '—'}</span>
        <div class="dow-track"><div class="dow-bar ${classe}" style="height:${h}%"></div></div>
        <span class="dow-label">${DIAS_ABREV[dow]}</span>
      </div>`;
  }).join('');

  const horasHTML = horasAtivas.length ? horasAtivas.slice(0,6).map(o => {
    const pctBar = maxHoraSoma > 0 ? (o.soma/maxHoraSoma)*100 : 0;
    return `
      <div class="hora-item">
        <span class="h">${String(o.h).padStart(2,'0')}h–${String(o.h+1).padStart(2,'0')}h</span>
        <div class="bar"><div class="fill" style="width:${pctBar}%"></div></div>
        <span class="v">${brl(o.soma)}</span>
      </div>`;
  }).join('') : '';

  const totalLucroPos = totalLucro > 0 ? totalLucro : 1;
  const linhasProd = produtosRank.map((p,i) => `
    <tr class="${i===0?'campeao':''}">
      <td>${i+1}º</td>
      <td>${p.nome}</td>
      <td class="num">${p.qtd}</td>
      <td class="num">${brl(p.fat)}</td>
      <td class="num">${brl(p.lucro)}</td>
      <td class="num">${pct(p.lucro/totalLucroPos*100)}</td>
    </tr>`).join('');

  const mesesHTML = meses.length > 1 ? `
    <div class="subtitulo-resultado">Resumo por mês</div>
    <table class="tabela">
      <thead><tr><th>Mês</th><th class="num">Vendas</th><th class="num">Total</th><th class="num">Média/venda</th></tr></thead>
      <tbody>${meses.map(m => `
        <tr>
          <td>${formatarMes(m.mes)}</td>
          <td class="num">${m.n}</td>
          <td class="num">${brl(m.total)}</td>
          <td class="num">${brl(m.media)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '';

  const recs = [];
  if (idxForte >= 0 && mediaDow[idxForte] > 0) {
    recs.push(`Seu dia mais forte é <strong>${DIAS_SEMANA[idxForte]}</strong>, com média de <strong>${brl(mediaDow[idxForte])}</strong> por venda. Garanta produção reforçada nesse dia.`);
  }
  if (idxFraco >= 0 && idxFraco !== idxForte && mediaDow[idxFraco] > 0) {
    recs.push(`O dia mais fraco é <strong>${DIAS_SEMANA[idxFraco]}</strong>, com média de <strong>${brl(mediaDow[idxFraco])}</strong>. Uma promoção ou lembrete nas redes pode ajudar.`);
  }
  if (horasAtivas.length) {
    recs.push(`Sua hora de pico é entre <strong>${String(horasAtivas[0].h).padStart(2,'0')}h e ${String(horasAtivas[0].h+1).padStart(2,'0')}h</strong> (${brl(horasAtivas[0].soma)} em ${horasAtivas[0].n} vendas). Redobre a atenção ao WhatsApp nesse período.`);
  }
  if (campeao) {
    recs.push(`O produto que mais lucrou foi <strong>${campeao.nome}</strong> (${brl(campeao.lucro)} de lucro em ${campeao.qtd} unidades). Invista em destaque nas redes e combos.`);
  }
  const negativos = produtosRank.filter(p => p.lucro < 0);
  if (negativos.length) {
    recs.push(`Atenção: <strong>${negativos.map(p=>p.nome).join(', ')}</strong> deu prejuízo no período. Revise o preço ou o custo.`);
  }

  document.getElementById('vendas-res').innerHTML = `
    <h3>${SVG.cart} Análise das vendas</h3>
    <div class="destaque">
      <span class="rotulo">Faturamento total no período</span>
      <span class="valor">${brl(totalFat)}</span>
    </div>
    <div class="metrica"><span class="k">Vendas registradas</span><span class="v">${numVendas}</span></div>
    <div class="metrica"><span class="k">Itens vendidos</span><span class="v">${itensVendidos}</span></div>
    <div class="metrica"><span class="k">Lucro bruto</span><span class="v">${brl(totalLucro)}</span></div>
    <div class="metrica"><span class="k">Ticket médio por venda</span><span class="v">${brl(ticketMedio)}</span></div>
    <div class="metrica"><span class="k">Frete arrecadado no total</span><span class="v">${brl(totalFrete)}</span></div>

    <div class="subtitulo-resultado">Ranking por produto</div>
    <table class="tabela">
      <thead><tr>
        <th>#</th><th>Produto</th>
        <th class="num">Qtd</th>
        <th class="num">Fat.</th>
        <th class="num">Lucro</th>
        <th class="num">%</th>
      </tr></thead>
      <tbody>${linhasProd}</tbody>
    </table>
    <div class="destaque"><span class="rotulo">Produto mais lucrativo</span><span class="valor">${campeao.nome}</span></div>

    <div class="subtitulo-resultado">Padrão por dia da semana</div>
    <div class="dow-chart">${barrasHTML}</div>
    <div class="chart-legenda">
      <span>Média por venda em cada dia</span>
      <span><strong>Pico: ${DIAS_ABREV[idxForte]}</strong></span>
    </div>

    ${horasHTML ? `
      <div class="subtitulo-resultado">Horários de pico</div>
      <div class="hora-lista">${horasHTML}</div>
    ` : ''}

    ${mesesHTML}

    <div class="subtitulo-resultado">Tendência</div>
    <div class="veredito ${verC}">${verI}<span>${verTxt}</span></div>
    <div class="dica">${verDica}</div>

    <div class="subtitulo-resultado">Top 5 vendas</div>
    <ul class="lista-dias">
      ${top5.map(v => `
        <li>
          <span class="dia">${formatarDataCurta(v.data)}${v.hora ? ' · '+v.hora : ''} — ${v.prodNome} ×${v.qtd}</span>
          <span class="valor">${brl(v.total)}</span>
        </li>`).join('')}
    </ul>

    ${recs.length ? `
      <div class="subtitulo-resultado">O que fazer com esses dados</div>
      <div class="dica">
        <ul>${recs.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>` : ''}
  `;
  document.getElementById('vendas-res').classList.add('mostrar');
};
