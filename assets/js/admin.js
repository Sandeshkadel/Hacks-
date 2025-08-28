document.addEventListener('DOMContentLoaded', () => {
  if (!window.StorageAPI.isAuthed()){
    window.UI.toast('Please login', 'error');
    location.href = 'admin-login.html';
    return;
  }
  const d = window.StorageAPI.getData();

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

  // Dashboard stats
  function refreshStats(){
    const data = window.StorageAPI.getData();
    document.getElementById('stat-members').textContent = data.members.length;
    document.getElementById('stat-projects').textContent = data.projects.length;
    document.getElementById('stat-hackathons').textContent = data.hackathons.length;
  }
  refreshStats();

  // Members
  const membersTable = document.getElementById('members-table');
  function renderMembers(){
    const data = window.StorageAPI.getData().members;
    membersTable.innerHTML = `
      <div class="row header"><div>Name</div><div>Email</div><div>Contact</div><div>Location</div><div>Status</div><div class="actions">Actions</div></div>
      ${data.map(m => `
        <div class="row">
          <div>${window.UI.escape(m.name)}</div>
          <div>${window.UI.escape(m.email)}</div>
          <div>${window.UI.escape(m.contact)}</div>
          <div>${window.UI.escape(m.location)}</div>
          <div>${window.UI.escape(m.status)}</div>
          <div class="actions">
            ${m.status!=='approved' ? `<button class="chip" data-approve="${m.id}">Approve</button>`:''}
            ${m.status!=='declined' ? `<button class="chip danger" data-decline="${m.id}">Decline</button>`:''}
            <button class="chip" data-delete="${m.id}">Delete</button>
          </div>
        </div>
      `).join('')}
    `;
  }
  membersTable.addEventListener('click', async (e)=>{
    const approve = e.target.closest('[data-approve]')?.dataset.approve;
    const decline = e.target.closest('[data-decline]')?.dataset.decline;
    const del = e.target.closest('[data-delete]')?.dataset.delete;
    if (approve){
      window.StorageAPI.updateMember(approve, { status:'approved' });
      const m = window.StorageAPI.getData().members.find(x=>x.id===approve);
      window.EmailAPI.send({ to: m.email, subject:'Hack Club: Approved', message:`Hi ${m.name}, you are approved!` });
      window.UI.toast('Approved', 'success');
    } else if (decline){
      window.StorageAPI.updateMember(decline, { status:'declined' });
      const m = window.StorageAPI.getData().members.find(x=>x.id===decline);
      window.EmailAPI.send({ to: m.email, subject:'Hack Club: Declined', message:`Hi ${m.name}, unfortunately not this time. Please resubmit later.` });
      window.UI.toast('Declined', 'success');
    } else if (del){
      window.StorageAPI.deleteMember(del);
      window.UI.toast('Deleted', 'success');
    }
    renderMembers(); refreshStats();
  });
  renderMembers();

  // Generic helpers
  function bindCrud(listName, formSel, listSel, renderCard){
    const form = document.getElementById(formSel);
    const list = document.getElementById(listSel);
    function render(){
      const items = window.StorageAPI.getData()[listName];
      list.innerHTML = items.map(x => renderCard(x)).join('');
    }
    list.addEventListener('click', (e)=>{
      const editId = e.target.closest('[data-edit]')?.dataset.edit;
      const delId = e.target.closest('[data-del]')?.dataset.del;
      if (editId){
        const item = window.StorageAPI.getData()[listName].find(i=>i.id===editId);
        [...form.elements].forEach(el => { if (el.name && item[el.name] != null) el.value = item[el.name]; });
        form.scrollIntoView({ behavior:'smooth' });
      } else if (delId){
        window.StorageAPI.remove(listName, delId);
        window.UI.toast('Deleted', 'success'); render(); refreshStats();
      }
    });
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      Object.keys(data).forEach(k => { if (data[k]==='') delete data[k]; });
      if (!data.id) delete data.id;
      const saved = window.StorageAPI.upsert(listName, data);
      window.UI.toast('Saved', 'success');
      form.reset(); render(); refreshStats();
    });
    form.querySelector('[data-reset]')?.addEventListener('click', ()=> form.reset());
    return { render, list, form };
  }

  // Projects CRUD + reorder
  const projects = bindCrud('projects', 'form-project', 'projects-list', (p)=> `
    <article class="card hover-lift" draggable="true" data-id="${p.id}">
      <h3>${window.UI.escape(p.name)}</h3>
      <p class="muted">${window.UI.escape(p.creators||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${p.id}">Edit</button>
        <button class="chip danger" data-del="${p.id}">Delete</button>
      </div>
    </article>
  `);
  projects.render();
  window.UI.sortable(projects.list, (ids)=> window.StorageAPI.reorder('projects', ids));

  // Hackathons CRUD
  const hacks = bindCrud('hackathons', 'form-hackathon', 'hackathons-list', (h)=> `
    <article class="card hover-lift" data-id="${h.id}">
      <h3>${window.UI.escape(h.title)}</h3>
      <p class="muted">${window.UI.escape(h.date||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${h.id}">Edit</button>
        <button class="chip danger" data-del="${h.id}">Delete</button>
      </div>
    </article>
  `);
  hacks.render();

  // Gallery CRUD
  const gallery = bindCrud('gallery', 'form-gallery', 'gallery-list', (g)=> `
    <article class="card hover-lift" data-id="${g.id}">
      ${g.type==='video' ? `<div class="video-wrap"><video src="${window.UI.escape(g.src)}" controls></video></div>` : `<img src="${window.UI.escape(g.src)}" alt="${window.UI.escape(g.description||'')}" />`}
      <p>${window.UI.escape(g.description||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${g.id}">Edit</button>
        <button class="chip danger" data-del="${g.id}">Delete</button>
      </div>
    </article>
  `);
  gallery.render();

  // Sponsors CRUD
  const sponsors = bindCrud('sponsors', 'form-sponsor', 'sponsors-list', (s)=> `
    <article class="card hover-lift" data-id="${s.id}">
      <img class="sponsor-logo" src="${window.UI.escape(s.image||'')}" alt="${window.UI.escape(s.name||'')}" />
      <h3>${window.UI.escape(s.name||'')}</h3>
      <p>${window.UI.escape(s.description||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${s.id}">Edit</button>
        <button class="chip danger" data-del="${s.id}">Delete</button>
      </div>
    </article>
  `);
  sponsors.render();

  // Courses CRUD + reorder
  const courses = bindCrud('courses', 'form-course', 'courses-list', (c)=> `
    <article class="card hover-lift" draggable="true" data-id="${c.id}">
      <h3>${window.UI.escape(c.title)}</h3>
      <p class="muted">${window.UI.escape(c.level||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${c.id}">Edit</button>
        <button class="chip danger" data-del="${c.id}">Delete</button>
      </div>
    </article>
  `);
  courses.render();
  window.UI.sortable(courses.list, (ids)=> window.StorageAPI.reorder('courses', ids));

  // Information editor live preview
  const infoEditor = document.getElementById('info-editor');
  const infoPreview = document.getElementById('info-preview');
  function loadInfo(){
    const v = window.StorageAPI.getData().information?.html || '';
    infoEditor.value = v; infoPreview.innerHTML = v;
  }
  loadInfo();
  infoEditor.addEventListener('input', ()=> infoPreview.innerHTML = infoEditor.value);
  document.getElementById('info-save').addEventListener('click', ()=>{
    window.StorageAPI.setInformation(infoEditor.value);
    window.UI.toast('Information saved', 'success');
  });
  document.getElementById('info-reset').addEventListener('click', loadInfo);

  // Meetings CRUD
  const meetingForm = document.getElementById('form-meeting');
  const meetingList = document.getElementById('meetings-list');
  function renderMeetings(){
    const items = window.StorageAPI.getData().meetings;
    meetingList.innerHTML = items.map(m => `
      <article class="card hover-lift" data-id="${m.id}">
        <h3>${window.UI.escape(m.title)}</h3>
        <p class="muted">${window.UI.escape(m.date||'')}</p>
        <p>${window.UI.escape(m.description||'')}</p>
        ${m.zoomLink ? `<a class="chip" href="${window.UI.escape(m.zoomLink)}" target="_blank">Zoom</a>`:''}
        <div class="row">
          <button class="chip" data-edit="${m.id}">Edit</button>
          <button class="chip danger" data-del="${m.id}">Delete</button>
        </div>
      </article>
    `).join('');
  }
  renderMeetings();
  meetingForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(meetingForm).entries());
    if (!data.id) delete data.id;
    // If no zoom link and integration enabled, create one
    if (!data.zoomLink){
      try {
        const created = await window.ZoomAPI.createMeeting({ topic: data.title, start_time: data.date });
        data.zoomLink = created.join_url;
      } catch (err) {
        console.warn('Zoom create failed', err);
      }
    }
    window.StorageAPI.upsert('meetings', data);
    window.UI.toast('Saved meeting', 'success');
    meetingForm.reset(); renderMeetings();
  });
  meetingList.addEventListener('click', (e)=>{
    const editId = e.target.closest('[data-edit]')?.dataset.edit;
    const delId = e.target.closest('[data-del]')?.dataset.del;
    if (editId){
      const m = window.StorageAPI.getData().meetings.find(x=>x.id===editId);
      [...meetingForm.elements].forEach(el => { if (el.name && m[el.name] != null) el.value = m[el.name]; });
      meetingForm.scrollIntoView({ behavior:'smooth' });
    } else if (delId){
      window.StorageAPI.remove('meetings', delId);
      window.UI.toast('Deleted meeting', 'success');
      renderMeetings();
    }
  });

  // Settings
  const settingsForm = document.getElementById('form-settings');
  const s = d.settings;
  settingsForm.adminEmail.value = s.adminEmail || '';
  settingsForm.username.value = s.adminUser || '';
  settingsForm.donationLink.value = s.donationLink || '';
  settingsForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const vals = Object.fromEntries(new FormData(settingsForm).entries());
    const upd = { adminEmail: vals.adminEmail, adminUser: vals.username, donationLink: vals.donationLink };
    if (vals.password) { await window.StorageAPI.changePassword(vals.password); }
    window.StorageAPI.saveSettings(upd);
    window.UI.toast('Settings saved', 'success');
  });

  // Emails
  function renderEmails(){
    const list = window.StorageAPI.emailOutbox();
    const wrap = document.getElementById('emails-list');
    wrap.innerHTML = `
      <div class="row header"><div>Date</div><div>To</div><div>Subject</div><div style="grid-column: span 3">Message</div></div>
      ${list.map(e => `
        <div class="row">
          <div>${new Date(e.date).toLocaleString()}</div>
          <div>${window.UI.escape(e.to)}</div>
          <div>${window.UI.escape(e.subject)}</div>
          <div style="grid-column: span 3">${window.UI.escape(e.message)}</div>
        </div>
      `).join('')}
    `;
  }
  renderEmails();
});