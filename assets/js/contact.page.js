// Render contact + info on contact.html. Containers: #contact-cards and #club-info
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = u => { const v=String(u||'').trim(); return v ? (/^https?:\/\//i.test(v)?v:`https://${v}`) : ''; };

  async function renderContacts(){
    const box = $('#contact-cards') || $('#contact-grid'); if (!box) return;
    const d = await S.getData(); const s = d.settings || {};
    const items = [];
    if (s.contact || s.adminEmail) items.push({ title:'Email', value: s.contact || s.adminEmail, link:`mailto:${s.contact || s.adminEmail}` });
    if (s.donationLink) items.push({ title:'Donation', value:'Support the club', link:norm(s.donationLink) });
    box.innerHTML = items.length ? items.map(i => `
      <a class="contact-card" ${i.link ? `href="${esc(i.link)}" target="_blank" rel="noopener"`:''}>
        <div class="pad"><h4>${esc(i.title)}</h4><p class="muted">${esc(i.value)}</p></div>
        <div class="overlay"><div class="links"><span class="chip">Open</span></div></div>
      </a>`).join('') : '<div class="card soft"><p class="muted">No contact details yet.</p></div>';
  }

  async function renderInfo(){
    const box = $('#club-info'); if (!box) return;
    const d = await S.getData(); const info = d.information || {}; const keys = Object.keys(info);
    box.innerHTML = keys.length ? keys.map(k => `
      <article class="card soft"><h3>${esc(k.replaceAll('_',' '))}</h3><div class="prose">${info[k]||''}</div></article>
    `).join('') : '<div class="card soft"><p class="muted">No information yet.</p></div>';
  }

  function renderAll(){ renderContacts(); renderInfo(); }
  document.addEventListener('DOMContentLoaded', renderAll);
  window.addEventListener('clubDataUpdated', renderAll);
})();
