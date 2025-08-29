// Public renderer for index page with project hover overlay and live updates.
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = (s) => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Inject minimal CSS for hover overlays (organizers + projects)
  (function ensureCss(){
    if (!document.getElementById('index-hover-css')) {
      const css = `
        /* Organizer hover socials */
        .organizer-card { position:relative; overflow:hidden; }
        .organizer-card .avatar { width:96px; height:96px; border-radius:50%; background:#222 center/cover no-repeat; margin: 8px auto; }
        .organizer-card .overlay { position:absolute; inset:0; display:flex; align-items:flex-end; justify-content:center; padding:10px; background:linear-gradient(transparent, rgba(0,0,0,.55)); opacity:0; transition:opacity .2s; }
        .organizer-card:hover .overlay { opacity:1; }
        .organizer-card .overlay .links { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
        .organizer-card .overlay .chip { background:#000a; color:#fff; border:1px solid #fff2; }

        /* Project hover overlay */
        .project-card { position:relative; overflow:hidden; }
        .project-card .cover { width:100%; height:180px; background:#111 center/cover no-repeat; }
        .project-card .overlay { position:absolute; inset:0; display:flex; align-items:flex-end; justify-content:center; padding:12px; background:linear-gradient(transparent, rgba(0,0,0,.65)); opacity:0; transition:opacity .2s; }
        .project-card:hover .overlay { opacity:1; }
        .project-card .links { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
        .chip { padding:6px 10px; border-radius: 16px; background:#111a; color:#fff; border:1px solid #fff3; text-decoration:none; }
      `;
      const s = document.createElement('style');
      s.id = 'index-hover-css'; s.textContent = css; document.head.appendChild(s);
    }
  })();

  // Helpers
  function normLink(raw){ const v = String(raw||'').trim(); if (!v) return ''; return /^https?:\/\//i.test(v) ? v : `https://${v}`; }

  function renderStats(){
    const p = $('[data-counter="participants"]');
    const pr = $('[data-counter="projects"]');
    const o = $('[data-counter="organizers"]');
    if (!p) return;
    const st = S.stats();
    p.textContent = st.participants || 0;
    if (pr) pr.textContent = st.projects || 0;
    if (o) o.textContent = st.organizers || 0;
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
      box.innerHTML = arr.map(o => {
        const socials = [
          o.github && { label:'GitHub', href: /^https?:\/\//.test(o.github) ? o.github : `https://github.com/${String(o.github).replace(/^@/,'')}` },
          o.facebook && { label:'Facebook', href: /^https?:\/\//.test(o.facebook) ? o.facebook : `https://facebook.com/${String(o.facebook).replace(/^@/,'')}` },
          o.instagram && { label:'Instagram', href: /^https?:\/\//.test(o.instagram) ? o.instagram : `https://instagram.com/${String(o.instagram).replace(/^@/,'')}` },
          o.whatsapp && { label:'WhatsApp', href: /^https?:\/\//.test(o.whatsapp) ? o.whatsapp : `https://wa.me/${String(o.whatsapp).replace(/[^\d]/g,'')}` },
          o.linkedin && { label:'LinkedIn', href: /^https?:\/\//.test(o.linkedin) ? o.linkedin : `https://www.linkedin.com/in/${String(o.linkedin).replace(/^@/,'')}` },
        ].filter(Boolean);
        return `
          <article class="card person organizer-card">
            <div class="avatar" style="background-image:url('${esc(o.image || 'assets/img/placeholder-user.png')}')"></div>
            <h4>${esc(o.name || '')}</h4>
            ${o.role ? `<p class="muted">${esc(o.role)}</p>`:''}
            ${socials.length ? `
              <div class="overlay">
                <div class="links">
                  ${socials.map(s => `<a class="chip" href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')}
                </div>
              </div>` : ''}
          </article>
        `;
      }).join('');
    });
  }

  function renderProjects(){
    const box = document.getElementById('home-projects'); if (!box) return;
    S.getData().then(d => {
      const arr = (d.projects || []).slice(0, 12);
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No projects yet.</p></div>'; return; }
      box.innerHTML = arr.map(p => {
        const demo = normLink(p.demo);
        const code = normLink(p.code);
        const img = normLink(p.image);
        const chips = [
          p.creators && `<span class="chip" style="cursor:default">by ${esc(p.creators)}</span>`,
          demo && `<a class="chip" href="${esc(demo)}" target="_blank" rel="noopener">Demo</a>`,
          code && `<a class="chip" href="${esc(code)}" target="_blank" rel="noopener">Code</a>`,
          img && `<a class="chip" href="${esc(img)}" target="_blank" rel="noopener">Image</a>`
        ].filter(Boolean).join('');
        return `
          <article class="card project-card">
            <div class="cover" style="background-image:url('${esc(p.image || 'assets/img/placeholder-cover.jpg')}')"></div>
            <div class="pad">
              <h4>${esc(p.name || '')}</h4>
            </div>
            <div class="overlay">
              <div class="links">${chips}</div>
            </div>
          </article>
        `;
      }).join('');
    });
  }

  function renderSponsors(){
    const box = document.getElementById('home-sponsors'); if (!box) return;
    S.getData().then(d => {
      const arr = d.sponsors || [];
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No sponsors yet.</p></div>'; return; }
      box.innerHTML = arr.map(s => `
        <a class="card sponsor" ${s.link ? `href="${esc(normLink(s.link))}" target="_blank" rel="noopener"`:''}>
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
      if (s.donationLink) items.push({ title:'Donation', value:'Support the club', link:normLink(s.donationLink) });
      box.innerHTML = items.length ? items.map(i => `
        <a class="card soft" ${i.link ? `href="${i.link}" target="_blank" rel="noopener"`:''}>
          <h4>${esc(i.title)}</h4>
          <p class="muted">${esc(i.value)}</p>
        </a>
      `).join('') : '<div class="card soft"><p class="muted">No contacts yet.</p></div>';
    });
  }

  function renderAll(){
    renderStats();
    renderInformation();
    renderOrganizers();
    renderProjects();
    renderSponsors();
    renderContacts();
    window.UI?.hideSplash?.();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try { await S.getData(); } catch {}
    renderAll();
  });

  // Live updates for every change coming from Firestore
  window.addEventListener('clubDataUpdated', renderAll);
})();
