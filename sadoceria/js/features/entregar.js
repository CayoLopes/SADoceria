// Entregas: tempos reais por vias (OSRM /table) -> melhor ordem pelo TSP exato (Calc.tsp) -> percurso real por perna (OSRM /route, steps).
// Serviços públicos gratuitos: máx. ~1 requisição/s cada (fila abaixo). Sem trânsito em tempo real.
let mapa, gPernas, gSetas, gPins, gRascunho, marcadores = {}, timer, seq = 0, sel = null, estado = 'idle';
const MAX = 10, OSRM = 'https://router.project-osrm.org', NOM = 'https://nominatim.openstreetmap.org';
const CORES = ['#b0345a', '#d98a3d', '#3f8a63', '#3f7cac', '#7b5ea7', '#c0572b', '#2f8f9d', '#8a6d3b', '#c2477f', '#5a7d2a'], COR_VOLTA = '#6b5a52';
const g = id => document.getElementById(id), E = () => state.ent, cache = {};
const rascunho0 = () => ({ id: null, cliente: '', endereco: '', obs: '', lat: null, lng: null, geoDe: '' });
let draft = rascunho0();

// ---- rede: uma fila por serviço, 1,1 s entre chamadas (política de uso dos servidores públicos) ----
const filas = {};
function net(host, url) {
  const p = (filas[host] || Promise.resolve()).then(() => fetch(url)).then(r => r.json());
  filas[host] = p.then(() => new Promise(r => setTimeout(r, 1100)), () => new Promise(r => setTimeout(r, 1100)));
  return p;
}
async function geocode(q) {
  const o = E().origem, vb = o ? `&viewbox=${o.lng - .6},${o.lat + .6},${o.lng + .6},${o.lat - .6}` : '';
  const r = await net('nom', `${NOM}/search?format=jsonv2&limit=1&countrycodes=br${vb}&q=${encodeURIComponent(q)}`);
  return r[0] ? { lat: +r[0].lat, lng: +r[0].lon } : null;
}
async function reverso(pt) {
  try {
    const r = await net('nom', `${NOM}/reverse?format=jsonv2&zoom=18&lat=${pt.lat}&lon=${pt.lng}`), a = r.address || {};
    return [[a.road, a.house_number].filter(Boolean).join(', '), a.suburb || a.neighbourhood || a.city_district, a.city || a.town || a.village].filter(Boolean).join(' – ') || r.display_name || '';
  } catch (e) { return ''; }
}
const ordenadas = () => { const { paradas, res } = E(); return res ? res.ordem.map(id => paradas.find(p => p.id === id)).filter(Boolean) : paradas; };
const pin = (txt, cor, cls = '') => L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div class="pin ${cls}" style="background:${cor}">${txt}</div>` });
const CAMPOS = [['kmL', 'Consumo (km por litro)', 0.1, ''], ['comb', 'Combustível (por litro)', 0.01, 'R$'], ['outros', 'Outros custos (por km)', 0.01, 'R$'], ['margem', 'Lucro desejado', 5, '%']];

function renderEnt() {
  E().paradas.forEach(p => { p.cliente ??= p.nome ?? ''; p.endereco ??= ''; p.obs ??= ''; });
  if (!g('e-mapa')) {
    g('ent-app').innerHTML = `<div class="ent-grid"><div class="pilha">
      <section class="card" id="e-saida"></section>
      <section class="card"><h3 class="card-t" id="f-titulo">Nova entrega</h3><div class="form-g">
        <div class="campo"><label for="f-cli">Cliente</label><input id="f-cli" placeholder="Nome do cliente" autocomplete="off"></div>
        <div class="campo"><label for="f-end">Endereço</label><input id="f-end" placeholder="Rua, número, bairro, cidade — ou toque no mapa" autocomplete="off"></div>
        <div class="campo"><label for="f-obs">Observações (opcional)</label><input id="f-obs" placeholder="Ex.: portão azul, ligar ao chegar" autocomplete="off"></div>
        <div id="f-msg" class="nota erro" hidden></div>
        <div style="display:flex;gap:.5rem"><button class="btn" id="f-add" style="flex:1"><svg class="ico"><use href="#i-plus"/></svg><span>Adicionar entrega</span></button><button class="btn ghost" id="f-cancel" hidden>Cancelar</button></div></div></section>
      <section class="card"><div class="lista-cab"><h3 class="card-t">Sequência de entrega</h3><span id="e-status"></span></div><ul id="e-lista"></ul><div id="e-nota"></div></section>
      <section class="card" id="e-resumo"></section></div>
      <div class="ent-mapa"><div id="e-banner"></div><div id="e-mapa" role="application" aria-label="Mapa das entregas"></div></div></div>`;
    mapa = L.map('e-mapa').setView([-6.03, -37.01], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap · rotas OSRM' }).addTo(mapa);
    gPernas = L.layerGroup().addTo(mapa); gSetas = L.layerGroup().addTo(mapa); gPins = L.layerGroup().addTo(mapa); gRascunho = L.layerGroup().addTo(mapa);
    mapa.on('click', ev => cliqueMapa({ lat: ev.latlng.lat, lng: ev.latlng.lng }));
    const r = g('ent-app');
    r.addEventListener('input', ev => {
      const t = ev.target;
      if (t.id === 'f-cli') draft.cliente = t.value; else if (t.id === 'f-obs') draft.obs = t.value; else if (t.id === 'f-end') draft.endereco = t.value;
      else if (t.dataset.v) { E().veic[t.dataset.v] = t.value; save(); resumo(); }
    });
    r.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.closest('#e-saida,.form-g')) { ev.preventDefault(); (ev.target.id === 's-end' ? g('s-ok') : g('f-add')).click(); } });
    r.addEventListener('click', ev => {
      const b = ev.target.closest('button'), li = ev.target.closest('li[data-id]');
      if (b?.id === 'f-add') return salvarEntrega();
      if (b?.id === 'f-cancel') { draft = rascunho0(); return syncForm(); }
      if (b?.id === 's-ok') return definirSaidaTexto();
      if (b?.id === 's-troca') { E().origem = null; mudou(); return saida(); }
      if (b?.id === 'e-retry') return otimizar();
      if (b?.dataset.feito !== undefined) { const p = E().paradas.find(x => x.id === li.dataset.id); p.feito = !p.feito; save(); desenhar(false); return lista(); }
      if (b?.dataset.edit !== undefined) { const p = E().paradas.find(x => x.id === li.dataset.id); draft = { ...p, geoDe: p.endereco }; syncForm(); return g('f-cli').focus(); }
      if (b?.dataset.del !== undefined) { E().paradas = E().paradas.filter(x => x.id !== li.dataset.id); if (draft.id === li.dataset.id) draft = rascunho0(); if (sel === li.dataset.id) sel = null; syncForm(); return mudou(); }
      if (li) selecionar(li.dataset.id);
    });
    document.querySelector('[data-tab=entrega]').addEventListener('click', () => setTimeout(() => { mapa.invalidateSize(); desenhar(); }, 80));
  }
  draft = rascunho0(); sel = null; estado = E().res ? 'ok' : 'idle';
  syncForm(); desenhar(); lista(); saida(); resumo();
  if (E().origem && E().paradas.length && !E().res) agendar();
}
function banner() { g('e-banner').textContent = !E().origem ? 'Toque no mapa para marcar a SAÍDA' : 'Toque no mapa para marcar uma entrega'; }
function saida() {
  const o = E().origem;
  g('e-saida').innerHTML = o ? `<div class="card-cab"><h3 class="card-t">Saída</h3><button class="btn ghost sm" id="s-troca">Alterar</button></div>
    <div class="it saida" style="padding:0"><span class="num s">S</span><div class="it-t"><b>Doceria</b><small>${esc(o.endereco || 'Ponto marcado no mapa')}</small></div></div>`
    : `<h3 class="card-t">De onde você sai?</h3><div class="campo"><label for="s-end">Endereço da saída</label><input id="s-end" placeholder="Rua, número, cidade — ou toque no mapa" autocomplete="off"></div>
    <button class="btn block" id="s-ok" style="margin-top:.7rem"><svg class="ico"><use href="#i-pin"/></svg>Definir saída</button>`;
  banner();
}
function syncForm() {
  g('f-cli').value = draft.cliente; g('f-end').value = draft.endereco; g('f-obs').value = draft.obs;
  g('f-titulo').textContent = draft.id ? 'Editar entrega' : 'Nova entrega'; g('f-add').querySelector('span').textContent = draft.id ? 'Salvar alterações' : 'Adicionar entrega';
  g('f-cancel').hidden = !draft.id; g('f-msg').hidden = true; desenharRascunho();
}
function erroForm(t) { const m = g('f-msg'); m.textContent = t; m.hidden = false; }
function desenharRascunho() {
  gRascunho.clearLayers();
  if (draft.lat != null) L.marker([draft.lat, draft.lng], { icon: pin('+', '#fff', 'rascunho'), interactive: false }).addTo(gRascunho);
}
async function cliqueMapa(pt) {
  if (!E().origem) { E().origem = { ...pt, endereco: '' }; mudou(); saida(); const t = await reverso(pt); if (E().origem && !E().origem.endereco) { E().origem.endereco = t; save(); saida(); } return; }
  Object.assign(draft, pt, { geoDe: '' }); desenharRascunho();
  const t = await reverso(pt);
  if (draft.lat === pt.lat && t) { draft.endereco = t; draft.geoDe = t; syncForm(); } else if (!t) toast('Ponto marcado. Escreva o endereço, se quiser.');
}
async function definirSaidaTexto() {
  const q = g('s-end').value.trim(); if (!q) return toast('Digite o endereço da saída');
  try { const r = await geocode(q); if (!r) return toast('Não encontrei. Inclua cidade ou toque no mapa'); E().origem = { ...r, endereco: q }; mudou(); saida(); }
  catch (e) { toast('Sem conexão. Toque no mapa para marcar'); }
}
async function salvarEntrega() {
  const d = draft; if (!d.endereco.trim() && d.lat == null) return erroForm('Digite o endereço ou toque no mapa.');
  if (!d.id && E().paradas.length >= MAX) return erroForm(`Máximo de ${MAX} entregas por rota.`);
  if (!E().origem) return erroForm('Defina primeiro a saída.');
  const b = g('f-add'); b.disabled = true;
  try {
    if (d.lat == null || d.endereco.trim() !== d.geoDe) {
      const r = await geocode(d.endereco.trim()); if (!r) return erroForm('Não encontrei esse endereço. Inclua bairro e cidade ou toque no mapa.');
      Object.assign(d, r, { geoDe: d.endereco.trim() });
    }
  } catch (e) { return erroForm('Sem conexão para buscar o endereço. Toque no mapa para marcar o local.'); } finally { b.disabled = false; }
  const dados = { cliente: d.cliente.trim() || 'Cliente ' + (E().paradas.length + (d.id ? 0 : 1)), endereco: d.endereco.trim(), obs: d.obs.trim(), lat: d.lat, lng: d.lng };
  if (d.id) Object.assign(E().paradas.find(p => p.id === d.id), dados); else E().paradas.push({ id: uid(), ...dados });
  draft = rascunho0(); syncForm(); mudou();
}
function mudou() { save(); clearTimeout(timer); E().res = null; estado = 'idle'; desenhar(); lista(); resumo(); agendar(); }
function agendar() { clearTimeout(timer); if (E().origem && E().paradas.length) { estado = 'calc'; lista(); timer = setTimeout(otimizar, 900); } }

// ---- mapa ----
function selecionar(id) {
  sel = sel === id ? null : id; lista(); desenhar(false);
  if (sel) { const i = ordenadas().findIndex(p => p.id === sel), lg = E().res?.legs?.[i];
    if (lg) mapa.fitBounds(L.latLngBounds(lg.coords.map(([x, y]) => [y, x])).pad(.35)); else mapa.panTo(marcadores[sel].getLatLng());
    marcadores[sel]?.openPopup(); g('e-lista').querySelector(`[data-id="${sel}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
function desenhar(ajustar = true) {
  [gPernas, gSetas, gPins].forEach(l => l.clearLayers()); marcadores = {};
  const e = E(), ord = ordenadas(), pts = [], res = e.res, prox = ord.find(p => !p.feito)?.id;
  if (res?.legs) res.legs.forEach((lg, i) => {
    const dest = ord[i], cor = dest ? CORES[i % CORES.length] : COR_VOLTA, foco = sel ? dest?.id === sel : dest?.id === prox;
    const op = sel ? (foco ? 1 : .22) : (dest?.feito ? .3 : 1), w = foco ? 8 : 6, ll = lg.coords.map(([x, y]) => [y, x]);
    L.polyline(ll, { color: '#fff', weight: w + 5, opacity: op * .95, lineCap: 'round', lineJoin: 'round' }).addTo(gPernas);
    L.polyline(ll, { color: cor, weight: w, opacity: op, lineCap: 'round', lineJoin: 'round', dashArray: dest ? null : '2 10' }).addTo(gPernas);
    Calc.pontosAoLongo(lg.coords, Math.max(2, Math.min(9, Math.round(Calc.comprimento(lg.coords) / 700)))).forEach(a =>
      L.marker([a.lat, a.lng], { interactive: false, opacity: op, icon: L.divIcon({ className: '', iconSize: [14, 16], iconAnchor: [7, 8],
        html: `<div class="seta" style="color:${cor};border-bottom-color:${cor};transform:rotate(${a.ang}deg)"></div>` }) }).addTo(gSetas));
  });
  if (e.origem) { pts.push(e.origem); L.marker(e.origem, { icon: pin('S', '#2f7d57'), draggable: true, zIndexOffset: 500 }).addTo(gPins)
    .bindTooltip('Saída', { permanent: true, direction: 'right', offset: [16, 0], className: 'rot-pin' })
    .on('dragend', ev => { Object.assign(E().origem, ev.target.getLatLng(), { endereco: '' }); mudou(); saida(); }); }
  ord.forEach((p, i) => {
    pts.push(p); const cor = res ? CORES[i % CORES.length] : '#a39284', ultimo = res && i === ord.length - 1 && !e.voltar;
    const m = L.marker([p.lat, p.lng], { icon: pin(p.feito ? '✓' : i + 1, p.feito ? '#a89a92' : cor, `${sel === p.id ? 'sel' : ''} ${ultimo ? 'ultimo' : ''}`), draggable: true, zIndexOffset: sel === p.id ? 900 : 100 }).addTo(gPins);
    const lg = res?.legs?.[i];
    m.bindTooltip(esc(p.cliente), { permanent: true, direction: 'right', offset: [16, 0], className: 'rot-pin' })
     .bindPopup(`<b>${res ? i + 1 + '. ' : ''}${esc(p.cliente)}</b>${ultimo ? ' <i>(última entrega)</i>' : ''}<br>${esc(p.endereco)}${p.obs ? `<br><i>${esc(p.obs)}</i>` : ''}${lg ? `<br><b>${Math.round(lg.min)} min · ${lg.km.toFixed(1).replace('.', ',')} km</b> desde ${i ? 'a entrega anterior' : 'a saída'}` : ''}`)
     .on('click', () => selecionar(p.id))
     .on('dragend', ev => { Object.assign(p, ev.target.getLatLng(), { endereco: p.endereco }); mudou(); toast('Local ajustado. Confira o endereço.'); });
    marcadores[p.id] = m;
  });
  if (ajustar && pts.length > 1) mapa.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])).pad(.25)); else if (ajustar && pts.length) mapa.setView([pts[0].lat, pts[0].lng], 14);
}

// ---- lista sincronizada ----
function lista() {
  const e = E(), ord = ordenadas(), res = e.res, prox = res ? ord.find(p => !p.feito)?.id : null, f = x => x.toFixed(1).replace('.', ',');
  g('e-status').innerHTML = estado === 'calc' ? '<span class="chip aviso">Calculando…</span>' : res ? '<span class="chip ok">Ordem otimizada</span>'
    : estado === 'erro' ? '<span class="chip erro">Não otimizada</span>' : e.paradas.length ? '<span class="chip">Ordem de cadastro</span>' : '';
  g('e-lista').innerHTML = (e.origem ? `<li class="it saida"><span class="num s">S</span><div class="it-t"><b>Saída</b><small>${esc(e.origem.endereco || 'Ponto marcado no mapa')}</small></div><span></span></li>` : '')
    + ord.map((p, i) => { const lg = res?.legs?.[i]; return `<li class="it ${sel === p.id ? 'sel' : ''} ${p.feito ? 'feito' : ''} ${p.id === prox ? 'proxima' : ''}" data-id="${p.id}">
      <span class="num" style="background:${res ? CORES[i % CORES.length] : '#a39284'}">${p.feito ? '✓' : i + 1}</span>
      <div class="it-t"><b>${esc(p.cliente)}</b>${p.id === prox ? '<span class="chip ok">Próxima</span>' : ''}<small>${esc(p.endereco)}</small>${p.obs ? `<small class="obs">${esc(p.obs)}</small>` : ''}
      ${lg ? `<small class="via">${Math.round(lg.min)} min · ${f(lg.km)} km${lg.via ? ' · via ' + esc(lg.via) : ''}</small>` : ''}</div>
      <div class="it-ac"><button class="ib ${p.feito ? 'on' : ''}" data-feito aria-label="Marcar como entregue" title="Entregue"><svg class="ico"><use href="#i-check"/></svg></button><button class="ib" data-edit aria-label="Editar" title="Editar"><svg class="ico"><use href="#i-edit"/></svg></button><button class="ib perigo" data-del aria-label="Remover" title="Remover"><svg class="ico"><use href="#i-x"/></svg></button></div></li>`; }).join('')
    + (res && e.voltar && res.legs.length > ord.length ? `<li class="it saida"><span class="num s">S</span><div class="it-t"><b>Volta à saída</b><small class="via">${Math.round(res.legs.at(-1).min)} min · ${f(res.legs.at(-1).km)} km</small></div><span></span></li>` : '');
  g('e-nota').innerHTML = !e.paradas.length ? '<div class="vazio"><b>Nenhuma entrega ainda</b>Preencha o formulário ou toque no mapa.</div>'
    : estado === 'erro' ? '<div class="nota aviso" style="margin-top:.7rem"><div>Não consegui calcular a rota (sem conexão ou serviço ocupado). Esta é só a ordem de cadastro, <b>não otimizada</b>.<br><button class="btn soft sm" id="e-retry">Tentar de novo</button></div></div>' : '';
}

// ---- otimização: tempos reais -> TSP exato -> percurso por perna ----
async function otimizar() {
  const { origem, paradas, voltar } = E(), meu = ++seq;
  if (!origem || !paradas.length) { E().res = null; estado = 'idle'; desenhar(); lista(); return resumo(); }
  estado = 'calc'; lista();
  const xy = p => p.lng + ',' + p.lat;
  try {
    const chave = [origem, ...paradas].map(xy).join(';'); let t = cache[chave];
    if (!t) { t = await net('osrm', `${OSRM}/table/v1/driving/${chave}?annotations=duration`); if (t.code === 'Ok') cache[chave] = t; }
    if (meu !== seq) return;
    if (t.code !== 'Ok' || t.durations.some(l => l.some(v => v == null))) throw new Error('sem rota entre os pontos');
    const seqP = Calc.tsp(t.durations, voltar).ordem.map(i => paradas[i - 1]);
    const rota = [origem, ...seqP, ...(voltar ? [origem] : [])].map(xy).join(';');
    const r = await net('osrm', `${OSRM}/route/v1/driving/${rota}?overview=false&geometries=geojson&steps=true`);
    if (meu !== seq) return; if (r.code !== 'Ok') throw new Error(r.code);
    const rt = r.routes[0];
    E().res = { ordem: seqP.map(p => p.id), km: rt.distance / 1000, min: rt.duration / 60,
      legs: rt.legs.map(lg => ({ km: lg.distance / 1000, min: lg.duration / 60, coords: lg.steps.flatMap(s => s.geometry.coordinates),
        via: [...new Set(lg.steps.map(s => s.name).filter(Boolean))].slice(0, 3).join(', ') })) };
    estado = 'ok'; save();
  } catch (x) { if (meu !== seq) return; console.warn(x); E().res = null; estado = 'erro'; }
  desenhar(); lista(); resumo();
}

// ---- preço da entrega ----
function resumo() {
  const e = E(), r = e.res, n = e.paradas.length, falta = ['kmL', 'comb'].filter(k => !(+e.veic[k] > 0));
  const campos = `<details class="sec" ${falta.length ? 'open' : ''} style="margin-top:.8rem"><summary><span>Custos do veículo</span>${falta.length ? '<span class="chip aviso">Preencha</span>' : ''}</summary><div class="sec-corpo"><div class="duas">
    ${CAMPOS.map(([k, l, s, u]) => `<div class="campo"><label for="v-${k}">${l}</label><div class="in ${u === '%' ? 'suf' : ''}">${u === 'R$' ? '<span class="pre">R$</span>' : ''}<input id="v-${k}" data-v="${k}" type="number" min="0" step="${s}" value="${e.veic[k]}" inputmode="decimal">${u === '%' ? '<span class="sf">%</span>' : ''}</div></div>`).join('')}</div>
    <small class="dica">“Outros custos” = manutenção, pneus, seguro e desgaste do veículo, somados por km. Se não souber, deixe vazio.</small></div></details>`;
  const foco = document.activeElement?.closest?.('#e-resumo') ? document.activeElement.id : null, abertos = [...g('e-resumo').querySelectorAll('details')].map(d => d.open);
  let topo;
  if (!r) topo = `<h3 class="card-t">Preço da entrega</h3><div class="nota aviso" style="margin-top:.8rem">${n ? 'Calculando a melhor rota…' : 'Defina a saída e cadastre ao menos uma entrega.'}</div>`;
  else {
    const c = Calc.custoRota(r.km, r.min, n, e.veic, 0), f = x => x.toFixed(1).replace('.', ',');
    topo = `<h3 class="card-t">Resumo da rota</h3><div class="stats" style="margin:.8rem 0"><div class="stat"><small>Distância</small><b>${f(r.km)} km</b></div><div class="stat"><small>Tempo</small><b>${Math.round(r.min)} min</b></div><div class="stat"><small>Entregas</small><b>${n}</b></div></div>
    ${falta.length ? '<div class="nota aviso">Informe o consumo e o preço do combustível para calcular o preço.</div>' : `<div class="preco-hero"><span>Cobrar por entrega</span><strong>${brl(c.porEntrega)}</strong></div>
    <div class="linha-m"><span>Custo da rota</span><b>${brl(c.minimo)}</b></div><div class="linha-m"><span>Total cobrado na rota</span><b>${brl(c.rec)}</b></div>
    <details class="sec" style="margin-top:.8rem"><summary><span>E se eu mudar o lucro?</span></summary><div class="sec-corpo"><table class="tabela"><thead><tr><th>Lucro</th><th class="num">Por entrega</th><th class="num">Lucro na rota</th></tr></thead><tbody>
    ${Calc.cenarios(c.minimo, n, 0, [0, 20, 40, 60, 80]).map(s => `<tr><td>${s.m}%</td><td class="num">${brl(s.porEntrega)}</td><td class="num">${brl(s.lucro)}</td></tr>`).join('')}</tbody></table></div></details>`}
    <small class="dica" style="margin-top:.6rem">Ordem calculada: a mais rápida entre todas as combinações, pelo tempo real nas ruas. Não considera trânsito ao vivo nem horários.</small>`;
  }
  g('e-resumo').innerHTML = topo + campos; g('e-resumo').querySelectorAll('details').forEach((d, i) => { if (abertos[i] != null && (i > 0 || !falta.length)) d.open = abertos[i]; }); if (foco) { const i = g(foco); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (x) {} } }
}
