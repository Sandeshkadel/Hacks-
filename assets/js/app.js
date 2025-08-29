// Public rendering + 2s boot splash + live refresh
document.addEventListener('DOMContentLoaded', () => {
  // Splash visible for 2 seconds
  const splash = document.getElementById('splash');
  if (splash) {
    const hideSplash = () => {
      splash.classList.add('fadeout');
      setTimeout(() => { splash.style.display = 'none'; }, 450);
    };
    setTimeout(hideSplash, 2000);
  }

  const UI = window.UI || { escape: (s)=>String(s??'') };
  const esc = (s) => UI.escape(s);
  const data = () => (window.StorageAPI?.getData?.() || {});

  const nameFromUrl = (u='') => {
    const x = u.toLowerCase();
    if (x.includes('github')) return 'GitHub';
    if (x.includes('linkedin')) return 'LinkedIn';
    if (x.includes('twitter') || x.includes('x.com')) return 'Twitter';
    if (x.includes('instagram')) return 'Instagram';
    if (x.includes('facebook')) return 'Facebook';
    if (x.includes('youtube')) return 'YouTube';
    return 'Link';
  };
  const renderSocials = (arr=[]) => (arr||[]).map(s => `<a class="chip sm" href="${esc(s.url||'#')}" target="_blank" rel="noopener">${esc(s.name || nameFromUrl(s.url||''))}</a>`).join('');

  function renderClubInfo(d){
    const wrap = document.getElementById('club-info');
    if (!wrap) return;
    const info = d.information || {};
    const entries = Object.entries(info);
    if (!entries.length){
      wrap.innerHTML = '<p class="muted">No information yet. Admin can add it in Information tab.</p>';
      return;
    }
    wrap.innerHTML = entries.map(([key, html]) => `
      <article class="card soft">
        <h3>${esc(key.replaceAll('_',' '))}</h3>
        <div class="muted" style="max-height:160px; overflow:auto">${html}</div>
      </article>
    `).join('');
  }

  function renderOrganizers(d){
    const wrap = document.getElementById('organizers');
    if (!wrap) return;
    const orgs = d.organizers || [];
    wrap.innerHTML = (orgs.length ? orgs : []).map(o => `
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
          ${Array.isArray(o.socials) && o.socials.length ? `<div class="socials">${renderSocials(o.socials)}</div>` : ''}
        </div>
      </article>
    `).join('') || '<p class="muted">No organizers yet.</p>';
  }

  function renderProjects(d){
    const wrap = document.getElementById('home-projects');
    if (!wrap) return;
    let items = (d.projects||[]).slice();
    const awardOrder = { year:0, month:1, week:2, '':3, undefined:3 };
    items.sort((a,b)=> (awardOrder[a.award||''] ?? 3) - (awardOrder[b.award||''] ?? 3));
    items = items.slice(0, 8);
    wrap.innerHTML = items.map(p => `
      <article class="card overlay-card">
        <div class="img-wrap">
          <img src="${esc(p.image||'https://placehold.co/640x360?text=Project')}" alt="${esc(p.name||'')}" />
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
          <div class="socials" style="margin-top:8px">${renderSocials(p.makerSocials||[])}</div>
        </div>
      </article>
    `).join('') || '<p class="muted">No projects yet.</p>';
  }

  function renderSponsors(d){
    const wrap = document.getElementById('home-sponsors');
    if (!wrap) return;
    const sponsors = (d.sponsors||[]).slice(0, 4);
    wrap.innerHTML = sponsors.map(s=> `
      <article class="card sponsor hover-lift">
        <img class="sponsor-logo" src="${esc(s.image || '')}" alt="${esc(s.name || '')}" />
        <h3>${esc(s.name || '')}</h3>
      </article>
    `).join('') || '<p class="muted">No sponsors yet.</p>';
  }

  function renderContact(d){
    const wrap = document.getElementById('contact-cards');
    if (!wrap) return;
    wrap.innerHTML = `
      <article class="card soft hover-lift"><h3>Email</h3><p>${esc(d.settings?.contact || d.settings?.adminEmail || '')}</p></article>
      <article class="card soft hover-lift"><h3>Slack</h3><p><a href="https://hackclub.com/slack" target="_blank">Join</a></p></article>
      <article class="card soft hover-lift"><h3>GitHub</h3><p><a href="https://github.com/hackclub" target="_blank">Explore</a></p></article>
    `;
  }

  function animateCounters(d){
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;
    const participants = (d.members||[]).filter(m=>m.status==='approved').length;
    const map = { participants, projects: (d.projects||[]).length, organizers: (d.organizers||[]).length };
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

  async function renderAll(){
    const d = await window.StorageAPI.getData();
    renderClubInfo(d);
    renderOrganizers(d);
    renderProjects(d);
    renderSponsors(d);
    renderContact(d);
    animateCounters(d);
  }

  renderAll();
  window.addEventListener('clubDataUpdated', renderAll);
});
