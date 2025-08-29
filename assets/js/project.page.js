// Render projects on project.html (live updates). Container: #projects-grid or #projects-list-public
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = u => { const v=String(u||'').trim(); return v ? (/^https?:\/\//i.test(v)?v:`https://${v}`) : ''; };

  async function render(){
    const box = $('#projects-grid') || $('#projects-list-public');
    if (!box) return;
    const d = await S.getData();
    const arr = d.projects || [];
    if (!arr.length){
      box.innerHTML = '<div class="card soft"><p class="muted">No projects yet.</p></div>';
      return;
    }
    box.innerHTML = arr.map(p => {
      const demo = norm(p.demo);
      const code = norm(p.code);
      const img = norm(p.image);
      const chips = [
        p.creators && `<span class="chip" style="cursor:default">by ${esc(p.creators)}</span>`,
        demo && `<a class="chip" href="${esc(demo)}" target="_blank" rel="noopener">Demo</a>`,
        code && `<a class="chip" href="${esc(code)}" target="_blank" rel="noopener">Code</a>`,
        img && `<a class="chip" href="${esc(img)}" target="_blank" rel="noopener">Image</a>`
      ].filter(Boolean).join('');
      return `
        <article class="project-card">
          <div class="cover" style="background-image:url('${esc(p.image || 'assets/img/placeholder-cover.jpg')}')"></div>
          <div class="pad">
            <h4>${esc(p.name || '')}</h4>
            ${p.creators ? `<p class="muted">${esc(p.creators)}</p>`:''}
          </div>
          <div class="overlay"><div class="links">${chips}</div></div>
        </article>
      `;
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
