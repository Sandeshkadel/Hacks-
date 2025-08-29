// Public Courses/Videos page: auto-updates with course cards or embeds.
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function norm(u){ const v = String(u||'').trim(); return v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : ''; }

  async function render(){
    const box = $('#courses-grid') || $('#courses-list-public'); if (!box) return;
    const d = await S.getData();
    const arr = d.courses || [];
    if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No course videos yet.</p></div>'; return; }
    box.innerHTML = arr.map(c => `
      <article class="card soft">
        <h3>${esc(c.title || '')}</h3>
        ${c.level ? `<p class="muted">${esc(c.level)}</p>`:''}
        ${c.embed ? `<div class="prose">${c.embed}</div>` : (c.url ? `<p><a href="${esc(norm(c.url))}" target="_blank" rel="noopener">Watch</a></p>`:'')}
        ${c.description ? `<p>${esc(c.description)}</p>`:''}
      </article>
    `).join('');
  }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
