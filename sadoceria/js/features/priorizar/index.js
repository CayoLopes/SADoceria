// Carregamento tardio: qualquer falha (CDN, versão da lib) aparece na tela em vez de sumir.
const alvo = () => document.getElementById('ahp-app');
const erro = msg => { alvo().innerHTML = `<div class="veredito erro"><span>${msg}</span></div>`; };
window.exemploAHP = () => ({ criterios: [], produtos: [], notas: {} });
try {
  const w = await import('./wizard.js');
  window.renderPriorizar = w.renderPriorizar;
  window.exemploAHP = w.exemploAHP;
  w.ligarEventos();
  w.renderPriorizar();
} catch (e) {
  console.error(e);
  erro('Falha ao carregar o módulo AHP: ' + e.message +
       '<br>Confira a internet (a biblioteca vem da CDN) e abra o projeto por um servidor local, não por duplo clique.');
}
