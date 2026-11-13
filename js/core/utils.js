/* ===== UTILITÁRIOS ===== */
const brl = v => isFinite(v) ? v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—';
const pct = v => isFinite(v) ? v.toFixed(1)+'%' : '—';
const uid = () => Math.random().toString(36).slice(2,9);
const SVG = {
  check: '<svg class="ico ico-sm"><use href="#i-check"/></svg>',
  alert: '<svg class="ico ico-sm"><use href="#i-alert"/></svg>',
  info:  '<svg class="ico ico-sm"><use href="#i-info"/></svg>',
  chart: '<svg class="ico ico-sm"><use href="#i-chart"/></svg>',
  star:  '<svg class="ico ico-sm"><use href="#i-star"/></svg>',
  trend: '<svg class="ico ico-sm"><use href="#i-trend"/></svg>',
  cart:  '<svg class="ico ico-sm"><use href="#i-cart"/></svg>'
};
const DIAS_SEMANA = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const DIAS_ABREV  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MESES = ['janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro'];

function isISODate(s){ return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }
function parseISODate(s){
  if (!isISODate(s)) return null;
  const [y,m,d] = s.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  return isNaN(dt.getTime()) ? null : dt;
}
function hojeISO(){
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
}
function horaAgora(){
  const h = new Date();
  return `${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}`;
}
function formatarDataCurta(iso){
  const dt = parseISODate(iso);
  if (!dt) return iso || '—';
  const d = String(dt.getDate()).padStart(2,'0');
  const m = String(dt.getMonth()+1).padStart(2,'0');
  return `${DIAS_ABREV[dt.getDay()]} ${d}/${m}`;
}
function formatarMes(iso){
  const dt = parseISODate(iso + '-01');
  if (!dt) return iso;
  return `${MESES[dt.getMonth()]} / ${dt.getFullYear()}`;
}
function tituloDia(iso){
  const dt = parseISODate(iso);
  if (!dt) return iso;
  const hoje = parseISODate(hojeISO());
  const diff = Math.round((hoje - dt) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff === 2) return 'Anteontem';
  const diaSemana = DIAS_SEMANA[dt.getDay()];
  const mes = MESES[dt.getMonth()];
  return `${diaSemana}, ${dt.getDate()} de ${mes}`;
}

function toast(txt){
  const el = document.getElementById('toast');
  document.getElementById('toast-txt').textContent = txt;
  el.classList.add('mostrar');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('mostrar'), 1800);
}
function download(filename, content, mime){
  const blob = new Blob([content], {type: mime || 'application/octet-stream'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
