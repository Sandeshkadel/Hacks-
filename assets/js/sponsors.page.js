// Render sponsors on sponsors.html (live updates). Container: #sponsors-grid or #sponsors-list-public
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = u => { const v=String(u||'').trim(); return v ? (/^https?:\/\//i.test(v)?v:`https://${v}`) : ''; };

  async function render(){
    const box = $('#sponsors-grid') || $('#sponsors-list-public');
    if (!box) return;
    const d = await S.getData();
    const arr = d.sponsors || [];
    if (!arr.length){
      box.innerHTML = '<div class="card soft"><p class="muted">No sponsors yet.</p></div>';
      return;
    }
    box.innerHTML = arr.map(s => {
      const link = norm(s.link);
      return `
        <a class="sponsor-card" ${link ? `href="${esc(link)}" target="_blank" rel="noopener"`:''}>
          <div class="cover" style="background-image:url('${esc(s.image || 'assets/img/placeholder-logo.png')}')"></div>
          <div class="pad"><h4>${esc(s.name || '')}</h4></div>
          <div class="overlay">
            <div class="links">
              ${link ? `<span class="chip">Visit</span>` : `<span class="chip" style="opacity:.75;cursor:default">No link</span>`}
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
