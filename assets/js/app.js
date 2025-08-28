document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash');
  if (splash){ setTimeout(()=> splash.style.opacity = '0', 900); setTimeout(()=> splash.style.display = 'none', 1500); }
  window.UI.nav();
  window.UI.year();

  const d = window.StorageAPI.getData();

  // Home: Club info
  if (document.getElementById('club-info')){
    const wrap = document.getElementById('club-info');
    wrap.innerHTML = (d.clubInfo||[]).map(i => `
      <article class="card soft hover-pop">
        <h3>${window.UI.escape(i.title || i.section || '')}</h3>
        <p>${window.UI.escape(i.text || '')}</p>
      </article>
    `).join('');
  }

  // Home: Organizers
  if (document.getElementById('organizers')){
    const org = document.getElementById('organizers');
    org.innerHTML = (d.organizers||[]).map(o => `
      <div class="organizer">
        <img src="${window.UI.escape(o.image||'https://placehold.co/160x160?text=?')}" alt="${window.UI.escape(o.name)}"/>
        <h4>${window.UI.escape(o.name)}</h4>
        <p class="muted">${window.UI.escape(o.role||'')}</p>
      </div>
    `).join('');
  }

  // Home: Best projects
  if (document.getElementById('best-projects')){
    const b = document.getElementById('best-projects');
    const best = [];
    const week = d.projects.find(p=>p.award==='week');
    const month = d.projects.find(p=>p.award==='month');
    const year = d.projects.find(p=>p.award==='year');
    if (week) best.push({label:'Best of Week', ...week});
    if (month) best.push({label:'Best of Month', ...month});
    if (year) best.push({label:'Best of Year', ...year});
    b.innerHTML = best.map(p => `
      <article class="card hover-lift">
        <h3>${window.UI.escape(p.label)}: ${window.UI.escape(p.name)}</h3>
        <p class="muted">By: ${window.UI.escape(p.creators||'')}</p>
        <p>${window.UI.escape(p.description||'')}</p>
        <div class="project-links">
          ${p.demo ? `<a class="chip" href="${window.UI.escape(p.demo)}" target="_blank">Demo</a>` : ''}
          ${p.code ? `<a class="chip" href="${window.UI.escape(p.code)}" target="_blank">Code</a>` : ''}
        </div>
      </article>
    `).join('') || '<p class="muted">No featured projects yet.</p>';
  }

  // Home: Resources
  if (document.getElementById('resources')){
    const r = document.getElementById('resources');
    r.innerHTML = (d.resources||[]).map(x => `
      <article class="card soft hover-lift">
        <h3>${window.UI.escape(x.title)}</h3>
        <p>${window.UI.escape(x.description||'')}</p>
        <a class="chip" href="${window.UI.escape(x.url)}" target="_blank">Open</a>
      </article>
    `).join('');
  }

  // Home: Sponsors sample + contact/socials
  if (document.getElementById('home-sponsors')){
    const sponsors = d.sponsors.slice(0, 4);
    const sWrap = document.getElementById('home-sponsors');
    sWrap.innerHTML = sponsors.map(s=> `
      <article class="card sponsor hover-lift">
        <img class="sponsor-logo" src="${window.UI.escape(s.image || '')}" alt="${window.UI.escape(s.name || '')}" />
        <h3>${window.UI.escape(s.name || '')}</h3>
      </article>
    `).join('');
  }

  if (document.getElementById('contact-cards')){
    const contactCards = document.getElementById('contact-cards');
    contactCards.innerHTML = `
      <article class="card soft hover-lift"><h3>Email</h3><p>${window.UI.escape(d.settings.contact)}</p></article>
      <article class="card soft hover-lift"><h3>Slack</h3><p><a href="https://hackclub.com/slack" target="_blank">Join</a></p></article>
      <article class="card soft hover-lift"><h3>GitHub</h3><p><a href="https://github.com/hackclub" target="_blank">Explore</a></p></article>
    `;
  }

  // Counters
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length){
    const stat = window.StorageAPI.stats();
    const map = { participants: stat.participants, projects: stat.projects, organizers: stat.organizers };
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        if (en.isIntersecting){
          const el = en.target; const key = el.dataset.counter; const target = map[key]||0;
          let cur=0; const step = Math.max(1, Math.round(target/60));
          const t = setInterval(()=>{ cur+=step; if(cur>=target){cur=target; clearInterval(t);} el.textContent = cur; }, 25);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c=> obs.observe(c));
  }

  // Footer
  const fc = document.getElementById('footer-contact');
  const fs = document.getElementById('footer-socials');
  if (fc) fc.textContent = d.settings.contact;
  if (fs) fs.innerHTML = (d.settings.socials||[]).map(s=> `<a href="${window.UI.escape(s.url)}" target="_blank" title="${window.UI.escape(s.name)}">${s.name[0]}</a>`).join('');

  // Donation link if present
  const donateLink = document.getElementById('donate-link');
  if (donateLink){
    donateLink.href = (window.AppConfig?.payment?.donationLink) || window.StorageAPI.getData().settings.donationLink;
  }
});
