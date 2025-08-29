// Render gallery on gallery.html with hover + lightbox. Container: #gallery-grid
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  function ensureLightbox(){
    if (document.querySelector('.lightbox')) return;
    const box = document.createElement('div');
    box.className = 'lightbox'; box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;z-index:9999;';
    box.innerHTML = `
      <div class="content" style="position:relative;max-width:90vw;max-height:90vh;">
        <button class="close" type="button" style="position:absolute;top:-40px;right:0;background:#222;color:#fff;border:0;padding:8px 12px;border-radius:6px;cursor:pointer;">Close</button>
        <div class="media"></div>
      </div>`;
    box.addEventListener('click', (e)=>{ if (e.target.classList.contains('lightbox') || e.target.classList.contains('close')) box.style.display='none'; });
    document.body.appendChild(box);
  }
  function openMedia(item){
    const box = document.querySelector('.lightbox'); if (!box) return;
    const m = box.querySelector('.media'); m.innerHTML='';
    if ((item.type||'image')==='video'){ const v=document.createElement('video'); v.src=item.src; v.controls=true; v.autoplay=true; m.appendChild(v); }
    else { const img=document.createElement('img'); img.src=item.src; img.style.maxWidth='90vw'; img.style.maxHeight='90vh'; m.appendChild(img); }
    box.style.display='flex';
  }

  async function render(){
    ensureLightbox();
    const grid = document.getElementById('gallery-grid'); if (!grid) return;
    const d = await S.getData(); const items = d.gallery || [];
    grid.innerHTML = items.length ? items.map(it => `
      <div class="gallery-card" data-id="${esc(it.id)}">
        ${it.type==='video' ? `<video src="${esc(it.src)}" muted></video>` : `<img src="${esc(it.src)}" alt="${esc(it.event||'Gallery')}" />`}
        <div class="overlay"><div class="meta">
          <strong>${esc(it.event || it.type || '')}</strong>
          ${it.description ? `<div class="muted">${esc(it.description)}</div>`:''}
        </div></div>
      </div>
    `).join('') : '<div class="card soft"><p class="muted">No media yet.</p></div>';
    grid.onclick = (e) => {
      const el = e.target.closest('.gallery-card'); if (!el) return;
      const id = el.getAttribute('data-id'); const item = (items||[]).find(x=>x.id===id);
      if (item) openMedia(item);
    };
  }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
