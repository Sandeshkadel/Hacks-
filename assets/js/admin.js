// Full Admin Panel logic: authentication guard, stats, and CRUD for all sections
document.addEventListener('DOMContentLoaded', () => {
  // Guard: require admin session
  try {
    if (!window.StorageAPI?.isAuthed()) {
      try { window.UI?.toast?.('Please login', 'error'); } catch {}
      location.href = 'admin-login.html';
      return;
    }
  } catch {
    location.href = 'admin-login.html';
    return;
  }

  // Short-hands and safe helpers
  const UI = window.UI || {
    escape: (s) => String(s ?? '').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])),
    toast: (m) => alert(m),
    sortable: () => {}
  };

  // Tabs
  const buttons = document.querySelectorAll('.admin-sidebar button');
  const tabs = document.querySelectorAll('.tab');
  buttons.forEach(btn => btn.addEventListener('click', ()=>{
    buttons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const id = 'tab-' + btn.dataset.tab;
    tabs.forEach(t=> t.classList.toggle('hidden', t.id !== id));
  }));

  // Logout
  document.getElementById('logout')?.addEventListener('click', ()=>{
    window.StorageAPI.logout();
    location.href = 'admin-login.html';
  });

  // Stats: show approved members only
  function refreshStats(){
    const s = window.StorageAPI.stats(); // participants = approved
    const d = window.StorageAPI.getData();
    const m = document.getElementById('stat-members');
    if (m) m.textContent = s.participants;
    const p = document.getElementById('stat-projects');
    if (p) p.textContent = s.projects;
    const h = document.getElementById('stat-hackathons');
    if (h) h.textContent = (d.hackathons || []).length;
  }
  refreshStats();

  // Members
  const membersTable = document.getElementById('members-table');
  function renderMembers(){
    if (!membersTable) return;
    const data = window.StorageAPI.getData().members || [];
    membersTable.innerHTML = `
      <div class="row header"><div>Name</div><div>Email</div><div>Contact</div><div>Location</div><div>Status</div><div class="actions">Actions</div></div>
      ${data.map(m => `
        <div class="row">
          <div>${UI.escape(m.name||'')}</div>
          <div>${UI.escape(m.email||'')}</div>
          <div>${UI.escape(m.contact||'')}</div>
          <div>${UI.escape(m.location||'')}</div>
          <div>${UI.escape(m.status||'pending')}</div>
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
  membersTable?.addEventListener('click', async (e)=>{
    const approve = e.target.closest?.('[data-approve]')?.dataset.approve;
    const decline = e.target.closest?.('[data-decline]')?.dataset.decline;
    const del = e.target.closest?.('[data-delete]')?.dataset.delete;
    const edit = e.target.closest?.('[data-edit]')?.dataset.edit;
    if (approve){
      window.StorageAPI.updateMember(approve, { status:'approved' });
      try {
        const m = window.StorageAPI.getData().members.find(x=>x.id===approve);
        window.EmailAPI?.send?.({ to: m.email, subject:'Hack Club: Approved', message:`Hi ${m.name}, you are approved!` });
      } catch {}
      UI.toast('Approved', 'success');
    } else if (decline){
      window.StorageAPI.updateMember(decline, { status:'declined' });
      try {
        const m = window.StorageAPI.getData().members.find(x=>x.id===decline);
        window.EmailAPI?.send?.({ to: m.email, subject:'Hack Club: Declined', message:`Hi ${m.name}, please re-apply later.` });
      } catch {}
      UI.toast('Declined', 'success');
    } else if (del){
      window.StorageAPI.deleteMember(del);
      UI.toast('Deleted', 'success');
    } else if (edit){
      const m = window.StorageAPI.getData().members.find(x=>x.id===edit);
      const name = prompt('Name', m?.name ?? ''); if (name==null) return;
      const email = prompt('Email', m?.email ?? ''); if (email==null) return;
      const contact = prompt('Contact', m?.contact ?? ''); if (contact==null) return;
      const location = prompt('Location', m?.location ?? ''); if (location==null) return;
      window.StorageAPI.updateMember(edit, { name, email, contact, location });
      UI.toast('Updated', 'success');
    }
    renderMembers(); refreshStats();
  });
  renderMembers();

  // Export Members CSV (if button exists)
  document.getElementById('export-members')?.addEventListener('click', ()=>{
    const rows = window.StorageAPI.getData().members || [];
    const header = ['id','name','email','contact','location','caste','status','message'];
    const csv = [header.join(',')].concat(rows.map(r => header.map(h => {
      const v = (r[h] ?? '').toString().replace(/\r?\n/g, ' ').replace(/"/g, '""');
      return `"${v}"`;
    }).join(','))).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'members.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  // Generic CRUD binder for simple list sections
  function bindCrud(listName, formId, listId, renderCard, options={}){
    const form = document.getElementById(formId);
    const list = document.getElementById(listId);
    if (!form || !list) return { render:()=>{}, list:null, form:null };
    function render(){
      const items = window.StorageAPI.getData()[listName] || [];
      list.innerHTML = items.map(x => renderCard(x)).join('');
    }
    list.addEventListener('click', (e)=>{
      const editId = e.target.closest?.('[data-edit]')?.dataset.edit;
      const delId = e.target.closest?.('[data-del]')?.dataset.del;
      if (editId){
        const item = (window.StorageAPI.getData()[listName] || []).find(i=>i.id===editId);
        if (!item) return;
        [...form.elements].forEach(el => { if (el.name && item[el.name] != null) el.value = item[el.name]; });
        form.scrollIntoView({ behavior:'smooth' });
      } else if (delId){
        window.StorageAPI.remove(listName, delId);
        UI.toast('Deleted', 'success'); render(); refreshStats();
      }
    });
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      Object.keys(data).forEach(k => { if (data[k]==='') delete data[k]; });
      if (!data.id) delete data.id;
      window.StorageAPI.upsert(listName, data);
      UI.toast('Saved', 'success');
      form.reset(); render(); refreshStats();
    });
    form.querySelector('[data-reset]')?.addEventListener('click', ()=> form.reset());
    if (options.sortable) UI.sortable(list, (ids)=> window.StorageAPI.reorder(listName, ids));
    return { render, list, form };
  }

  // Organizers
  const organizers = bindCrud('organizers', 'form-organizer', 'organizers-list', (o)=> `
    <article class="card hover-lift" data-id="${o.id}">
      <img src="${UI.escape(o.image||'https://placehold.co/160x160?text=?')}" alt="${UI.escape(o.name||'')}" style="width:100%; border-radius:10px"/>
      <h3>${UI.escape(o.name||'')}</h3>
      <p class="muted">${UI.escape(o.role||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${o.id}">Edit</button>
        <button class="chip danger" data-del="${o.id}">Delete</button>
      </div>
    </article>
  `);
  organizers.render?.();

  // Projects (with award + sortable)
  const projects = bindCrud('projects', 'form-project', 'projects-list', (p)=> `
    <article class="card hover-lift" draggable="true" data-id="${p.id}">
      <h3>${UI.escape(p.name||'')} ${p.award ? `<span class="badge ${UI.escape(p.award)}">${UI.escape((p.award||'').toUpperCase())}</span>`:''}</h3>
      <p class="muted">${UI.escape(p.creators||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${p.id}">Edit</button>
        <button class="chip danger" data-del="${p.id}">Delete</button>
      </div>
    </article>
  `, { sortable:true });
  projects.render?.();

  // Hackathons
  const hacks = bindCrud('hackathons', 'form-hackathon', 'hackathons-list', (h)=> `
    <article class="card hover-lift" data-id="${h.id}">
      <h3>${UI.escape(h.title||'')}</h3>
      <p class="muted">${UI.escape(h.date||'')}</p>
      <p>${UI.escape(h.description||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${h.id}">Edit</button>
        <button class="chip danger" data-del="${h.id}">Delete</button>
      </div>
    </article>
  `);
  hacks.render?.();

  // Gallery
  const gallery = bindCrud('gallery', 'form-gallery', 'gallery-list', (g)=> `
    <article class="card hover-lift" data-id="${g.id}">
      ${g.type==='video'
        ? `<div class="video-wrap"><video src="${UI.escape(g.src||'')}" controls></video></div>`
        : `<img src="${UI.escape(g.src||'')}" alt="${UI.escape(g.description||'')}" />`}
      <p>${UI.escape(g.description||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${g.id}">Edit</button>
        <button class="chip danger" data-del="${g.id}">Delete</button>
      </div>
    </article>
  `);
  gallery.render?.();

  // Sponsors
  const sponsors = bindCrud('sponsors', 'form-sponsor', 'sponsors-list', (s)=> `
    <article class="card hover-lift" data-id="${s.id}">
      <img class="sponsor-logo" src="${UI.escape(s.image||'')}" alt="${UI.escape(s.name||'')}" />
      <h3>${UI.escape(s.name||'')}</h3>
      <p>${UI.escape(s.description||'')}</p>
      ${s.link ? `<a class="chip" href="${UI.escape(s.link)}" target="_blank">Visit</a>`:''}
      <div class="row">
        <button class="chip" data-edit="${s.id}">Edit</button>
        <button class="chip danger" data-del="${s.id}">Delete</button>
      </div>
    </article>
  `);
  sponsors.render?.();

  // Donors
  const donors = bindCrud('donors', 'form-donor', 'donors-list', (d)=> `
    <article class="card hover-lift" data-id="${d.id}">
      <h3>${UI.escape(d.name||'')}</h3>
      <p class="muted">${UI.escape(d.amount||'')}</p>
      <p>${UI.escape(d.description||'')}</p>
      ${d.link ? `<a class="chip" href="${UI.escape(d.link)}" target="_blank">Link</a>`:''}
      <div class="row">
        <button class="chip" data-edit="${d.id}">Edit</button>
        <button class="chip danger" data-del="${d.id}">Delete</button>
      </div>
    </article>
  `);
  donors.render?.();

  // Courses (sortable)
  const courses = bindCrud('courses', 'form-course', 'courses-list', (c)=> `
    <article class="card hover-lift" draggable="true" data-id="${c.id}">
      <h3>${UI.escape(c.title||'')}</h3>
      <p class="muted">${UI.escape(c.level||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${c.id}">Edit</button>
        <button class="chip danger" data-del="${c.id}">Delete</button>
      </div>
    </article>
  `, { sortable:true });
  courses.render?.();

  // Information: support both editor styles (simple whole-page editor or per-section form)
  function renderInfoCards(){
    const info = window.StorageAPI.getData().information || {};
    const wrap = document.getElementById('info-sections');
    if (!wrap) return;
    wrap.innerHTML = Object.entries(info).map(([key, html]) => `
      <article class="card soft">
        <h4>${UI.escape(key.replaceAll('_',' '))}</h4>
        <div class="muted" style="max-height:140px; overflow:auto">${html}</div>
      </article>
    `).join('');
  }
  // Variant A: single textarea editor with live preview
  const infoEditor = document.getElementById('info-editor');
  const infoPreview = document.getElementById('info-preview');
  const infoSave = document.getElementById('info-save');
  const infoReset = document.getElementById('info-reset');
  if (infoEditor && infoPreview){
    const curInfo = window.StorageAPI.getData().information || {};
    infoEditor.value = Object.values(curInfo).join('\n<hr/>\n');
    infoPreview.innerHTML = infoEditor.value;
    infoEditor.addEventListener('input', ()=> infoPreview.innerHTML = infoEditor.value);
    infoSave?.addEventListener('click', ()=>{
      // Save entire content into a single "html" bucket or overwrite "goals"
      window.StorageAPI.setInformationSection('html', infoEditor.value);
      UI.toast('Information saved', 'success');
      renderInfoCards();
    });
    infoReset?.addEventListener('click', ()=>{
      const d = window.StorageAPI.getData().information || {};
      infoEditor.value = Object.values(d).join('\n<hr/>\n');
      infoPreview.innerHTML = infoEditor.value;
    });
  }
  // Variant B: per-section form
  const infoForm = document.getElementById('form-info');
  if (infoForm){
    const preview = document.getElementById('info-preview');
    function updatePreview(){
      const info = window.StorageAPI.getData().information || {};
      if (preview) preview.innerHTML = Object.values(info).join('<hr/>');
      renderInfoCards();
    }
    infoForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const vals = Object.fromEntries(new FormData(infoForm).entries());
      window.StorageAPI.setInformationSection(vals.section, vals.html || '');
      UI.toast('Information saved', 'success');
      infoForm.reset(); updatePreview();
    });
    infoForm.querySelector('[data-reset]')?.addEventListener('click', ()=> infoForm.reset());
    updatePreview();
  } else {
    renderInfoCards();
  }

  // Resources
  const resources = bindCrud('resources', 'form-resource', 'resources-list', (r)=> `
    <article class="card hover-lift" data-id="${r.id}">
      <h3>${UI.escape(r.title||'')}</h3>
      <p>${UI.escape(r.description||'')}</p>
      <a class="chip" href="${UI.escape(r.url||'#')}" target="_blank">Open</a>
      <div class="row">
        <button class="chip" data-edit="${r.id}">Edit</button>
        <button class="chip danger" data-del="${r.id}">Delete</button>
      </div>
    </article>
  `);
  resources.render?.();

  // Meetings: create Zoom link via ZoomAPI if left blank
  const meetingForm = document.getElementById('form-meeting');
  const meetingList = document.getElementById('meetings-list');
  function renderMeetings(){
    if (!meetingList) return;
    const items = window.StorageAPI.getData().meetings || [];
    meetingList.innerHTML = items.map(m => `
      <article class="card hover-lift" data-id="${m.id}">
        <h3>${UI.escape(m.title||'')}</h3>
        <p class="muted">${UI.escape(m.date||'')}</p>
        <p>${UI.escape(m.description||'')}</p>
        ${m.zoomLink ? `<a class="chip" href="${UI.escape(m.zoomLink)}" target="_blank">Zoom</a>`:''}
        <div class="row">
          <button class="chip" data-edit="${m.id}">Edit</button>
          <button class="chip danger" data-del="${m.id}">Delete</button>
        </div>
      </article>
    `).join('');
  }
  renderMeetings();
  meetingForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(meetingForm).entries());
    if (!data.id) delete data.id;
    if (!data.zoomLink){
      try {
        const created = await window.ZoomAPI?.createMeeting?.({ topic: data.title, start_time: data.date });
        if (created?.join_url) data.zoomLink = created.join_url;
      } catch {}
    }
    window.StorageAPI.upsert('meetings', data);
    UI.toast('Saved meeting', 'success');
    meetingForm.reset(); renderMeetings();
  });
  meetingList?.addEventListener('click', (e)=>{
    const editId = e.target.closest?.('[data-edit]')?.dataset.edit;
    const delId = e.target.closest?.('[data-del]')?.dataset.del;
    if (editId){
      const m = (window.StorageAPI.getData().meetings||[]).find(x=>x.id===editId);
      if (!m) return;
      [...meetingForm.elements].forEach(el => { if (el.name && m[el.name] != null) el.value = m[el.name]; });
      meetingForm.scrollIntoView({ behavior:'smooth' });
    } else if (delId){
      window.StorageAPI.remove('meetings', delId);
      UI.toast('Deleted meeting', 'success');
      renderMeetings();
    }
  });

  // Settings
  const settingsForm = document.getElementById('form-settings');
  if (settingsForm){
    const s = window.StorageAPI.getData().settings || {};
    if (settingsForm.adminEmail) settingsForm.adminEmail.value = s.adminEmail || '';
    if (settingsForm.username) settingsForm.username.value = s.adminUser || '';
    if (settingsForm.donationLink) settingsForm.donationLink.value = s.donationLink || '';
    settingsForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const vals = Object.fromEntries(new FormData(settingsForm).entries());
      const upd = { adminEmail: vals.adminEmail, adminUser: vals.username, donationLink: vals.donationLink };
      if (vals.password) { await window.StorageAPI.changePassword(vals.password); }
      window.StorageAPI.saveSettings(upd);
      UI.toast('Settings saved', 'success');
    });
  }

  // Emails outbox
  function renderEmails(){
    const list = window.StorageAPI.emailOutbox?.() || [];
    const wrap = document.getElementById('emails-list');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="row header"><div>Date</div><div>To</div><div>Subject</div><div style="grid-column: span 3">Message</div></div>
      ${list.map(e => `
        <div class="row">
          <div>${new Date(e.date).toLocaleString()}</div>
          <div>${UI.escape(e.to||'')}</div>
          <div>${UI.escape(e.subject||'')}</div>
          <div style="grid-column: span 3">${UI.escape(e.message||'')}</div>
        </div>
      `).join('')}
    `;
  }
  renderEmails();

  // Messages (contact form submissions)
  function renderMessages(){
    const list = (window.StorageAPI.getData().messages || []);
    const wrap = document.getElementById('messages-table');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="row header"><div>Date</div><div>Name</div><div>Email</div><div style="grid-column: span 3">Message</div></div>
      ${list.map(m => `
        <div class="row">
          <div>${new Date(m.date).toLocaleString()}</div>
          <div>${UI.escape(m.name||'')}</div>
          <div>${UI.escape(m.email||'')}</div>
          <div style="grid-column: span 3">${UI.escape(m.message||'')}</div>
        </div>
      `).join('')}
    `;
  }
  renderMessages();
});
