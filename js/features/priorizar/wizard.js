import { MAX_CRITERIOS, MIN_CRITERIOS, MAX_PRODUTOS, validar, priorizar } from './ahp-service.js';

const raiz = () => document.getElementById('ahp-app');
const f1 = x => x.toFixed(1).replace('.', ','), f2 = x => x.toFixed(2).replace('.', ',');
let passo = 0, erros = [];

const criteriosPadrao = () => ['Lucro por unidade', 'Demanda / saída', 'Facilidade de produção', 'Custo dos insumos'].map((nome, i) => ({ id: 'c' + (i + 1), nome }));
function garantir() {
  const a = state.ahp;
  if (!Array.isArray(a.criterios) || !a.criterios.length) a.criterios = criteriosPadrao();
  if (!Array.isArray(a.produtos)) a.produtos = [];
  a.jc ??= {}; a.jp ??= {}; a.criterios.forEach(c => a.jp[c.id] ??= {});
}
const nm = a => id => (a.criterios.find(c => c.id === id) || a.produtos.find(p => p.id === id) || {}).nome || '';
function etapas(a) {
  return [{ t: 'Montar' }, { t: 'Critérios', ids: a.criterios.map(c => c.id), J: a.jc },
    ...a.criterios.map(c => ({ t: c.nome || 'Critério', ids: a.produtos.map(p => p.id), J: a.jp[c.id], crit: c })), { t: 'Resultado' }];
}
const classe = cr => cr <= 0.1 ? 'ok' : cr <= 0.2 ? 'aviso' : 'erro';
const barra = x => { const p = 50 + x * 50 / 8; return `--a:${Math.min(50, p)}%;--b:${Math.max(50, p)}%`; };
const FORCA = ['um pouco', 'um pouco', 'bem', 'bem', 'muito', 'muito', 'extremamente', 'extremamente'];
const texto = (x, A, B, verbo) => x === 0 ? 'Os dois são iguais' : `${x < 0 ? A : B} é ${FORCA[Math.abs(x) - 1]} ${verbo}`;

const pares = ids => { const o = []; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) o.push([ids[i], ids[j]]); return o; };
const totalPares = e => e.ids ? pares(e.ids).length : 0;
const feitos = e => e.ids ? pares(e.ids).filter(([A, B]) => (A + '|' + B) in e.J).length : 0;
function desenharPassos(a, et) {
  const box = document.getElementById('passos'); if (!box) return;
  box.innerHTML = et.map((s, i) => { const tot = totalPares(s), ok = tot > 0 && feitos(s) === tot, bad = s.ids && s.ids.length > 2 && Calc.ahpDiag(s.ids, s.J).cr > 0.1;
    return `<button class="passo ${i === passo ? 'on' : ''} ${ok ? 'ok' : ''} ${bad ? 'ruim' : ''}" data-go="${i}"><span class="pn">${bad ? '!' : ok ? '✓' : i + 1}</span>${esc(s.t)}</button>`; }).join('');
  const m = et.slice(1, -1), t = m.reduce((s, e) => s + totalPares(e), 0), f = m.reduce((s, e) => s + feitos(e), 0);
  document.getElementById('prog-txt').textContent = `${f} de ${t} comparações feitas`;
  document.getElementById('prog-fill').style.width = (t ? f / t * 100 : 0) + '%';
}
function setX(el, x) {
  const a = state.ahp, et = etapas(a), e = et[passo], k = el.dataset.k, [A, B] = k.split('|'), nome = nm(a);
  e.J[k] = x; el.classList.add('feito'); const r = el.querySelector('.pair-range'); r.value = x; r.setAttribute('style', barra(x));
  const [la, lb] = el.querySelectorAll('.lado'); la.classList.toggle('sel', x < 0); lb.classList.toggle('sel', x > 0); la.classList.toggle('eq', x === 0); lb.classList.toggle('eq', x === 0);
  el.querySelector('.duelo-res').textContent = texto(x, nome(A), nome(B), e.crit ? 'melhor' : 'mais importante');
  diagnosticar(a, e); desenharPassos(a, et); save();
}
function telaSetup(a) {
  const cheioC = a.criterios.length >= MAX_CRITERIOS, cheioP = a.produtos.length >= MAX_PRODUTOS;
  return `<div class="intro"><div><b>1</b>Escolha critérios e doces</div><div><b>2</b>Compare dois a dois</div><div><b>3</b>Veja quem ganha</div></div>
  <div class="setup-grid"><section class="card"><div class="card-cab"><h3 class="card-t">Critérios</h3><span class="chip">${a.criterios.length}/${MAX_CRITERIOS}</span></div>
  ${a.criterios.map(c => `<div class="linha-item"><input data-f="cnome" data-c="${c.id}" value="${esc(c.nome)}" placeholder="Ex.: Lucro" aria-label="Nome do critério">
    <button class="ib perigo" data-act="rm-crit" data-c="${c.id}" aria-label="Remover critério" ${a.criterios.length <= MIN_CRITERIOS ? 'disabled' : ''}><svg class="ico"><use href="#i-x"/></svg></button></div>`).join('')}
  <button class="btn ghost sm" data-act="add-crit" ${cheioC ? 'disabled' : ''}><svg class="ico"><use href="#i-plus"/></svg>Adicionar critério</button></section>
  <section class="card"><div class="card-cab"><h3 class="card-t">Doces</h3><span class="chip">${a.produtos.length}/${MAX_PRODUTOS}</span></div>
  ${a.produtos.map(p => `<div class="linha-item"><input list="lista-produtos" data-f="pnome" data-p="${p.id}" value="${esc(p.nome)}" placeholder="Escolha ou digite" aria-label="Nome do doce">
    <button class="ib perigo" data-act="rm-prod" data-p="${p.id}" aria-label="Remover doce"><svg class="ico"><use href="#i-x"/></svg></button></div>`).join('')}
  <button class="btn ghost sm" data-act="add-prod" ${cheioP ? 'disabled' : ''}><svg class="ico"><use href="#i-plus"/></svg>Adicionar doce</button></section></div>
  ${erros.length ? `<div class="nota erro" style="margin-top:.9rem">${erros.join('<br>')}</div>` : ''}`;
}

function telaComparar(a, e) {
  const nome = nm(a), crit = e.crit, verbo = crit ? 'melhor' : 'mais importante';
  return `<div class="cab-passo"><span class="tag">${crit ? 'Critério' : 'Critérios'}</span>
    <h3>${crit ? esc(crit.nome) : 'O que pesa mais na sua decisão?'}</h3>
    <p>${crit ? `Qual doce é melhor em “${esc(crit.nome)}”? Toque em um lado ou deslize a barra.` : 'Toque no critério mais importante de cada par ou deslize a barra.'}</p></div>
  <div id="cr-badge"></div>
  ${pares(e.ids).map(([A, B]) => { const k = A + '|' + B, feito = k in e.J, x = +e.J[k] || 0; return `<div class="duelo ${feito ? 'feito' : ''}" data-k="${k}">
    <div class="lados"><button class="lado ${x < 0 ? 'sel' : ''} ${feito && x === 0 ? 'eq' : ''}" data-lado="-3">${esc(nome(A))}</button><span class="vs">VS</span>
    <button class="lado ${x > 0 ? 'sel' : ''} ${feito && x === 0 ? 'eq' : ''}" data-lado="3">${esc(nome(B))}</button></div>
    <input type="range" class="pair-range" min="-8" max="8" step="1" value="${x}" style="${barra(x)}" data-par="${k}" aria-label="${esc(nome(A))} contra ${esc(nome(B))}">
    <div class="escala"><span>← ${esc(nome(A))} ganha</span><button class="igual" data-lado="0">Igual</button><span>${esc(nome(B))} ganha →</span></div>
    <div class="duelo-res">${feito ? esc(texto(x, nome(A), nome(B), verbo)) : 'Escolha um lado para comparar'}</div><div class="par-flag"></div></div>`; }).join('')}`;
}

// Atualiza a razão de consistência e destaca os julgamentos que destoam (sem recriar a tela)
function diagnosticar(a, e) {
  const d = Calc.ahpDiag(e.ids, e.J), nome = nm(a), badge = document.getElementById('cr-badge');
  const ruim = d.cr > 0.1, sus = ruim ? d.pares.filter(p => p.dev >= Math.log(1.8)).slice(0, 3) : [];
  if (badge) badge.innerHTML = e.ids.length < 3 ? '' : `<div class="nota ${ruim ? 'aviso' : 'ok'}"><span><b>Consistência (CR): ${f2(d.cr)}</b> — ${ruim ? 'alguns julgamentos não combinam entre si. Revise os destacados.' : 'boa, pode seguir.'}</span></div>`;
  document.querySelectorAll('.duelo').forEach(el => {
    const [A, B] = el.dataset.k.split('|'), p = sus.find(s => s.a === A && s.b === B);
    el.classList.toggle('suspeito', !!p);
    el.querySelector('.par-flag').innerHTML = p ? `<span>Destoa dos seus outros julgamentos: eles indicam que <b>${esc(nome(A))}</b> é ${p.esp >= 1 ? 'melhor' : 'pior'} que <b>${esc(nome(B))}</b> (cerca de ${f1(p.esp >= 1 ? p.esp : 1 / p.esp)}×).</span>
      <button class="btn soft sm" data-act="sug" data-k="${el.dataset.k}" data-v="${p.sug}">Usar valor sugerido</button>` : '';
  });
}

function telaResultado(a, et) {
  const lista = et.slice(1, -1).map((e, i) => ({ e, i: i + 1, d: Calc.ahpDiag(e.ids, e.J) })), ruins = lista.filter(x => x.d.cr > 0.1);
  let r; try { r = priorizar(a); } catch (x) { return `<div class="nota erro"><span>Não foi possível calcular: ${esc(x.message)}</span></div>`; }
  const topo = r.ranking[0].score;
  return `<div class="nota ${ruins.length ? 'aviso' : 'ok'}"><span>${ruins.length ? 'Alguns julgamentos estão inconsistentes. Revise antes de decidir:' : 'Todos os julgamentos estão consistentes.'}</span></div>
  ${ruins.map(x => `<div class="linha-item rev"><span>${esc(x.e.t)} — CR ${f2(x.d.cr)}</span><button class="btn soft sm" data-go="${x.i}">Revisar</button></div>`).join('')}
  <div class="campeao"><div><small>Prioridade máxima</small><b>${esc(r.ranking[0].nome)}</b></div></div>
  <table class="tabela"><thead><tr><th>#</th><th>Doce</th><th class="num">Pontuação</th></tr></thead><tbody>
  ${r.ranking.map((x, i) => `<tr class="${i ? '' : 'top'}"><td>${i + 1}º</td><td>${esc(x.nome)}<div class="barra-rank"><i style="width:${x.score / topo * 100}%"></i></div></td><td class="num">${f1(x.score * 100)}%</td></tr>`).join('')}</tbody></table>
  <h4 class="card-t" style="margin:1rem 0 .3rem">Peso de cada critério</h4>
  ${r.pesos.map(p => `<div class="linha-m"><span>${esc(p.nome)}</span><b>${Math.round(p.peso * 100)}%</b></div>`).join('')}
  <small class="dica">Calculado com: ${r.fonte}.</small>`;
}

export function renderPriorizar() {
  garantir();
  const a = state.ahp, et = etapas(a); passo = Math.min(passo, et.length - 1); if (a.produtos.length < 2) passo = 0;
  const e = et[passo], ult = et.length - 1;
  const corpo = passo === 0 ? telaSetup(a) : passo === ult ? telaResultado(a, et) : telaComparar(a, e);
  raiz().innerHTML = `<div class="passos" id="passos" role="tablist"></div>
    <div class="prog" ${passo === 0 ? 'hidden' : ''}><div class="prog-bar"><i id="prog-fill"></i></div><span id="prog-txt"></span></div>
    ${corpo}
    <div class="nav-passos">${passo > 0 ? '<button class="btn ghost" data-act="voltar">← Voltar</button>' : '<span></span>'}
    ${passo < ult ? `<button class="btn" data-act="avancar">${passo === ult - 1 ? 'Ver resultado' : 'Próximo →'}</button>` : '<span></span>'}</div>`;
  desenharPassos(a, et);
  if (passo > 0 && passo < ult) diagnosticar(a, e);
}

export function ligarEventos() {
  const r = raiz(), a = () => state.ahp;
  r.addEventListener('input', ev => {
    const t = ev.target, d = t.dataset;
    if (d.f === 'cnome') a().criterios.find(c => c.id === d.c).nome = t.value;
    else if (d.f === 'pnome') a().produtos.find(p => p.id === d.p).nome = t.value;
    else if (d.par) { setX(t.closest('.duelo'), +t.value); return; } else return;
    save();
  });
  r.addEventListener('click', ev => {
    const lado = ev.target.closest('[data-lado]'); if (lado) return setX(lado.closest('.duelo'), +lado.dataset.lado);
    const b = ev.target.closest('[data-act],[data-go]'); if (!b || b.disabled) return;
    const d = b.dataset, s = a();
    if (d.go !== undefined) passo = +d.go;
    else switch (d.act) {
      case 'add-crit': if (s.criterios.length < MAX_CRITERIOS) s.criterios.push({ id: uid(), nome: '' }); break;
      case 'rm-crit': s.criterios = s.criterios.filter(c => c.id !== d.c); delete s.jp[d.c]; break;
      case 'add-prod': if (s.produtos.length < MAX_PRODUTOS) s.produtos.push({ id: uid(), nome: '' }); break;
      case 'rm-prod': s.produtos = s.produtos.filter(p => p.id !== d.p); break;
      case 'voltar': passo--; break;
      case 'avancar': if (passo === 0) { erros = validar(s); if (erros.length) break; } passo++; break;
      case 'sug': etapas(s)[passo].J[d.k] = +d.v; break;
    }
    save(); renderPriorizar(); if (d.go !== undefined || d.act === 'avancar' || d.act === 'voltar') window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Exemplo: notas 1-9 viram julgamentos par a par; um par em "Demanda" é trocado de propósito para mostrar a detecção de inconsistência.
export function exemploAHP() {
  const C = criteriosPadrao(), P = ['Bolo de chocolate', 'Bolo de creme', 'Cupcake', 'Torta de limão'].map(nome => ({ id: uid(), nome }));
  const jDe = (sc, ids) => { const J = {}; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const r = sc[i] / sc[j]; J[ids[i] + '|' + ids[j]] = r >= 1 ? -(Math.min(9, Math.round(r)) - 1) : Math.min(9, Math.round(1 / r)) - 1; } return J; };
  const m = { c1: [6, 3, 8, 5], c2: [8, 5, 5, 2], c3: [3, 5, 8, 1], c4: [2, 5, 5, 3] }, jp = {};
  C.forEach(c => jp[c.id] = jDe(m[c.id], P.map(p => p.id)));
  jp.c2[P[0].id + '|' + P[1].id] = 7;
  return { criterios: C, produtos: P, jc: jDe([7, 5, 2, 3], C.map(c => c.id)), jp };
}
