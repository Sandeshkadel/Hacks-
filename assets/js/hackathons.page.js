// Render hackathons/events on hackathons.html. Container: #hackathons-grid
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = u => { const v=String(u||'').trim(); return v ? (/^https?:\/\//i.test(v)?v:`https://${v}`) : ''; };

  async function render(){
    const grid = document.getElementById('hackathons-grid'); if (!grid) return;
    const d = await S.getData(); const arr = d.hackathons || [];
    grid.innerHTML = arr.length ? arr.map(h => `
      <article class="project-card">
        <div class="cover" style="background-image:url('${esc(h.cover || 'assets/img/placeholder-cover.jpg')}')"></div>
        <div class="pad">
          <h4>${esc(h.title||'')}</h4>
          ${h.date ? `<p class="muted">${esc(h.date)}</p>`:''}
        </div>
        <div class="overlay"><div class="links">
          ${h.website ? `<a class="chip" href="${esc(norm(h.website))}" target="_blank" rel="noopener">Website</a>`:''}
          ${h.prizes ? `<span class="chip" style="cursor:default">Prizes</span>`:''}
        </div></div>
      </article>
    `).join('') : '<div class="card soft"><p class="muted">No events yet.</p></div>';
  }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
