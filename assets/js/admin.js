// Full Admin Panel logic with working tabs, logout, rendering, and CRUD
document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  if (!window.StorageAPI || !window.StorageAPI.isAuthed()) {
    try { window.UI?.toast?.('Please login', 'error'); } catch {}
    location.href = 'admin-login.html';
    return;
  }

  const S = window.StorageAPI;
  const UI = window.UI;

  // Sidebar tabs
  const buttons = document.querySelectorAll('.admin-sidebar button');
  const tabs = document.querySelectorAll('.tab');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const id = 'tab-' + btn.dataset.tab;
      tabs.forEach(t => t.classList.toggle('hidden', t.id !== id));
    });
  });

  // Logout
  document.getElementById('logout')?.addEventListener('click', () => {
    S.logout();
    location.href = 'admin-login.html';
  });

  // Stats
  function refreshStats() {
    const st = S.stats();
    const d = S.getData();
    const m = document.getElementById('stat-members');
    const p = document.getElementById('stat-projects');
    const h = document.getElementById('stat-hackathons');
    if (m) m.textContent = String(st.participants);
    if (p) p.textContent = String(st.projects);
    if (h) h.textContent = String((d.hackathons || []).length);
  }
  refreshStats();

  // Helpers
  const esc = (s) => UI.escape(s);
  const parseCSV = (str='') => (str||'').split(',').map(s=>s.trim()).filter(Boolean);
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
  const parseSocials = (str='') => parseCSV(str).map(url => ({ name: nameFromUrl(url), url }));
  const stringifySocials = (arr=[]) => (arr||[]).map(s=>s.url).join(', ');

  // Members (approve/decline/edit/delete)
  const membersTable = document.getElementById('members-table');
  function renderMembers() {
    const data = S.getData().members || [];
    membersTable.innerHTML = `
      <div class="row header">
        <div>Name</div><div>Email</div><div>Contact</div><div>Location</div><div>Status</div><div class="actions">Actions</div>
      </div>
      ${data.map(m => `
        <div class="row">
          <div>${esc(m.name||'')}</div>
          <div>${esc(m.email||'')}</div>
          <div>${esc(m.contact||'')}</div>
          <div>${esc(m.location||'')}</div>
          <div>${esc(m.status||'pending')}</div>
          <div class="actions">
            ${m.status!=='approved' ? `<button class="chip" data-approve="${m.id}">Approve</button>`:''}
            ${m.status!=='declined' ? `<button class="chip danger" data-decline="${m.id}">Decline</button>`:''}
            <button class="chip" data-edit="${m.id}">Edit</button>
            <button class="chip danger" data-delete="${m.id}">Delete</button>
          </div>
        </div>
      `).join('')}
    `;
  }
  membersTable.addEventListener('click', async (e) => {
    const approve = e.target.closest?.('[data-approve]')?.dataset.approve;
    const decline = e.target.closest?.('[data-decline]')?.dataset.decline;
    const del = e.target.closest?.('[data-delete]')?.dataset.delete;
    const edit = e.target.closest?.('[data-edit]')?.dataset.edit;

    if (approve) {
      S.updateMember(approve, { status: 'approved' });
      try {
        const m = S.getData().members.find(x => x.id === approve);
        await window.EmailAPI?.send?.({ to: m.email, subject: 'Hack Club: Approved', message: `Hi ${m.name}, you are approved!` });
      } catch {}
      UI.toast('Approved', 'success');
    } else if (decline) {
      S.updateMember(decline, { status: 'declined' });
      try {
        const m = S.getData().members.find(x => x.id === decline);
        await window.EmailAPI?.send?.({ to: m.email, subject: 'Hack Club: Declined', message: `Hi ${m.name}, you are rejected, please start again.` });
      } catch {}
      UI.toast('Declined', 'success');
    } else if (del) {
      S.deleteMember(del);
      UI.toast('Deleted', 'success');
    } else if (edit) {
      const m = S.getData().members.find(x => x.id === edit);
      if (!m) return;
      const name = prompt('Name', m.name ?? ''); if (name == null) return;
      const email = prompt('Email', m.email ?? ''); if (email == null) return;
      const contact = prompt('Contact', m.contact ?? ''); if (contact == null) return;
      const location = prompt('Location', m.location ?? ''); if (location == null) return;
      S.updateMember(edit, { name, email, contact, location });
      UI.toast('Updated', 'success');
    }
    renderMembers();
    refreshStats();
  });
  renderMembers();

  // Export members CSV
  document.getElementById('export-members')?.addEventListener('click', () => {
    const rows = S.getData().members || [];
    const header = ['id','name','email','contact','location','caste','status','message'];
    const csv = [header.join(',')].concat(rows.map(r =>
      header.map(h => `"${String(r[h] ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`).join(',')
    )).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'members.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  // Generic CRUD binder
  function bindCrud(listName, formId, listId, renderCard, { toForm, fromForm, sortable } = {}) {
    const form = document.getElementById(formId);
    const list = document.getElementById(listId);

    function render() {
      const items = S.getData()[listName] || [];
      list.innerHTML = items.map(x => renderCard(x)).join('');
      if (sortable) UI.sortable(list, (ids) => S.reorder(listName, ids));
    }

    list.addEventListener('click', (e) => {
      const editId = e.target.closest?.('[data-edit]')?.dataset.edit;
      const delId = e.target.closest?.('[data-del]')?.dataset.del;
      if (editId) {
        const item = (S.getData()[listName] || []).find(i => i.id === editId);
        if (!item) return;
        if (toForm) toForm(item, form);
        else [...form.elements].forEach(el => { if (el.name && item[el.name] != null) el.value = item[el.name]; });
        form.scrollIntoView({ behavior: 'smooth' });
      } else if (delId) {
        S.remove(listName, delId);
        UI.toast('Deleted', 'success');
        render();
        refreshStats();
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let data = Object.fromEntries(new FormData(form).entries());
      if (fromForm) data = fromForm(data);
      Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
      if (!data.id) delete data.id;
      S.upsert(listName, data);
      UI.toast('Saved', 'success');
      form.reset();
      render();
      refreshStats();
    });

    form.querySelector('[data-reset]')?.addEventListener('click', () => form.reset());

    render();
    return { render, form, list };
  }

  // Organizers
  bindCrud('organizers', 'form-organizer', 'organizers-list', (o) => `
    <article class="card hover-lift" data-id="${o.id}">
      <img src="${esc(o.image||'https://placehold.co/320x200?text=?')}" alt="${esc(o.name||'')}" class="thumb"/>
      <h3>${esc(o.name||'')}</h3>
      <p class="muted">${esc(o.role||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${o.id}">Edit</button>
        <button class="chip danger" data-del="${o.id}">Delete</button>
      </div>
    </article>
  `, {
    toForm: (item, f) => {
      f.id.value = item.id || '';
      f.name.value = item.name || '';
      f.role.value = item.role || '';
      f.image.value = item.image || '';
      f.socials.value = stringifySocials(item.socials || []);
    },
    fromForm: (v) => ({
      id: v.id || undefined,
      name: v.name, role: v.role || '', image: v.image || '', socials: parseSocials(v.socials || '')
    })
  });

  // Projects
  bindCrud('projects', 'form-project', 'projects-list', (p) => `
    <article class="card hover-lift" draggable="true" data-id="${p.id}">
      <img src="${esc(p.image||'https://placehold.co/640x360?text=Project')}" alt="${esc(p.name||'')}" class="thumb"/>
      <h3>${esc(p.name||'')} ${p.award ? `<span class="badge ${esc(p.award)}">${esc((p.award||'').toUpperCase())}</span>`:''}</h3>
      <p class="muted">${esc(p.creators||'')}</p>
      <div class="row">
        ${p.demo ? `<a class="chip" href="${esc(p.demo)}" target="_blank">Demo</a>`:''}
        ${p.code ? `<a class="chip" href="${esc(p.code)}" target="_blank">Code</a>`:''}
        <button class="chip" data-edit="${p.id}">Edit</button>
        <button class="chip danger" data-del="${p.id}">Delete</button>
      </div>
    </article>
  `, {
    sortable: true,
    toForm: (i, f) => {
      f.id.value = i.id || '';
      f.name.value = i.name || '';
      f.creators.value = i.creators || '';
      f.makerSocials.value = stringifySocials(i.makerSocials || []);
      f.image.value = i.image || '';
      f.demo.value = i.demo || '';
      f.code.value = i.code || '';
      f.description.value = i.description || '';
      f.award.value = i.award || '';
    },
    fromForm: (v) => ({
      id: v.id || undefined,
      name: v.name, creators: v.creators || '', makerSocials: parseSocials(v.makerSocials || ''),
      image: v.image || '', demo: v.demo || '', code: v.code || '', description: v.description || '', award: v.award || ''
    })
  });

  // Hackathons
  bindCrud('hackathons', 'form-hackathon', 'hackathons-list', (h) => `
    <article class="card hover-lift" data-id="${h.id}">
      ${h.cover ? `<img src="${esc(h.cover)}" alt="${esc(h.title||'')}" class="thumb"/>`:''}
      <h3>${esc(h.title||'')}</h3>
      <p class="muted">${esc(h.date||'')}</p>
      <p>${esc(h.description||'')}</p>
      <div class="row">
        ${h.website ? `<a class="chip" href="${esc(h.website)}" target="_blank">Website</a>`:''}
        <button class="chip" data-edit="${h.id}">Edit</button>
        <button class="chip danger" data-del="${h.id}">Delete</button>
      </div>
    </article>
  `, {
    toForm: (i, f) => {
      f.id.value = i.id || '';
      f.title.value = i.title || '';
      f.date.value = i.date || '';
      f.website.value = i.website || '';
      f.cover.value = i.cover || '';
      f.description.value = i.description || '';
      f.prizes.value = (i.prizes||[]).join(', ');
      f.participants.value = (i.participants||[]).join(', ');
      f.winners.value = (i.winners||[]).join(', ');
    },
    fromForm: (v) => ({
      id: v.id || undefined,
      title: v.title, date: v.date || '', website: v.website || '', cover: v.cover || '',
      description: v.description || '', prizes: parseCSV(v.prizes||''), participants: parseCSV(v.participants||''), winners: parseCSV(v.winners||'')
    })
  });

  // Gallery
  bindCrud('gallery', 'form-gallery', 'gallery-list', (g) => `
    <article class="card hover-lift" data-id="${g.id}">
      ${g.type==='video'
        ? `<div class="video-wrap"><video src="${esc(g.src||'')}" controls></video></div>`
        : `<img src="${esc(g.src||'')}" alt="${esc(g.description||'')}" class="thumb"/>`}
      <p><strong>${esc(g.event||'')}</strong> ${g.date ? `• <span class="muted">${esc(g.date)}</span>`:''}</p>
      <p>${esc(g.description||'')}</p>
      <div class="row">
        ${g.link ? `<a class="chip" href="${esc(g.link)}" target="_blank">Link</a>`:''}
        <button class="chip" data-edit="${g.id}">Edit</button>
        <button class="chip danger" data-del="${g.id}">Delete</button>
      </div>
    </article>
  `, {
    toForm: (i, f) => {
      f.id.value = i.id || '';
      f.type.value = i.type || 'image';
      f.src.value = i.src || '';
      f.link.value = i.link || '';
      f.event.value = i.event || '';
      f.date.value = i.date || '';
      f.description.value = i.description || '';
    },
    fromForm: (v) => ({
      id: v.id || undefined,
      type: v.type || 'image', src: v.src, link: v.link || '', event: v.event || '', date: v.date || '', description: v.description || ''
    })
  });

  // Sponsors
  bindCrud('sponsors', 'form-sponsor', 'sponsors-list', (s) => `
    <article class="card hover-lift" data-id="${s.id}">
      ${s.image ? `<img class="sponsor-logo" src="${esc(s.image)}" alt="${esc(s.name||'')}" />`:''}
      <h3>${esc(s.name||'')}</h3>
      <p>${esc(s.description||'')}</p>
      <div class="row">
        ${s.link ? `<a class="chip" href="${esc(s.link)}" target="_blank">Visit</a>`:''}
        <button class="chip" data-edit="${s.id}">Edit</button>
        <button class="chip danger" data-del="${s.id}">Delete</button>
      </div>
    </article>
  `);

  // Donors
  bindCrud('donors', 'form-donor', 'donors-list', (d) => `
    <article class="card hover-lift" data-id="${d.id}">
      <h3>${esc(d.name||'')}</h3>
      <p class="muted">${esc(d.amount||'')}</p>
      <p>${esc(d.description||'')}</p>
      ${d.link ? `<a class="chip" href="${esc(d.link)}" target="_blank">Link</a>`:''}
      <div class="row">
        <button class="chip" data-edit="${d.id}">Edit</button>
        <button class="chip danger" data-del="${d.id}">Delete</button>
      </div>
    </article>
  `);

  // Courses
  bindCrud('courses', 'form-course', 'courses-list', (c) => `
    <article class="card hover-lift" draggable="true" data-id="${c.id}">
      ${c.thumb ? `<img src="${esc(c.thumb)}" alt="${esc(c.title||'')}" class="thumb"/>`:''}
      <h3>${esc(c.title||'')}</h3>
      <p class="muted">${esc(c.level||'')}</p>
      <div class="row">
        ${c.url ? `<a class="chip" href="${esc(c.url)}" target="_blank">Video</a>`:''}
        <button class="chip" data-edit="${c.id}">Edit</button>
        <button class="chip danger" data-del="${c.id}">Delete</button>
      </div>
    </article>
  `, { sortable: true });

  // Resources
  bindCrud('resources', 'form-resource', 'resources-list', (r) => `
    <article class="card hover-lift" data-id="${r.id}">
      <h3>${esc(r.title||'')}</h3>
      <p>${esc(r.description||'')}</p>
      <a class="chip" href="${esc(r.url||'#')}" target="_blank">Open</a>
      <div class="row">
        <button class="chip" data-edit="${r.id}">Edit</button>
        <button class="chip danger" data-del="${r.id}">Delete</button>
      </div>
    </article>
  `);

  // Information
  function renderInfo() {
    const info = S.getData().information || {};
    const wrap = document.getElementById('info-sections');
    const prev = document.getElementById('info-preview');
    if (wrap) {
      wrap.innerHTML = Object.entries(info).map(([key, html]) => `
        <article class="card soft">
          <h4>${esc(key.replaceAll('_',' '))}</h4>
          <div class="muted" style="max-height:140px; overflow:auto">${html}</div>
        </article>
      `).join('');
    }
    if (prev) prev.innerHTML = Object.values(info).join('<hr/>');
  }
  renderInfo();
  const infoForm = document.getElementById('form-info');
  infoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const vals = Object.fromEntries(new FormData(infoForm).entries());
    S.setInformationSection(vals.section, vals.html || '');
    UI.toast('Information saved', 'success');
    infoForm.reset();
    renderInfo();
  });
  infoForm.querySelector('[data-reset]')?.addEventListener('click', () => infoForm.reset());

  // Meetings
  const meetingForm = document.getElementById('form-meeting');
  const meetingList = document.getElementById('meetings-list');
  function renderMeetings() {
    const items = S.getData().meetings || [];
    meetingList.innerHTML = items.map(m => `
      <article class="card hover-lift" data-id="${m.id}">
        <h3>${esc(m.title||'')}</h3>
        <p class="muted">${esc(m.date||'')}</p>
        <p>${esc(m.description||'')}</p>
        ${m.zoomLink ? `<a class="chip" href="${esc(m.zoomLink)}" target="_blank">Zoom</a>`:''}
        <div class="row">
          <button class="chip" data-edit="${m.id}">Edit</button>
          <button class="chip danger" data-del="${m.id}">Delete</button>
        </div>
      </article>
    `).join('');
  }
  renderMeetings();
  meetingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(meetingForm).entries());
    if (!data.id) delete data.id;
    if (!data.zoomLink) {
      try {
        const created = await window.ZoomAPI?.createMeeting?.({ topic: data.title, start_time: data.date });
        if (created?.join_url) data.zoomLink = created.join_url;
      } catch {}
    }
    S.upsert('meetings', data);
    UI.toast('Saved meeting', 'success');
    meetingForm.reset();
    renderMeetings();
  });
  meetingList.addEventListener('click', (e) => {
    const editId = e.target.closest?.('[data-edit]')?.dataset.edit;
    const delId = e.target.closest?.('[data-del]')?.dataset.del;
    if (editId) {
      const m = (S.getData().meetings||[]).find(x => x.id === editId);
      if (!m) return;
      [...meetingForm.elements].forEach(el => { if (el.name && m[el.name] != null) el.value = m[el.name]; });
      meetingForm.scrollIntoView({ behavior: 'smooth' });
    } else if (delId) {
      S.remove('meetings', delId);
      UI.toast('Deleted meeting', 'success');
      renderMeetings();
    }
  });

  // Emails outbox
  function renderEmails() {
    const list = S.emailOutbox() || [];
    const wrap = document.getElementById('emails-list');
    wrap.innerHTML = `
      <div class="row header"><div>Date</div><div>To</div><div>Subject</div><div style="grid-column: span 3">Message</div></div>
      ${list.map(e => `
        <div class="row">
          <div>${new Date(e.date).toLocaleString()}</div>
          <div>${esc(e.to||'')}</div>
          <div>${esc(e.subject||'')}</div>
          <div style="grid-column: span 3">${esc(e.message||'')}</div>
        </div>
      `).join('')}
    `;
  }
  renderEmails();

  // Messages
  function renderMessages() {
    const list = (S.getData().messages || []);
    const wrap = document.getElementById('messages-table');
    wrap.innerHTML = `
      <div class="row header"><div>Date</div><div>Name</div><div>Email</div><div style="grid-column: span 3">Message</div></div>
      ${list.map(m => `
        <div class="row">
          <div>${new Date(m.date).toLocaleString()}</div>
          <div>${esc(m.name||'')}</div>
          <div>${esc(m.email||'')}</div>
          <div style="grid-column: span 3">${esc(m.message||'')}</div>
        </div>
      `).join('')}
    `;
  }
  renderMessages();

  // Settings
  const settingsForm = document.getElementById('form-settings');
  const s = S.getData().settings || {};
  settingsForm.adminEmail.value = s.adminEmail || '';
  settingsForm.username.value = s.adminUser || '';
  settingsForm.donationLink.value = s.donationLink || '';
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vals = Object.fromEntries(new FormData(settingsForm).entries());
    const upd = { adminEmail: vals.adminEmail, adminUser: vals.username, donationLink: vals.donationLink };
    if (vals.password) { await S.changePassword(vals.password); }
    S.saveSettings(upd);
    UI.toast('Settings saved', 'success');
  });
});
