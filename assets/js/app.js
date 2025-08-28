document.addEventListener('DOMContentLoaded', () => {
  // Splash screen fade
  const splash = document.getElementById('splash');
  if (splash){
    setTimeout(()=> splash.style.opacity = '0', 900);
    setTimeout(()=> splash.style.display = 'none', 1500);
  }

  // Navbar
  window.UI.nav();
  window.UI.year();

  // Populate home dynamic sections if on index.html
  if (document.getElementById('club-info')){
    const d = window.StorageAPI.getData();
    const wrap = document.getElementById('club-info');
    wrap.innerHTML = d.clubInfo.map(i => `
      <article class="card soft hover-pop">
        <h3>${window.UI.escape(i.title)}</h3>
        <p>${window.UI.escape(i.text)}</p>
      </article>
    `).join('');

    const sponsors = d.sponsors.slice(0, 4);
    const sWrap = document.getElementById('home-sponsors');
    sWrap.innerHTML = sponsors.map(s=> `
      <article class="card sponsor hover-lift">
        <img class="sponsor-logo" src="${window.UI.escape(s.image || '')}" alt="${window.UI.escape(s.name || '')}" />
        <h3>${window.UI.escape(s.name || '')}</h3>
      </article>
    `).join('');

    const contactCards = document.getElementById('contact-cards');
    contactCards.innerHTML = `
      <article class="card soft hover-lift"><h3>Email</h3><p>${window.UI.escape(d.settings.contact)}</p></article>
      <article class="card soft hover-lift"><h3>Slack</h3><p><a href="https://hackclub.com/slack" target="_blank">Join</a></p></article>
      <article class="card soft hover-lift"><h3>GitHub</h3><p><a href="https://github.com/hackclub" target="_blank">Explore</a></p></article>
    `;

    // Counters
    const counters = document.querySelectorAll('[data-counter]');
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

    // Footer contact/socials
    const fc = document.getElementById('footer-contact');
    const fs = document.getElementById('footer-socials');
    if (fc) fc.textContent = d.settings.contact;
    if (fs) fs.innerHTML = (d.settings.socials||[]).map(s=> `<a href="${window.UI.escape(s.url)}" target="_blank" title="${window.UI.escape(s.name)}">${s.name[0]}</a>`).join('');
  }

  // Donation link binding if present
  const donateLink = document.getElementById('donate-link');
  if (donateLink){
    donateLink.href = (window.AppConfig?.payment?.donationLink) || window.StorageAPI.getData().settings.donationLink;
  }
});