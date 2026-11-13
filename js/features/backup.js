/* ===== BACKUP / RESTAURAÇÃO ===== */
document.getElementById('btn-export').onclick = () => {
  const data = new Date().toISOString().slice(0,10);
  download(`sadoceria-backup-${data}.json`, JSON.stringify(state, null, 2), 'application/json');
  toast('Backup baixado');
};

document.getElementById('btn-import').onclick = () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const obj = JSON.parse(ev.target.result);
        if (!obj || typeof obj !== 'object') throw new Error('Formato inválido');
        if (!confirm('Substituir todos os dados atuais pelo backup?')) return;
        state = migrarEstado(obj);
        state.onboarded = true;
        save(); renderTudo();
        toast('Backup restaurado');
      } catch(err) { alert('Arquivo inválido: ' + err.message); }
    };
    reader.readAsText(f, 'utf-8');
  };
  input.click();
};
