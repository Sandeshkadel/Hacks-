// Admin wiring: renders tables, binds forms, sends emails on approve/decline, no page reloads.
(function(){
  const S = window.StorageAPI;
  const U = window.UI;

  function onDataUpdated(renderFn){ window.addEventListener('clubDataUpdated', renderFn); }

  // Dashboard stats
  async function renderStats(){
    try {
      const data = await S.getData();
      const st = S.stats();
      document.getElementById('stat-members').textContent = st.participants;
      document.getElementById('stat-projects').textContent = st.projects;
      document.getElementById('stat-hackathons').textContent = (data.hackathons||[]).length;
    } catch {}
  }

  // Members table with Approve / Decline / Delete
  function renderMembersTable(){
    S.getData().then(d => {
      const rows = (d.members||[]).map(m => `
        <tr>
          <td>${m.name || ''}</td>
          <td>${m.email || ''}</td>
          <td>${m.status || 'pending'}</td>
          <td class="row">
            <button class="chip success" data-approve="${m.id}">Approve</button>
            <button class="chip warn" data-decline="${m.id}">Decline</button>
            <button class="chip danger" data-delete="${m.id}">Delete</button>
          </td>
        </tr>`).join('');
      const html = `
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${rows || ''}</tbody>
        </table>`;
      document.getElementById('members-table').innerHTML = html;
    });
  }

  // Action handlers for members
  document.addEventListener('click', async (e) => {
    const approveId = e.target?.getAttribute?.('data-approve');
    const declineId = e.target?.getAttribute?.('data-decline');
    const deleteId  = e.target?.getAttribute?.('data-delete');

    if (approveId || declineId || deleteId){
      e.preventDefault();
      const data = await S.getData();
      const getById = (id) => (data.members||[]).find(x=>x.id===id);

      if (approveId){
        const m = getById(approveId);
        if (!m) return;
        await S.updateMember(m.id, { status:'approved', approvedAt: Date.now() });
        UI.toast('Member approved', 'success');
        // Send email
        if (m.email) {
          const subject = 'Welcome to Hack Club!';
          const html = `<p>Hi ${m.name||''},</p><p>Your registration has been approved. Welcome to the club!</p>`;
          const r = await Emailer.sendEmail(m.email, subject, html, { to_name: m.name||'' });
          UI.toast(r.sent ? 'Email sent' : 'Email queued', 'success');
        }
      }
      if (declineId){
        const m = getById(declineId);
        if (!m) return;
        await S.updateMember(m.id, { status:'declined', declinedAt: Date.now() });
        UI.toast('Member declined', 'warn');
        if (m.email) {
          const subject = 'Your Hack Club registration';
          const html = `<p>Hi ${m.name||''},</p><p>Thank you for applying. Unfortunately, your registration was not accepted at this time.</p>`;
          const r = await Emailer.sendEmail(m.email, subject, html, { to_name: m.name||'' });
          UI.toast(r.sent ? 'Email sent' : 'Email queued', 'success');
        }
      }
      if (deleteId){
        if (!confirm('Delete this member permanently?')) return;
        await S.deleteMember(deleteId);
        UI.toast('Member deleted', 'danger');
      }
      // Re-render without reloading
      renderMembersTable();
      renderStats();
    }
  });

  // Export CSV for members
  document.getElementById('export-members')?.addEventListener('click', async () => {
    const d = await S.getData();
    const rows = [['id','name','email','status','createdAt']];
    (d.members||[]).forEach(m => rows.push([m.id, m.name||'', m.email||'', m.status||'', m.createdAt||'']));
    const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'members.csv'; a.click(); URL.revokeObjectURL(a.href);
  });

  // Generic CRUD binders for collections
  function bindFormAndList(collection, formId, listId, titleField, extraLabelFields=[]){
    const form = document.getElementById(formId);
    const listEl = document.getElementById(listId);
    if (!form || !listEl) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const obj = UI.formToObject(form);
      try {
        await S.upsert(collection, obj);
        UI.toast('Saved', 'success');
        UI.clearForm(form);
      } catch (e) { console.error(e); UI.toast('Save failed', 'danger'); }
    });
    form.querySelector('[data-reset]')?.addEventListener('click', () => UI.clearForm(form));

    async function renderList(){
      const d = await S.getData();
      const arr = d[collection] || [];
      listEl.innerHTML = arr.map(item => {
        const title = item[titleField] || '(untitled)';
        const subtitle = extraLabelFields.map(f=> item[f]).filter(Boolean).join(' • ');
        return `<article class="card soft">
          <h4>${title}</h4>
          ${subtitle ? `<p class="muted">${subtitle}</p>`:''}
          <div class="row">
            <button class="chip" data-edit="${item.id}">Edit</button>
            <button class="chip danger" data-remove="${item.id}">Delete</button>
          </div>
        </article>`;
      }).join('');
    }

    listEl.addEventListener('click', async (e) => {
      const idEdit = e.target?.getAttribute?.('data-edit');
      const idDel  = e.target?.getAttribute?.('data-remove');
      if (idEdit){
        const d = await S.getData();
        const item = (d[collection]||[]).find(x=>x.id===idEdit);
        if (item) UI.setForm(form, item);
      }
      if (idDel){
        if (!confirm('Delete permanently?')) return;
        await S.remove(collection, idDel);
        UI.toast('Deleted', 'danger');
      }
    });

    onDataUpdated(renderList);
    renderList();
  }

  // Bind all collections
  bindFormAndList('organizers', 'form-organizer', 'organizers-list', 'name', ['role']);
  bindFormAndList('projects', 'form-project', 'projects-list', 'name', ['creators']);
  bindFormAndList('hackathons', 'form-hackathon', 'hackathons-list', 'title', ['date']);
  bindFormAndList('gallery', 'form-gallery', 'gallery-list', 'type', ['event','date']);
  bindFormAndList('sponsors', 'form-sponsor', 'sponsors-list', 'name');
  bindFormAndList('donors', 'form-donor', 'donors-list', 'name', ['amount']);
  bindFormAndList('courses', 'form-course', 'courses-list', 'title', ['level']);
  bindFormAndList('resources', 'form-resource', 'resources-list', 'title', ['url']);
  bindFormAndList('meetings', 'form-meeting', 'meetings-list', 'title', ['date']);

  // Information sections special handling
  (function bindInformation(){
    const form = document.getElementById('form-info');
    const listEl = document.getElementById('info-sections');
    const preview = document.getElementById('info-preview');
    if (!form || !listEl) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { section, html } = UI.formToObject(form);
      if (!section) return;
      try {
        await S.setInformationSection(section, html || '');
        UI.toast('Section saved', 'success');
      } catch (e) { console.error(e); UI.toast('Save failed', 'danger'); }
    });
    form.querySelector('[data-reset]')?.addEventListener('click', () => UI.clearForm(form));

    async function renderInfo(){
      const d = await S.getData();
      const info = d.information || {};
      listEl.innerHTML = Object.keys(info).sort().map(k => `
        <article class="card soft">
          <h4>${k}</h4>
          <div class="row">
            <button class="chip" data-edit-info="${k}">Edit</button>
            <button class="chip danger" data-del-info="${k}">Clear</button>
          </div>
        </article>`).join('');
      preview.innerHTML = Object.values(info).join('') || '<p class="muted">No content</p>';
    }
    listEl.addEventListener('click', async (e) => {
      const kEdit = e.target?.getAttribute?.('data-edit-info');
      const kDel = e.target?.getAttribute?.('data-del-info');
      const d = await S.getData();
      if (kEdit){
        UI.setForm(form, { section: kEdit, html: (d.information||{})[kEdit] || '' });
      }
      if (kDel){
        if (!confirm('Clear this section content?')) return;
        await S.setInformationSection(kDel, '');
        UI.toast('Section cleared', 'danger');
      }
    });

    onDataUpdated(renderInfo);
    renderInfo();
  })();

  // Messages (read-only in this panel)
  async function renderMessages(){
    const d = await S.getData();
    const rows = (d.messages||[]).map(m => `
      <tr><td>${m.name||''}</td><td>${m.email||''}</td><td>${m.message||''}</td><td>${m.date||''}</td></tr>`).join('');
    document.getElementById('messages-table').innerHTML = `
      <table><thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // Emails outbox
  async function renderEmails(){
    try {
      const emails = await S.emailOutbox();
      const rows = (emails||[]).map(e => `
        <tr><td>${e.to||''}</td><td>${e.subject||''}</td><td>${(e.status||'sent')}</td><td>${e.date||''}</td></tr>`).join('');
      document.getElementById('emails-list').innerHTML = `
        <table><thead><tr><th>To</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) {
      console.error(e);
    }
  }

  // Settings
  (function bindSettings(){
    const form = document.getElementById('form-settings');
    if (!form) return;
    async function load(){
      const s = await S.settings();
      UI.setForm(form, {
        adminEmail: s.adminEmail || '',
        username: s.username || s.adminUser || '',
        donationLink: s.donationLink || ''
      });
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const vals = UI.formToObject(form);
      const upd = { adminEmail: vals.adminEmail, username: vals.username, donationLink: vals.donationLink };
      try {
        await S.saveSettings(upd);
        UI.toast('Settings saved', 'success');
        if (vals.password) {
          try { await S.changePassword(vals.password); UI.toast('Password changed', 'success'); }
          catch (e){ UI.toast('Password change failed (need recent login)', 'warn'); }
        }
      } catch (e){ console.error(e); UI.toast('Save failed', 'danger'); }
    });
    load();
  })();

  // Initial renders
  (async function init(){
    await S.getData();
    renderStats();
    renderMembersTable();
    renderMessages();
    renderEmails();
    onDataUpdated(() => { renderStats(); renderMembersTable(); renderMessages(); });
  })();
})();
