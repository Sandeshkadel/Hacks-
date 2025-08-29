// Public renderer for index and shared sections; also ensures splash hides.
(function(){
  const S = window.StorageAPI;
  const $ = sel => document.querySelector(sel);
  const esc = (s) => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function renderStats(){
    const p = $('[data-counter="participants"]');
    const pr = $('[data-counter="projects"]');
    const o = $('[data-counter="organizers"]');
    if (!p) return;
    const st = S.stats();
    p.textContent = st.participants || 0;
    pr && (pr.textContent = st.projects || 0);
    o && (o.textContent = st.organizers || 0);
  }

  function renderInformation(){
    const box = document.getElementById('club-info'); if (!box) return;
    S.getData().then(d => {
      const info = d.information || {};
      const keys = Object.keys(info);
      if (!keys.length){ box.innerHTML = '<div class="card soft"><p class="muted">No information yet.</p></div>'; return; }
      box.innerHTML = keys.slice(0, 6).map(k => `
        <article class="card soft">
          <h3>${esc(k.replaceAll('_',' '))}</h3>
          <div class="prose">${info[k] || ''}</div>
        </article>
      `).join('');
    });
  }

  function renderOrganizers(){
    const box = document.getElementById('organizers'); if (!box) return;
    S.getData().then(d => {
      const arr = d.organizers || [];
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No organizers yet.</p></div>'; return; }
      box.innerHTML = arr.map(o => `
        <article class="card person">
          <div class="avatar" style="background-image:url('${esc(o.image || 'assets/img/placeholder-user.png')}')"></div>
          <h4>${esc(o.name || '')}</h4>
          ${o.role ? `<p class="muted">${esc(o.role)}</p>`:''}
        </article>
      `).join('');
    });
  }

  function renderProjects(){
    const box = document.getElementById('home-projects'); if (!box) return;
    S.getData().then(d => {
      const arr = (d.projects || []).slice(0, 6);
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No projects yet.</p></div>'; return; }
      box.innerHTML = arr.map(p => `
        <article class="card project hoverable">
          <div class="cover" style="background-image:url('${esc(p.image || 'assets/img/placeholder-cover.jpg')}')"></div>
          <div class="pad">
            <h4>${esc(p.name || '')}</h4>
            ${p.creators ? `<p class="muted">by ${esc(p.creators)}</p>`:''}
          </div>
        </article>
      `).join('');
    });
  }

  function renderSponsors(){
    const box = document.getElementById('home-sponsors'); if (!box) return;
    S.getData().then(d => {
      const arr = d.sponsors || [];
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No sponsors yet.</p></div>'; return; }
      box.innerHTML = arr.map(s => `
        <a class="card sponsor hoverable" ${s.link ? `href="${esc(s.link)}" target="_blank" rel="noopener"`:''}>
          <div class="cover contain" style="background-image:url('${esc(s.image || 'assets/img/placeholder-logo.png')}')"></div>
          <div class="pad"><h4>${esc(s.name || '')}</h4></div>
        </a>
      `).join('');
    });
  }

  function renderContacts(){
    const box = document.getElementById('contact-cards'); if (!box) return;
    S.getData().then(d => {
      const s = d.settings || {};
      const items = [];
      if (s.contact || s.adminEmail) items.push({ title:'Email', value: s.contact || s.adminEmail, link:`mailto:${s.contact || s.adminEmail}` });
      if (s.donationLink) items.push({ title:'Donation', value:'Support the club', link:s.donationLink });
      box.innerHTML = items.length ? items.map(i => `
        <a class="card soft" ${i.link ? `href="${i.link}" target="_blank" rel="noopener"`:''}>
          <h4>${esc(i.title)}</h4>
          <p class="muted">${esc(i.value)}</p>
        </a>
      `).join('') : '<div class="card soft"><p class="muted">No contacts yet.</p></div>';
    });
  }

  async function init(){
    try { await S.getData(); } catch {}
    renderStats();
    renderInformation();
    renderOrganizers();
    renderProjects();
    renderSponsors();
    renderContacts();
    // Hide splash (in case UI.js missed it)
    window.UI?.hideSplash?.();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('clubDataUpdated', () => {
    renderStats(); renderInformation(); renderOrganizers(); renderProjects(); renderSponsors(); renderContacts();
    window.UI?.hideSplash?.();
  }, { once: true });
})();
