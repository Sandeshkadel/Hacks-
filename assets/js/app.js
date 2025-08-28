// Public site rendering: robust organizers render and live updates
document.addEventListener('DOMContentLoaded', () => {
  const UI = window.UI || { escape: (s)=>String(s??'') };
  const esc = (s) => UI.escape(s);

  function renderOrganizers() {
    const data = (window.StorageAPI?.getData?.() || {}).organizers || [];
    const html = (data.length ? data : []).map(o => `
      <article class="card overlay-card">
        <div class="img-wrap">
          <img src="${esc(o.image || 'https://placehold.co/320x200?text=Organizer')}" alt="${esc(o.name || 'Organizer')}" />
        </div>
        <div class="info">
          <h3>${esc(o.name || '')}</h3>
          <p class="muted">${esc(o.role || '')}</p>
        </div>
        <div class="overlay">
          <h3>${esc(o.name || '')}</h3>
          <p class="muted">${esc(o.role || '')}</p>
          ${Array.isArray(o.socials) && o.socials.length ? `
            <div class="socials">
              ${o.socials.map(s => `<a class="chip sm" href="${esc(s.url || '#')}" target="_blank" rel="noopener">${esc(s.name || 'Link')}</a>`).join('')}
            </div>` : ''
          }
        </div>
      </article>
    `).join('') || '<p class="muted">No organizers yet.</p>';

    // Support both possible container IDs
    const elA = document.getElementById('organizers');
    const elB = document.getElementById('organizers-grid');
    if (elA) elA.innerHTML = html;
    if (elB) elB.innerHTML = html;
  }

  // Optional: other sections can stay as-is; ensure at least basic UI setup runs
  try { window.UI?.nav?.(); window.UI?.year?.(); } catch {}

  // First paint
  try { renderOrganizers(); } catch (e) { console.error('Render organizers failed:', e); }

  // Live re-render when Admin saves to LocalStorage (no page reload needed)
  window.addEventListener('clubDataUpdated', (e) => {
    try { renderOrganizers(); } catch {}
  });
});
