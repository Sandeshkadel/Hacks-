document.addEventListener('DOMContentLoaded', () => {
  if (!window.StorageAPI.isAuthed()){
    window.UI.toast('Please login', 'error');
    location.href = 'admin-login.html';
    return;
  }

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
            <button class="chip" data-edit="${m.id}">Edit</button>
            <button class="chip danger" data-delete="${m.id}">Delete</button>
          </div>
        </div>
      `).join('')}
    `;
  }
  membersTable.addEventListener('click', async (e)=>{
    const approve = e.target.closest('[data-approve]')?.dataset.approve;
    const decline = e.target.closest('[data-decline]')?.dataset.decline;
    const del = e.target.closest('[data-delete]')?.dataset.delete;
    const edit = e.target.closest('[data-edit]')?.dataset.edit;
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
    } else if (edit){
      const m = window.StorageAPI.getData().members.find(x=>x.id===edit);
      const name = prompt('Name', m.name); if (name==null) return;
      const email = prompt('Email', m.email); if (email==null) return;
      const contact = prompt('Contact', m.contact); if (contact==null) return;
      const location = prompt('Location', m.location); if (location==null) return;
      window.StorageAPI.updateMember(edit, { name, email, contact, location });
      window.UI.toast('Updated', 'success');
    }
    renderMembers(); refreshStats();
  });
  renderMembers();

  // Export members CSV
  document.getElementById('export-members')?.addEventListener('click', ()=>{
    const rows = window.StorageAPI.getData().members;
    const header = ['id','name','email','contact','location','caste','status','message'];
    const csv = [header.join(',')].concat(rows.map(r => header.map(h => JSON.stringify((r[h]??'').toString()).replace(/\u2028|\u2029/g, ' ')).join(','))).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'members.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  // Generic CRUD binder
  function bindCrud(listName, formId, listId, renderCard, options={}){
    const form = document.getElementById(formId);
    const list = document.getElementById(listId);
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
      window.StorageAPI.upsert(listName, data);
      window.UI.toast('Saved', 'success');
      form.reset(); render(); refreshStats();
    });
    form.querySelector('[data-reset]')?.addEventListener('click', ()=> form.reset());
    if (options.sortable) window.UI.sortable(list, (ids)=> window.StorageAPI.reorder(listName, ids));
    return { render, list, form };
  }

  // Organizers
  const organizers = bindCrud('organizers', 'form-organizer', 'organizers-list', (o)=> `
    <article class="card hover-lift" data-id="${o.id}">
      <img src="${window.UI.escape(o.image||'https://placehold.co/160x160?text=?')}" alt="${window.UI.escape(o.name)}" style="width:100%; border-radius:10px"/>
      <h3>${window.UI.escape(o.name)}</h3>
      <p class="muted">${window.UI.escape(o.role||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${o.id}">Edit</button>
        <button class="chip danger" data-del="${o.id}">Delete</button>
      </div>
    </article>
  `);
  organizers.render();

  // Projects
  const projects = bindCrud('projects', 'form-project', 'projects-list', (p)=> `
    <article class="card hover-lift" draggable="true" data-id="${p.id}">
      <h3>${window.UI.escape(p.name)} ${p.award ? `<span class="badge ${p.award}">${p.award.toUpperCase()}</span>`:''}</h3>
      <p class="muted">${window.UI.escape(p.creators||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${p.id}">Edit</button>
        <button class="chip danger" data-del="${p.id}">Delete</button>
      </div>
    </article>
  `, { sortable:true });
  projects.render();

  // Hackathons
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

  // Gallery
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

  // Sponsors
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

  // Donors
  const donors = bindCrud('donors', 'form-donor', 'donors-list', (d)=> `
    <article class="card hover-lift" data-id="${d.id}">
      <h3>${window.UI.escape(d.name)}</h3>
      <p class="muted">${window.UI.escape(d.amount||'')}</p>
      <p>${window.UI.escape(d.description||'')}</p>
      ${d.link ? `<a class="chip" href="${window.UI.escape(d.link)}" target="_blank">Link</a>`:''}
      <div class="row">
        <button class="chip" data-edit="${d.id}">Edit</button>
        <button class="chip danger" data-del="${d.id}">Delete</button>
      </div>
    </article>
  `);
  donors.render();

  // Courses
  const courses = bindCrud('courses', 'form-course', 'courses-list', (c)=> `
    <article class="card hover-lift" draggable="true" data-id="${c.id}">
      <h3>${window.UI.escape(c.title)}</h3>
      <p class="muted">${window.UI.escape(c.level||'')}</p>
      <div class="row">
        <button class="chip" data-edit="${c.id}">Edit</button>
        <button class="chip danger" data-del="${c.id}">Delete</button>
      </div>
    </article>
  `, { sortable:true });
  courses.render();

  // Information
  function renderInfo(){
    const info = window.StorageAPI.getData().information;
    const wrap = document.getElementById('info-sections');
    wrap.innerHTML = Object.entries(info).map(([key, html]) => `
      <article class="card soft">
        <h4>${key.replaceAll('_',' ')}</h4>
        <div class="muted" style="max-height:120px; overflow:auto">${html}</div>
      </article>
    `).join('');
    document.getElementById('info-preview').innerHTML = Object.values(info).join('<hr/>');
  }
  renderInfo();
  const infoForm = document.getElementById('form-info');
  infoForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const vals = Object.fromEntries(new FormData(infoForm).entries());
    window.StorageAPI.setInformationSection(vals.section, vals.html || '');
    window.UI.toast('Information saved', 'success');
    infoForm.reset(); renderInfo();
  });
  infoForm.querySelector('[data-reset]')?.addEventListener('click', ()=> infoForm.reset());

  // Resources
  const resources = bindCrud('resources', 'form-resource', 'resources-list', (r)=> `
    <article class="card hover-lift" data-id="${r.id}">
      <h3>${window.UI.escape(r.title)}</h3>
      <p>${window.UI.escape(r.description||'')}</p>
      <a class="chip" href="${window.UI.escape(r.url)}" target="_blank">Open</a>
      <div class="row">
        <button class="chip" data-edit="${r.id}">Edit</button>
        <button class="chip danger" data-del="${r.id}">Delete</button>
      </div>
    </article>
  `);
  resources.render();

  // Meetings
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
    if (!data.zoomLink){
      try {
        const created = await window.ZoomAPI.createMeeting({ topic: data.title, start_time: data.date });
        data.zoomLink = created.join_url;
      } catch (err) {}
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
  const s = window.StorageAPI.getData().settings;
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

  // Emails outbox
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

  // Messages (from Contact)
  function renderMessages(){
    const list = window.StorageAPI.getData().messages;
    const wrap = document.getElementById('messages-table');
    wrap.innerHTML = `
      <div class="row header"><div>Date</div><div>Name</div><div>Email</div><div style="grid-column: span 3">Message</div></div>
      ${list.map(m => `
        <div class="row">
          <div>${new Date(m.date).toLocaleString()}</div>
          <div>${window.UI.escape(m.name)}</div>
          <div>${window.UI.escape(m.email)}</div>
          <div style="grid-column: span 3">${window.UI.escape(m.message)}</div>
        </div>
      `).join('')}
    `;
  }
  renderMessages();
});
