const STORAGE_KEY = 'sadoceria.v5';
// Preços de referência (editáveis na tela). un = unidade em que o preço é dado.
const CATALOGO = () => [
  ['Açúcar','kg',5],['Farinha de trigo','kg',6],['Ovos','un',0.9],['Manteiga','kg',45],['Leite','L',5],
  ['Leite condensado','lata',7],['Creme de leite','caixa',4],['Chocolate em pó','kg',30],['Cacau em pó','kg',40],
  ['Chocolate granulado','kg',25],['Coco ralado','kg',28],['Limão','un',0.6],['Biscoito maisena','pacote',5],['Óleo','L',8],['Embalagem','un',1]
].map(([nome, un, preco], i) => ({ id: 'i' + i, nome, un, preco }));
const PRODUTOS_SUGERIDOS = ['Bolo de chocolate','Bolo de cenoura','Bolo de creme','Brigadeiro','Beijinho','Cupcake','Torta de limão','Pudim','Brownie','Cookie'];
const estadoInicial = () => ({
  catalogo: CATALOGO(),
  prec: { nome: '', rend: '', perda: '', margem: 80, horas: '', hora: '', itens: [], botPreco: '', botKg: '13', gasKgH: '', gasHoras: '', potW: '', enHoras: '', tarifa: '', fixosMes: '', horasMes: '' },
  ahp: { criterios: [], produtos: [], jc: {}, jp: {} },
  ent: { origem: null, paradas: [], voltar: true, res: null, veic: { kmL: '', comb: '', outros: '', margem: 30 } }
});
let state;
try { const ini = estadoInicial(), sv = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  state = { ...ini, ...sv, prec: { ...ini.prec, ...sv.prec }, ent: { ...ini.ent, ...sv.ent, veic: { ...ini.ent.veic, ...sv.ent?.veic } } };
} catch (e) { state = estadoInicial(); }
let _t;
function save() { clearTimeout(_t); _t = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }, 250); }
