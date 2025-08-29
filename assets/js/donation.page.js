// Render donation on donation.html. Container: #donation-card or #donation-area
(function(){
  const S = window.StorageAPI; const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = u => { const v=String(u||'').trim(); return v ? (/^https?:\/\//i.test(v)?v:`https://${v}`) : ''; };

  async function render(){
    const box = $('#donation-card') || $('#donation-area'); if (!box) return;
    const s = await S.settings(); const link = norm(s.donationLink);
    if (!link){ box.innerHTML = '<div class="card soft"><p class="muted">No donation link configured yet.</p></div>'; return; }
    box.innerHTML = `
      <a class="donation-card" href="${esc(link)}" target="_blank" rel="noopener">
        <div class="pad"><h3>Support the Club</h3><p class="muted">Click to donate</p></div>
        <div class="overlay"><div class="links"><span class="chip">Donate</span></div></div>
      </a>`;
  }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('clubDataUpdated', render);
})();
