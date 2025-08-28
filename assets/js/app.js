document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash');
  if (splash){ setTimeout(()=> splash.style.opacity = '0', 900); setTimeout(()=> splash.style.display = 'none', 1500); }
  window.UI.nav();
  window.UI.year();

  const d = window.StorageAPI.getData();

  // Helpers
  const esc = (s) => window.UI.escape(s);
  const iconFor = (nameOrUrl='') => {
    const x = nameOrUrl.toLowerCase();
    if (x.includes('github')) return 'GitHub';
    if (x.includes('linkedin')) return 'LinkedIn';
    if (x.includes('twitter') || x.includes('x.com')) return 'Twitter';
    if (x.includes('instagram')) return 'Instagram';
    if (x.includes('facebook')) return 'Facebook';
    if (x.includes('youtube')) return 'YouTube';
    return 'Link';
  };
  const renderSocials = (arr=[]) => (arr||[])
    .map(s => `<a class="chip sm" href="${esc(s.url||'#')}" target="_blank" rel="noopener">${esc(s.name || iconFor(s.url||''))}</a>`)
    .join('');

  // Organizers grid with hover overlay
  const orgWrap = document.getElementById('organizers-grid');
  if (orgWrap){
    orgWrap.innerHTML = (d.organizers||[]).map(o => `
      <article class="card overlay-card">
        <div class="img-wrap">
          <img src="${esc(o.image||'https://placehold.co/320x200?text=Organizer')}" alt="${esc(o.name||'Organizer')}" />
        </div>
        <div class="info">
          <h3>${esc(o.name||'')}</h3>
          <p class="muted">${esc(o.role||'')}</p>
        </div>
        <div class="overlay">
          <h3>${esc(o.name||'')}</h3>
          <p class="muted">${esc(o.role||'')}</p>
          <div class="socials">${renderSocials(o.socials||[])}</div>
        </div>
      </article>
    `).join('') || '<p class="muted">No organizers yet.</p>';
  }

  // Clubs grid with hover overlay (name + link)
  const clubsWrap = document.getElementById('clubs-grid');
  if (clubsWrap){
    const clubs = d.clubs || [];
    clubsWrap.innerHTML = clubs.map(c => `
      <article class="card overlay-card">
        <a class="img-wrap" href="${esc(c.link||'#')}" target="_blank" rel="noopener" title="${esc(c.name||'Club')}">
          <img src="${esc(c.image||'https://placehold.co/320x200?text=Club')}" alt="${esc(c.name||'Club')}" />
        </a>
        <div class="info">
          <h3>${esc(c.name||'')}</h3>
          ${c.link ? `<p class="muted ellipsis"><a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.link)}</a></p>`:''}
        </div>
        <div class="overlay">
          <h3>${esc(c.name||'')}</h3>
          ${c.link ? `<p class="muted ellipsis"><a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.link)}</a></p>`:''}
          <div class="socials">${renderSocials(c.socials||[])}</div>
        </div>
      </article>
    `).join('') || '<p class="muted">No clubs listed yet.</p>';
  }

  // Projects on home with hover overlay (first 6 or featured ones first)
  const projWrap = document.getElementById('home-projects');
  if (projWrap){
    let items = (d.projects||[]).slice();
    // Prefer featured awards first
    const awardOrder = { year:0, month:1, week:2, '':3, undefined:3 };
    items.sort((a,b)=> (awardOrder[a.award||''] ?? 3) - (awardOrder[b.award||''] ?? 3));
    items = items.slice(0, 6);
    projWrap.innerHTML = items.map(p => `
      <article class="card overlay-card">
        <div class="img-wrap">
          <img src="${esc(p.image||'https://placehold.co/640x360?text=Project')}" alt="${esc(p.name||'Project')}" />
        </div>
        <div class="info">
          <h3>${esc(p.name||'')}</h3>
          <p class="muted">${esc(p.creators||'')}</p>
        </div>
        <div class="overlay">
          <h3>${esc(p.name||'')}</h3>
          <p class="muted">${esc(p.creators||'')}</p>
          <p>${esc(p.description||'')}</p>
          <div class="row">
            ${p.demo ? `<a class="chip sm" href="${esc(p.demo)}" target="_blank" rel="noopener">Demo</a>`:''}
            ${p.code ? `<a class="chip sm" href="${esc(p.code)}" target="_blank" rel="noopener">Code</a>`:''}
            ${p.award ? `<span class="badge ${esc(p.award)}">${esc((p.award||'').toUpperCase())}</span>`:''}
          </div>
        </div>
      </article>
    `).join('') || '<p class="muted">No projects yet.</p>';
  }

  // Sponsors sample + contact/socials
  if (document.getElementById('home-sponsors')){
    const sponsors = (d.sponsors||[]).slice(0, 4);
    const sWrap = document.getElementById('home-sponsors');
    sWrap.innerHTML = sponsors.map(s=> `
      <article class="card sponsor hover-lift">
        <img class="sponsor-logo" src="${esc(s.image || '')}" alt="${esc(s.name || '')}" />
        <h3>${esc(s.name || '')}</h3>
      </article>
    `).join('') || '<p class="muted">No sponsors yet.</p>';
  }

  if (document.getElementById('contact-cards')){
    const contactCards = document.getElementById('contact-cards');
    contactCards.innerHTML = `
      <article class="card soft hover-lift"><h3>Email</h3><p>${esc(d.settings.contact || d.settings.adminEmail || '')}</p></article>
      <article class="card soft hover-lift"><h3>Slack</h3><p><a href="https://hackclub.com/slack" target="_blank">Join</a></p></article>
      <article class="card soft hover-lift"><h3>GitHub</h3><p><a href="https://github.com/hackclub" target="_blank">Explore</a></p></article>
    `;
  }

  // Counters (participants = approved members)
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length){
    const stat = window.StorageAPI.stats();
    const map = { participants: stat.participants, projects: stat.projects, organizers: stat.organizers };
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        if (en.isIntersecting){
          const el = en.target; const key = el.dataset.counter; const target = map[key]||0;
          let cur=0; const step = Math.max(1, Math.round(Math.max(target,1)/60));
          const t = setInterval(()=>{ cur+=step; if(cur>=target){cur=target; clearInterval(t);} el.textContent = cur; }, 25);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c=> obs.observe(c));
  }

  // Footer text values
  const fc = document.getElementById('footer-contact');
  const fs = document.getElementById('footer-socials');
  if (fc) fc.textContent = d.settings.contact || d.settings.adminEmail || '';
  if (fs) fs.innerHTML = (d.settings.socials||[]).map(s=> `<a href="${esc(s.url)}" target="_blank" title="${esc(s.name)}">${esc(s.name[0]||'·')}</a>`).join('');
});
