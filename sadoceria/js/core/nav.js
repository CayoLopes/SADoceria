/* ===== NAVEGAÇÃO ===== */
document.querySelectorAll('nav button').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.modulo').forEach(m=>m.classList.remove('ativo'));
    b.classList.add('active');
    document.getElementById(b.dataset.tab).classList.add('ativo');
    window.scrollTo({top:0,behavior:'smooth'});
  });
});
