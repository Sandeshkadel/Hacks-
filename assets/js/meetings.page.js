// Render meetings on meetings.html. Container: #meetings-grid or #meetings-list-public
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  async function render(){
    const box = $('#meetings-grid') || $('#meetings-list-public'); if (!box) return;
    const d = await S.getData(); const arr = d.meetings || [];
    box.innerHTML = arr.length ? arr.map(m => `
      <article class="contact-card">
        <div class="pad">
          <h3>${esc(m.title||'')}</h3>
          ${m.date ? `<p class="muted">${esc(m.date)}</p>`:''}
          ${m.description ? `<p>${esc(m.description)}</p>`:''}
        </div>
        <div class="overlay"><div class="links">
          ${m.zoomLink ? `<a class="chip" href="${esc(m.zoomLink)}" target="_blank" rel="noopener">Join Zoom</a>`:''}
          ${m.zoomId ? `<span class="chip" style="cursor:default">ID: ${esc(m.zoomId)}</span>`:''}
          ${m.zoomPass ? `<span class="chip" style="cursor:default">Pass: ${esc(m.zoomPass)}</span>`:''}
        </div></div>
      </article>
    `).join('') : '<div class="card soft"><p class="muted">No meetings scheduled.</p></div>';
  }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
