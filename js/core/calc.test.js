// Rodar: node js/core/calc.test.js
const Calc = require('./calc.js'), assert = require('assert');
const near = (a, b, m) => assert(Math.abs(a - b) < 1e-6, `${m}: ${a} != ${b}`);
const p = Calc.precificar({ itens: [{ qtd: 2, preco: 5 }], rend: 10, perda: 0, horas: 2, hora: 15, gasKgH: .2, gasHoras: 2, botPreco: 100, botKg: 13, potW: 1000, enHoras: 1, tarifa: .9, fixosMes: 0, horasMes: 0, margem: 100 });
near(p.ing, 10, 'ingredientes'); near(p.mao, 30, 'mão de obra'); near(p.gas, .4 * 100 / 13, 'gás'); near(p.energia, .9, 'energia');
near(p.total, 10 + 30 + 40 / 13 + .9, 'total'); near(p.preco, p.total / 10 * 2, 'preço (markup 100%)');
const q = Calc.precificar({ itens: [{ qtd: 1, preco: 10 }], rend: 10, perda: 20, horas: 1, hora: 10, fixosMes: 300, horasMes: 100, margem: 50 });
near(q.vend, 8, 'perdas'); near(q.indireto, 3, 'indireto rateado'); near(q.custoUn, 23 / 8, 'custo unit com perda');
near(q.mc, q.preco - 20 / 8, 'margem de contribuição'); assert.strictEqual(q.pe, Math.ceil(300 / q.mc), 'ponto de equilíbrio');
assert.strictEqual(Calc.precificar({ itens: [], rend: 0 }), null);
const v = { kmL: 10, comb: 6, manut: .1, pneus: 0, deprec: 0, outros: 0, horaEnt: 20, margem: 50 };
near(Calc.custoKm(v), .7, 'custo/km');
const r = Calc.custoRota(10, 30, 2, v, 1); near(r.minimo, 17, 'mínimo'); near(r.rec, 25.5, 'recomendado'); near(r.porEntrega, 13.75, 'por entrega');
near(Calc.cenarios(17, 2, 0, [0, 100])[1].total, 34, 'cenário');

// AHP: matriz perfeitamente consistente (pesos 0.6/0.3/0.1 -> razões 2, 6, 3)
const ids = ['a', 'b', 'c'], ok = Calc.ahpDiag(ids, { 'a|b': -1, 'a|c': -5, 'b|c': -2 });
near(ok.cr, 0, 'CR consistente'); near(ok.w[0], .6, 'peso a'); near(ok.w[1], .3, 'peso b'); near(ok.w[2], .1, 'peso c');
// inconsistente: a>>b, b>>c, mas a=c  -> CR alto e o par (a,c) deve ser o mais destoante
const ruim = Calc.ahpDiag(ids, { 'a|b': -8, 'b|c': -8, 'a|c': 0 });
assert(ruim.cr > 0.1, 'CR alto esperado: ' + ruim.cr); assert(ruim.pares[0].a === 'a' && ruim.pares[0].b === 'c', 'par suspeito');
near(Calc.razao(-1), 2, 'razão -1'); near(Calc.razao(1), .5, 'razão +1'); near(Calc.ahpDiag(['x', 'y'], { 'x|y': -3 }).cr, 0, 'CR com 2 itens');
// TSP: confere com força bruta em matriz aleatória (determinística)
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pts = Array.from({ length: 7 }, () => [rnd(), rnd()]), D = pts.map(a => pts.map(b => Math.hypot(a[0] - b[0], a[1] - b[1])));
const perms = a => a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
for (const voltar of [true, false]) {
  const custo = o => { let s = D[0][o[0]]; for (let i = 1; i < o.length; i++) s += D[o[i - 1]][o[i]]; return s + (voltar ? D[o.at(-1)][0] : 0); };
  const bf = Math.min(...perms([1, 2, 3, 4, 5, 6]).map(custo)), r = Calc.tsp(D, voltar);
  near(r.custo, bf, 'TSP ótimo voltar=' + voltar); near(custo(r.ordem), bf, 'ordem do TSP');
}
// setas: linha reta para leste -> 3 pontos igualmente espaçados, rumo 90°
const reta = [[0, 0], [0.01, 0]], pa = Calc.pontosAoLongo(reta, 3);
assert.strictEqual(pa.length, 3); near(pa[0].ang, 90, 'rumo leste'); near(pa[1].lng, 0.005, 'ponto médio');
near(Calc.pontosAoLongo([[0, 0], [0, 0.01]], 1)[0].ang, 0, 'rumo norte'); assert(Math.abs(Calc.comprimento(reta) - 1111.9) < 2, 'comprimento 0,01° ≈ 1112 m');
console.log('Todos os testes passaram');
