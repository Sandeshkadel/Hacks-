// Index renderer (organizers, projects with hover, sponsors with hover, contacts, info)
(function(){
  const S = window.StorageAPI;
  const $ = s => document.querySelector(s);
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = u => { const v=String(u||'').trim(); return v ? (/^https?:\/\//i.test(v)?v:`https://${v}`) : ''; };

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

  function renderInfo(){
    const box = $('#club-info'); if (!box) return;
    S.getData().then(d => {
      const info = d.information || {}; const keys = Object.keys(info);
      if (!keys.length){ box.innerHTML = '<div class="card soft"><p class="muted">No information yet.</p></div>'; return; }
      box.innerHTML = keys.slice(0,6).map(k => `
        <article class="card soft"><h3>${esc(k.replaceAll('_',' '))}</h3><div class="prose">${info[k]||''}</div></article>
      `).join('');
    });
  }

  function socialLink(v, type){
    const has = /^https?:\/\//i.test(v||''); const t = String(v||'').trim();
    if (!t) return '';
    if (type==='github') return has?t:`https://github.com/${t.replace(/^@/,'')}`;
    if (type==='facebook') return has?t:`https://facebook.com/${t.replace(/^@/,'')}`;
    if (type==='instagram') return has?t:`https://instagram.com/${t.replace(/^@/,'')}`;
    if (type==='linkedin') return has?t:`https://www.linkedin.com/in/${t.replace(/^@/,'')}`;
    if (type==='whatsapp') { if (has) return t; const digits=t.replace(/[^\d]/g,'').replace(/^977?/, '977'); return `https://wa.me/${digits}`; }
    return t;
  }

  function renderOrganizers(){
    const box = $('#organizers'); if (!box) return;
    S.getData().then(d => {
      const arr = d.organizers || [];
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No organizers yet.</p></div>'; return; }
      box.innerHTML = arr.map(o => {
        const socials = [
          o.github && { label:'GitHub', href: socialLink(o.github,'github') },
          o.facebook && { label:'Facebook', href: socialLink(o.facebook,'facebook') },
          o.instagram && { label:'Instagram', href: socialLink(o.instagram,'instagram') },
          o.whatsapp && { label:'WhatsApp', href: socialLink(o.whatsapp,'whatsapp') },
          o.linkedin && { label:'LinkedIn', href: socialLink(o.linkedin,'linkedin') }
        ].filter(Boolean);
        return `
          <article class="organizer-card">
            <div class="avatar" style="background-image:url('${esc(o.image || 'assets/img/placeholder-user.png')}')"></div>
            <h4>${esc(o.name||'')}</h4>
            ${o.role ? `<p class="muted">${esc(o.role)}</p>`:''}
            ${socials.length ? `<div class="overlay"><div class="links">
              ${socials.map(s=>`<a class="chip" href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')}
            </div></div>`:''}
          </article>
        `;
      }).join('');
    });
  }

  function renderProjects(){
    const box = $('#home-projects'); if (!box) return;
    S.getData().then(d => {
      const arr = (d.projects||[]).slice(0,12);
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No projects yet.</p></div>'; return; }
      box.innerHTML = arr.map(p => {
        const demo = norm(p.demo), code = norm(p.code), img = norm(p.image);
        const chips = [
          p.creators && `<span class="chip" style="cursor:default">by ${esc(p.creators)}</span>`,
          demo && `<a class="chip" href="${esc(demo)}" target="_blank" rel="noopener">Demo</a>`,
          code && `<a class="chip" href="${esc(code)}" target="_blank" rel="noopener">Code</a>`,
          img && `<a class="chip" href="${esc(img)}" target="_blank" rel="noopener">Image</a>`
        ].filter(Boolean).join('');
        return `
          <article class="project-card">
            <div class="cover" style="background-image:url('${esc(p.image || 'assets/img/placeholder-cover.jpg')}')"></div>
            <div class="pad">
              <h4>${esc(p.name||'')}</h4>
              ${p.creators ? `<p class="muted">${esc(p.creators)}</p>`:''}
            </div>
            <div class="overlay"><div class="links">${chips}</div></div>
          </article>
        `;
      }).join('');
    });
  }

  function renderSponsors(){
    const box = $('#home-sponsors'); if (!box) return;
    S.getData().then(d => {
      const arr = d.sponsors || [];
      if (!arr.length){ box.innerHTML = '<div class="card soft"><p class="muted">No sponsors yet.</p></div>'; return; }
      box.innerHTML = arr.map(s => {
        const link = norm(s.link);
        return `
          <a class="sponsor-card" ${link ? `href="${esc(link)}" target="_blank" rel="noopener"`:''}>
            <div class="cover" style="background-image:url('${esc(s.image || 'assets/img/placeholder-logo.png')}')"></div>
            <div class="pad"><h4>${esc(s.name||'')}</h4></div>
            <div class="overlay"><div class="links">
              ${link ? `<span class="chip">Visit</span>` : `<span class="chip" style="opacity:.75;cursor:default">No link</span>`}
            </div></div>
          </a>
        `;
      }).join('');
    });
  }

  function renderContacts(){
    const box = $('#contact-cards'); if (!box) return;
    S.getData().then(d => {
      const s = d.settings || {}; const items = [];
      if (s.contact || s.adminEmail) items.push({ title:'Email', value: s.contact || s.adminEmail, link:`mailto:${s.contact || s.adminEmail}` });
      if (s.donationLink) items.push({ title:'Donation', value:'Support the club', link:norm(s.donationLink) });
      box.innerHTML = items.length ? items.map(i => `
        <a class="contact-card" ${i.link ? `href="${i.link}" target="_blank" rel="noopener"`:''}>
          <div class="pad"><h4>${esc(i.title)}</h4><p class="muted">${esc(i.value)}</p></div>
          <div class="overlay"><div class="links"><span class="chip">Open</span></div></div>
        </a>`).join('') : '<div class="card soft"><p class="muted">No contacts yet.</p></div>';
    });
  }

  function renderAll(){
    renderStats(); renderInfo(); renderOrganizers(); renderProjects(); renderSponsors(); renderContacts();
    window.UI?.hideSplash?.();
  }

  document.addEventListener('DOMContentLoaded', async () => { try { await S.getData(); } catch {} renderAll(); });
  window.addEventListener('clubDataUpdated', renderAll);
})();
