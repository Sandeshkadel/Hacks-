// Public Meetings page: auto-updates with latest meetings.
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function render(){
    const box = $('#meetings-grid') || $('#meetings-list-public'); if (!box) return;
    const d = await S.getData();
    const arr = d.meetings || [];
    if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No meetings scheduled.</p></div>'; return; }
    box.innerHTML = arr.map(m => `
      <article class="card soft">
        <h3>${esc(m.title||'')}</h3>
        ${m.date ? `<p class="muted">${esc(m.date)}</p>`:''}
        ${m.description ? `<p>${esc(m.description)}</p>`:''}
        ${m.zoomLink ? `<p><a href="${esc(m.zoomLink)}" target="_blank" rel="noopener">Join Zoom</a></p>`:''}
      </article>
    `).join('');
  }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
