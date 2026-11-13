const EXEMPLOS = {
  prec: () => {
    const id = n => state.catalogo.find(i => i.nome === n).id;
    state.prec = { ...estadoInicial().prec, nome: 'Bolo de chocolate', rend: 20, perda: 5, horas: 3, hora: 15,
      botPreco: 110, gasKgH: 0.2, gasHoras: 1.5, potW: 1500, enHoras: 1, tarifa: 0.9, fixosMes: 400, horasMes: 120,
      itens: [['Farinha de trigo', 0.5], ['Açúcar', 0.4], ['Ovos', 4], ['Manteiga', 0.2], ['Chocolate em pó', 0.15], ['Leite condensado', 1]]
        .map(([n, q]) => ({ id: uid(), insumo: id(n), qtd: q })) };
  },
  ahp: () => { state.ahp = window.exemploAHP(); },
  ent: () => {
    state.ent = { ...estadoInicial().ent, origem: { lat: -6.0345, lng: -37.0092, endereco: 'Doceria — Centro' },
      paradas: [['Maria Souza', 'Rua das Flores, 120', 'Portão azul', -6.0480, -37.0260], ['João Lima', 'Av. Central, 45', '', -6.0290, -37.0300], ['Ana Paula', 'Rua do Comércio, 300', 'Ligar ao chegar', -6.0200, -37.0050]]
        .map(([cliente, endereco, obs, lat, lng]) => ({ id: uid(), cliente, endereco, obs, lat, lng })),
      veic: { kmL: 10, comb: 6.2, outros: 0.4, margem: 30 } };
  }
};
function renderTudo() { renderPrec(); renderEnt(); window.renderPriorizar?.(); }
document.getElementById('lista-produtos').innerHTML = PRODUTOS_SUGERIDOS.map(p => `<option value="${p}">`).join('');
document.querySelectorAll('[data-exemplo]').forEach(b => b.onclick = () => {
  const k = b.dataset.exemplo; EXEMPLOS[k](); save(); renderTudo(); toast('Exemplo carregado');
});
document.querySelectorAll('[data-limpar]').forEach(b => b.onclick = () => {
  const k = b.dataset.limpar, novo = estadoInicial()[k]; if (k === 'ent') novo.veic = state.ent.veic; state[k] = novo; save(); renderTudo(); toast('Limpo');
});
renderTudo();
setTimeout(() => {
  const a = document.getElementById('ahp-app');
  if (a && !a.innerHTML.trim()) a.innerHTML = '<div class="veredito erro"><span>O módulo AHP não iniciou. ' +
    (location.protocol === 'file:' ? 'Rode <code>python -m http.server 8000</code> na pasta e abra http://localhost:8000.' : 'Veja o console (F12) e a conexão com a CDN.') + '</span></div>';
}, 1500);
