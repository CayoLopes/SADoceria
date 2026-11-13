// Ranking final feito pela biblioteca "ahp" (comparações par a par). Se a CDN/versão falhar, cai no cálculo local (Calc).
import * as mod from 'ahp';
const AHP = mod.default?.default ?? mod.default ?? mod.AHP;

export const MAX_CRITERIOS = 4, MIN_CRITERIOS = 2, MIN_PRODUTOS = 2, MAX_PRODUTOS = 6;

export function validar({ criterios, produtos }) {
  const erros = [], nomes = l => l.map(x => (x.nome || '').trim().toLowerCase());
  const dup = l => new Set(nomes(l)).size !== l.length;
  if (criterios.length < MIN_CRITERIOS) erros.push(`Use pelo menos ${MIN_CRITERIOS} critérios.`);
  if (nomes(criterios).some(n => !n)) erros.push('Todo critério precisa de um nome.'); else if (dup(criterios)) erros.push('Há dois critérios com o mesmo nome.');
  if (produtos.length < MIN_PRODUTOS) erros.push(`Adicione pelo menos ${MIN_PRODUTOS} doces.`);
  if (nomes(produtos).some(n => !n)) erros.push('Todo doce precisa de um nome.'); else if (dup(produtos)) erros.push('Há dois doces com o mesmo nome.');
  return erros;
}
const pares = (itens, J) => { const A = Calc.matriz(itens.map(i => i.id), J), o = [];
  for (let i = 0; i < itens.length; i++) for (let j = i + 1; j < itens.length; j++) o.push([itens[i].id, itens[j].id, A[i][j]]); return o; };

export function priorizar({ criterios: C, produtos: P, jc, jp }) {
  const local = () => {
    const wc = Calc.ahpPesos(Calc.matriz(C.map(c => c.id), jc)).w, score = P.map(() => 0);
    C.forEach((c, k) => Calc.ahpPesos(Calc.matriz(P.map(p => p.id), jp[c.id] || {})).w.forEach((w, i) => score[i] += wc[k] * w));
    return { pesos: wc, score };
  };
  let fonte = 'biblioteca ahp', pesos, score;
  try {
    const ctx = new AHP();
    ctx.addItems(P.map(p => p.id)); ctx.addCriteria(C.map(c => c.id));
    ctx.rankCriteria(pares(C, jc));
    C.forEach(c => ctx.rankCriteriaItem(c.id, pares(P, jp[c.id] || {})));
    const r = ctx.run(); if (r.error) throw new Error('ahp');
    pesos = r.criteriaRankMetaMap.weightedVector; score = P.map(p => r.rankedScoreMap[p.id]);
    if (score.some(s => !(s >= 0)) || pesos.length !== C.length) throw new Error('formato inesperado');
  } catch (e) { console.warn('AHP via biblioteca falhou, usando cálculo local:', e); fonte = 'cálculo local'; ({ pesos, score } = local()); }
  return { fonte, pesos: C.map((c, i) => ({ nome: c.nome, peso: pesos[i] })),
    ranking: P.map((p, i) => ({ nome: p.nome, score: score[i] })).sort((a, b) => b.score - a.score) };
}
