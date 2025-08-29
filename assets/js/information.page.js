// Render club information on information.html. Container: #club-info
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  async function render(){
    const box = $('#club-info'); if (!box) return;
    const d = await S.getData(); const info = d.information || {}; const keys = Object.keys(info);
    box.innerHTML = keys.length ? keys.map(k => `
      <article class="card soft"><h3>${esc(k.replaceAll('_',' '))}</h3><div class="prose">${info[k]||''}</div></article>
    `).join('') : '<div class="card soft"><p class="muted">No information yet.</p></div>';
  }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
