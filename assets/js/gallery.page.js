// Public Gallery page: hover info overlays + modal viewer with close button.
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);

  function ensureCss(){
    if (document.getElementById('gallery-css')) return;
    const css = `
      .grid-gallery { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:12px; }
      .gallery-item { position:relative; overflow:hidden; border-radius:10px; background:#111; cursor: zoom-in; }
      .gallery-item img, .gallery-item video { width:100%; height:200px; object-fit:cover; display:block; }
      .gallery-item .overlay { position:absolute; inset:0; background: linear-gradient(transparent, rgba(0,0,0,.7)); color:#fff;
        opacity:0; transition:opacity .2s; display:flex; flex-direction:column; justify-content:flex-end; padding:10px; }
      .gallery-item:hover .overlay { opacity:1; }
      .lightbox { position:fixed; inset:0; background:rgba(0,0,0,.8); display:none; align-items:center; justify-content:center; z-index:9999; }
      .lightbox.open { display:flex; }
      .lightbox .content { position:relative; max-width:90vw; max-height:90vh; }
      .lightbox .content img, .lightbox .content video { max-width:100%; max-height:90vh; display:block; }
      .lightbox .close { position:absolute; top:-38px; right:0; background:#222; color:#fff; border:0; padding:8px 12px; border-radius:6px; cursor:pointer; }
      .lightbox .close:hover { background:#333; }
    `;
    const s = document.createElement('style');
    s.id = 'gallery-css'; s.textContent = css; document.head.appendChild(s);
  }

  function mountLightbox(){
    if ($('.lightbox')) return;
    const box = document.createElement('div');
    box.className = 'lightbox'; box.innerHTML = `
      <div class="content">
        <button class="close" type="button">Cancel</button>
        <div class="media"></div>
      </div>
    `;
    box.addEventListener('click', (e) => {
      if (e.target.classList.contains('lightbox') || e.target.classList.contains('close')) box.classList.remove('open');
    });
    document.body.appendChild(box);
  }

  function openMedia(item){
    const lb = $('.lightbox'); if (!lb) return;
    const media = lb.querySelector('.media'); media.innerHTML = '';
    if ((item.type || 'image') === 'video'){
      const v = document.createElement('video');
      v.src = item.src; v.controls = true; v.autoplay = true;
      media.appendChild(v);
    } else {
      const img = document.createElement('img'); img.src = item.src; media.appendChild(img);
    }
    lb.classList.add('open');
  }

  async function render(){
    ensureCss(); mountLightbox();
    const grid = $('#gallery-grid'); if (!grid) return;
    const d = await S.getData();
    const items = d.gallery || [];
    if (!items.length){ grid.innerHTML = '<div class="card soft"><p class="muted">No media yet.</p></div>'; return; }
    grid.innerHTML = items.map(it => `
      <div class="gallery-item" data-id="${it.id}">
        ${it.type === 'video' ? `<video src="${it.src}" muted></video>` : `<img src="${it.src}" alt="${it.event || 'Gallery'}" />`}
        <div class="overlay">
          <strong>${esc(it.event || it.type || '')}</strong>
          ${it.description ? `<span class="muted">${esc(it.description)}</span>`:''}
        </div>
      </div>
    `).join('');
    grid.addEventListener('click', (e) => {
      const el = e.target.closest('.gallery-item'); if (!el) return;
      const id = el.getAttribute('data-id');
      const item = (items || []).find(x => x.id === id);
      if (item) openMedia(item);
    }, { once: true });
  }

  const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
