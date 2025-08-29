// Render courses/videos on courses.html. Container: #courses-grid or #courses-list-public
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = u => { const v=String(u||'').trim(); return v ? (/^https?:\/\//i.test(v)?v:`https://${v}`) : ''; };

  async function render(){
    const box = $('#courses-grid') || $('#courses-list-public'); if (!box) return;
    const d = await S.getData(); const arr = d.courses || [];
    box.innerHTML = arr.length ? arr.map(c => `
      <article class="project-card">
        <div class="cover" style="background-image:url('${esc(c.thumb || 'assets/img/placeholder-cover.jpg')}')"></div>
        <div class="pad">
          <h4>${esc(c.title||'')}</h4>
          ${c.level ? `<p class="muted">${esc(c.level)}</p>`:''}
        </div>
        <div class="overlay"><div class="links">
          ${c.embed ? `<a class="chip" href="#watch" onclick="return false" style="cursor:default">Embedded</a>` : (c.url ? `<a class="chip" href="${esc(norm(c.url))}" target="_blank" rel="noopener">Watch</a>`:'')}
          ${c.description ? `<span class="chip" style="cursor:default">${esc(c.description.slice(0,24))}…</span>`:''}
        </div></div>
      </article>
    `).join('') : '<div class="card soft"><p class="muted">No course videos yet.</p></div>';
  }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
