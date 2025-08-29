// Public site renderer: pulls data from Firestore via StorageAPI and populates sections.
// Works on index.html and any page that includes the needed section IDs.
(function(){
  const S = window.StorageAPI;

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const esc = (s) => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function onData(fn){ window.addEventListener('clubDataUpdated', fn); }

  // Stats counters on index
  function renderStats(){
    const counters = {
      participants: $('[data-counter="participants"]'),
      projects: $('[data-counter="projects"]'),
      organizers: $('[data-counter="organizers"]')
    };
    if (!counters.participants) return;
    const st = S.stats();
    Object.entries(counters).forEach(([k, el]) => {
      if (!el) return;
      const target = Number(st[k] || 0);
      const cur = Number(el.textContent || 0);
      if (target === cur){ el.textContent = String(target); return; }
      const start = performance.now(), dur = 500;
      (function step(t){
        const p = Math.min(1, (t - start) / dur);
        el.textContent = String(Math.round(cur + (target - cur) * p));
        if (p < 1) requestAnimationFrame(step);
      })(start);
    });
  }

  function renderClubInfo(){
    const box = $('#club-info'); if (!box) return;
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
    const box = $('#organizers'); if (!box) return;
    S.getData().then(d => {
      const arr = d.organizers || [];
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No organizers yet.</p></div>'; return; }
      box.innerHTML = arr.map(o => `
        <article class="card person">
          <div class="avatar" style="background-image:url('${esc(o.image || 'assets/img/placeholder-user.png')}')"></div>
          <h4>${esc(o.name || '')}</h4>
          ${o.role ? `<p class="muted">${esc(o.role)}</p>`:''}
          ${o.socials ? `<div class="row wrap">${esc(o.socials).split(',').map(s => s.trim()).filter(Boolean).map(u => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">Link</a>`).join('')}</div>`:''}
        </article>
      `).join('');
    });
  }

  function renderHomeProjects(){
    const box = $('#home-projects'); if (!box) return;
    S.getData().then(d => {
      const arr = (d.projects || []).slice(0, 6);
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No projects yet.</p></div>'; return; }
      box.innerHTML = arr.map(p => `
        <article class="card project hoverable">
          <div class="cover" style="background-image:url('${esc(p.image || 'assets/img/placeholder-cover.jpg')}')"></div>
          <div class="pad">
            <h4>${esc(p.name || '')}</h4>
            ${p.creators ? `<p class="muted">by ${esc(p.creators)}</p>`:''}
            <div class="row">
              ${p.demo ? `<a class="chip" href="${esc(p.demo)}" target="_blank" rel="noopener">Demo</a>`:''}
              ${p.code ? `<a class="chip" href="${esc(p.code)}" target="_blank" rel="noopener">Code</a>`:''}
            </div>
          </div>
        </article>
      `).join('');
    });
  }

  function renderSponsors(){
    const box = $('#home-sponsors'); if (!box) return;
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
    const box = $('#contact-cards'); if (!box) return;
    S.getData().then(d => {
      const s = d.settings || {};
      const items = [];
      if (s.contact || s.adminEmail) items.push({ title:'Email', value: s.contact || s.adminEmail, link:`mailto:${s.contact || s.adminEmail}` });
      if (s.donationLink) items.push({ title:'Donation', value:'Support the club', link:s.donationLink });
      const socials = Array.isArray(s.socials) ? s.socials : String(s.socials||'').split(',').map(x=>x.trim()).filter(Boolean);
      socials.forEach(u => items.push({ title:'Social', value:u, link:u }));
      if (!items.length){ box.innerHTML = '<div class="card soft"><p class="muted">No contacts yet.</p></div>'; return; }
      box.innerHTML = items.map(i => `
        <a class="card soft" ${i.link ? `href="${esc(i.link)}" target="_blank" rel="noopener"`:''}>
          <h4>${esc(i.title)}</h4>
          <p class="muted">${esc(i.value)}</p>
        </a>
      `).join('');
    });
  }

  // Optional: inject minimal CSS for hover overlays if site CSS lacks it
  (function ensureHoverCss(){
    if (document.getElementById('hover-overlay-css')) return;
    const css = `
      .hoverable { position: relative; overflow: hidden; }
      .hoverable .cover { width:100%; height:160px; background:#111 center/cover no-repeat; }
      .hoverable .cover.contain { background-size: contain; background-color:#111; }
      .hoverable::after { content:''; position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,.35)); opacity:0; transition:opacity .2s; }
      .hoverable:hover::after { opacity:1; }
      .card.person .avatar { width:96px; height:96px; border-radius:50%; background:#222 center/cover no-repeat; margin: 8px auto; }
      .prose p { margin: 0.4rem 0; }
    `;
    const s = document.createElement('style');
    s.id = 'hover-overlay-css';
    s.textContent = css;
    document.head.appendChild(s);
  })();

  async function initial(){
    try { await S.getData(); } catch {}
    renderStats();
    renderClubInfo();
    renderOrganizers();
    renderHomeProjects();
    renderSponsors();
    renderContacts();
  }
  document.addEventListener('DOMContentLoaded', initial);
  onData(()=> { renderStats(); renderClubInfo(); renderOrganizers(); renderHomeProjects(); renderSponsors(); renderContacts(); });
})();
