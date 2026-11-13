// Modelos de decisão (funções puras, testáveis em Node). Todos os parâmetros vêm do usuário.
const Calc = (() => {
  const n = v => +v || 0;
  // Custeio por absorção (+ rateio de indiretos) com perdas, e custeio variável (margem de contribuição / ponto de equilíbrio)
  function precificar(c) {
    const ing = c.itens.reduce((s, i) => s + n(i.qtd) * n(i.preco), 0);
    const mao = n(c.horas) * n(c.hora);
    const gas = n(c.botKg) > 0 ? n(c.gasKgH) * n(c.gasHoras) * n(c.botPreco) / n(c.botKg) : 0;
    const energia = n(c.potW) / 1000 * n(c.enHoras) * n(c.tarifa);
    const indireto = n(c.horasMes) > 0 ? n(c.fixosMes) / n(c.horasMes) * n(c.horas) : 0;
    const total = ing + mao + gas + energia + indireto;
    const vend = n(c.rend) * (1 - n(c.perda) / 100);          // unidades realmente vendáveis
    if (vend <= 0) return null;
    const custoUn = total / vend, preco = custoUn * (1 + n(c.margem) / 100);
    const mc = preco - (ing + mao + gas + energia) / vend;    // margem de contribuição unitária
    return { ing, mao, gas, energia, indireto, total, vend, custoUn, preco, lucroUn: preco - custoUn, mc,
             pe: mc > 0 && n(c.fixosMes) > 0 ? Math.ceil(n(c.fixosMes) / mc) : null };
  }
  const custoKm = v => (n(v.kmL) > 0 ? n(v.comb) / n(v.kmL) : 0) + n(v.manut) + n(v.pneus) + n(v.deprec) + n(v.outros);
  function custoRota(km, min, nEnt, v, taxa) {
    const ckm = custoKm(v), op = km * ckm, mao = min / 60 * n(v.horaEnt), minimo = op + mao, rec = minimo * (1 + n(v.margem) / 100);
    return { ckm, op, mao, minimo, rec, lucro: rec - minimo, porEntrega: nEnt > 0 ? rec / nEnt + n(taxa) : rec };
  }
  const cenarios = (minimo, nEnt, taxa, ms) => ms.map(m => { const t = minimo * (1 + m / 100); return { m, total: t, lucro: t - minimo, porEntrega: t / nEnt + n(taxa) }; });

  // ---- AHP: matriz par a par, vetor de prioridades (autovetor), razão de consistência e diagnóstico ----
  // v da barrinha: negativo = o 1º item é preferido (|v|+1 vezes), positivo = o 2º é preferido, 0 = iguais (escala de Saaty 1-9)
  const RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
  const razao = v => v <= 0 ? 1 - v : 1 / (1 + v);
  function matriz(ids, J) {
    const m = ids.length, A = ids.map(() => Array(m).fill(1));
    for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) { const r = razao(n(J[ids[i] + '|' + ids[j]])); A[i][j] = r; A[j][i] = 1 / r; }
    return A;
  }
  function ahpPesos(A) {
    const m = A.length; let w = Array(m).fill(1 / m);
    for (let k = 0; k < 200; k++) { const x = A.map(r => r.reduce((s, a, j) => s + a * w[j], 0)), t = x.reduce((s, a) => s + a, 0); w = x.map(a => a / t); }
    const lam = A.reduce((s, r, i) => s + r.reduce((q, a, j) => q + a * w[j], 0) / w[i], 0) / m;
    const ci = m > 1 ? (lam - m) / (m - 1) : 0;
    return { w, lam, ci, cr: m > 2 ? Math.max(0, ci / RI[Math.min(m, 10)]) : 0 };
  }
  // Para cada par: quanto o julgamento do usuário destoa do que os outros julgamentos implicam (|ln(a_ij / (w_i/w_j))|)
  function ahpDiag(ids, J) {
    const A = matriz(ids, J), p = ahpPesos(A), pares = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const esp = p.w[i] / p.w[j], k = Math.min(9, Math.max(1, Math.round(esp >= 1 ? esp : 1 / esp)));
      pares.push({ a: ids[i], b: ids[j], dev: Math.abs(Math.log(A[i][j] / esp)), esp, sug: esp >= 1 ? -(k - 1) : k - 1 });
    }
    return { ...p, pares: pares.sort((x, y) => y.dev - x.dev) };
  }
  // ---- TSP exato (Held-Karp) sobre a matriz de tempos reais; índice 0 = origem. Ótimo para até ~11 paradas ----
  function tsp(D, voltar) {
    const m = D.length - 1, N = 1 << m, INF = 1e18;
    if (m < 1) return { ordem: [], custo: 0 };
    const dp = Array.from({ length: N }, () => Array(m).fill(INF)), pai = Array.from({ length: N }, () => Array(m).fill(-1));
    for (let j = 0; j < m; j++) dp[1 << j][j] = D[0][j + 1];
    for (let s = 1; s < N; s++) for (let j = 0; j < m; j++) {
      if (!(s & (1 << j)) || dp[s][j] >= INF) continue;
      for (let k = 0; k < m; k++) { if (s & (1 << k)) continue; const v = dp[s][j] + D[j + 1][k + 1], t = s | (1 << k); if (v < dp[t][k]) { dp[t][k] = v; pai[t][k] = j; } }
    }
    let best = INF, bj = 0;
    for (let j = 0; j < m; j++) { const v = dp[N - 1][j] + (voltar ? D[j + 1][0] : 0); if (v < best) { best = v; bj = j; } }
    const ordem = []; let s = N - 1, j = bj;
    while (j >= 0) { ordem.push(j + 1); const pj = pai[s][j]; s ^= 1 << j; j = pj; }
    return { ordem: ordem.reverse(), custo: best };
  }

  // ---- Geometria da rota (setas): pontos igualmente espaçados ao longo de uma polilinha [[lng,lat],...] ----
  const rad = d => d * Math.PI / 180;
  const dist = (a, b) => { const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
  const rumo = (a, b) => { const dl = rad(b[0] - a[0]), y = Math.sin(dl) * Math.cos(rad(b[1])), x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(dl); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
  const comprimento = c => c.reduce((s, p, i) => i ? s + dist(c[i - 1], p) : 0, 0);
  function pontosAoLongo(c, m) {
    if (c.length < 2 || m < 1) return [];
    const cum = [0]; for (let i = 1; i < c.length; i++) cum.push(cum[i - 1] + dist(c[i - 1], c[i]));
    const tot = cum[cum.length - 1]; if (!tot) return [];
    const out = []; let s = 1;
    for (let k = 0; k < m; k++) {
      const alvo = tot * (k + .5) / m; while (s < c.length - 1 && cum[s] < alvo) s++;
      const t = (alvo - cum[s - 1]) / ((cum[s] - cum[s - 1]) || 1);
      out.push({ lng: c[s - 1][0] + (c[s][0] - c[s - 1][0]) * t, lat: c[s - 1][1] + (c[s][1] - c[s - 1][1]) * t, ang: rumo(c[s - 1], c[s]) });
    }
    return out;
  }
  return { precificar, custoKm, custoRota, cenarios, razao, matriz, ahpPesos, ahpDiag, tsp, comprimento, pontosAoLongo };
})();
if (typeof module !== 'undefined') module.exports = Calc;
