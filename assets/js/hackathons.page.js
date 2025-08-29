// Public Hackathons/Events page: hoverable cards with details.
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  function ensureCss(){
    if (document.getElementById('events-css')) return;
    const css = `
      .events-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap:14px; }
      .event-card { position:relative; overflow:hidden; border-radius:10px; background:#111; color:#fff; }
      .event-card .cover { height:160px; background:#111 center/cover no-repeat; }
      .event-card .pad { padding:12px; }
      .event-card .hover { position:absolute; inset:0; background:rgba(0,0,0,.5); opacity:0; transition:.2s; display:flex; align-items:center; justify-content:center; text-align:center; padding:10px; }
      .event-card:hover .hover { opacity:1; }
      .event-card .row { display:flex; gap:8px; flex-wrap:wrap; }
    `;
    const s = document.createElement('style');
    s.id='events-css'; s.textContent = css; document.head.appendChild(s);
  }
  const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function render(){
    ensureCss();
    const grid = document.getElementById('hackathons-list-public') || document.getElementById('events-grid') || document.getElementById('hackathons-grid');
    if (!grid) return;
    const d = await S.getData();
    const arr = d.hackathons || [];
    if (!arr.length){ grid.innerHTML = '<div class="card soft"><p class="muted">No events yet.</p></div>'; return; }
    grid.innerHTML = arr.map(h => `
      <article class="event-card hoverable">
        <div class="cover" style="background-image:url('${esc(h.cover || 'assets/img/placeholder-cover.jpg')}')"></div>
        <div class="pad">
          <h3>${esc(h.title || '')}</h3>
          ${h.date ? `<p class="muted">${esc(h.date)}</p>`:''}
          <div class="row">
            ${h.website ? `<a class="chip" href="${esc(h.website)}" target="_blank" rel="noopener">Website</a>`:''}
          </div>
        </div>
        <div class="hover">
          <div>
            <p>${esc(h.description || '')}</p>
            ${h.prizes ? `<p class="muted">Prizes: ${esc(h.prizes)}</p>`:''}
          </div>
        </div>
      </article>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
