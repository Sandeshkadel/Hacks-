// Admin wiring: members table (with phone/interests/skills), approve/decline email, meetings notify all approved.
(function(){
  const S = window.StorageAPI;
  const U = window.UI;

  function onDataUpdated(renderFn){ window.addEventListener('clubDataUpdated', renderFn); }

  async function renderStats(){
    try {
      const st = S.stats();
      document.getElementById('stat-members').textContent = st.participants || 0;
      document.getElementById('stat-projects').textContent = st.projects || 0;
      document.getElementById('stat-hackathons').textContent = st.hackathons || 0;
    } catch {}
  }

  function renderMembersTable(){
    S.getData().then(d => {
      const rows = (d.members||[]).map(m => `
        <tr>
          <td>${m.name || ''}</td>
          <td>${m.email || ''}</td>
          <td>${m.phone || ''}</td>
          <td>${m.interests || ''}</td>
          <td>${m.skills || ''}</td>
          <td>${m.status || 'pending'}</td>
          <td class="row">
            <button class="chip success" data-approve="${m.id}">Approve</button>
            <button class="chip warn" data-decline="${m.id}">Decline</button>
            <button class="chip danger" data-delete="${m.id}">Delete</button>
          </td>
        </tr>`).join('');
      document.getElementById('members-table').innerHTML = `
        <table>
          <thead><tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Interests</th><th>Skills</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>${rows || ''}</tbody>
        </table>`;
    });
  }

  document.addEventListener('click', async (e) => {
    const approveId = e.target?.getAttribute?.('data-approve');
    const declineId = e.target?.getAttribute?.('data-decline');
    const deleteId  = e.target?.getAttribute?.('data-delete');

    if (approveId || declineId || deleteId){
      e.preventDefault();
      const d = await S.getData();
      const getById = (id) => (d.members||[]).find(x=>x.id===id);

      if (approveId){
        const m = getById(approveId); if (!m) return;
        await S.updateMember(m.id, { status:'approved', approvedAt: Date.now() });
        UI.toast('Member approved', 'success');
        if (m.email) {
          const subject = 'Welcome to Hack Club!';
          const html = `<p>Hi ${m.name||''},</p><p>Your registration has been approved. Welcome to the club!</p>`;
          await Emailer.sendEmail(m.email, subject, html, { to_name: m.name||'', from_email:'sandeshkadel2474@gmail.com' });
        }
      }
      if (declineId){
        const m = getById(declineId); if (!m) return;
        await S.updateMember(m.id, { status:'declined', declinedAt: Date.now() });
        UI.toast('Member declined', 'warn');
        if (m.email) {
          const subject = 'Your Hack Club registration';
          const html = `<p>Hi ${m.name||''},</p><p>Thank you for applying. Unfortunately, your registration was not accepted at this time.</p>`;
          await Emailer.sendEmail(m.email, subject, html, { to_name: m.name||'', from_email:'sandeshkadel2474@gmail.com' });
        }
      }
      if (deleteId){
        if (!confirm('Delete this member permanently?')) return;
        await S.deleteMember(deleteId);
        UI.toast('Member deleted', 'danger');
      }
      renderMembersTable();
      renderStats();
    }
  });

  document.getElementById('export-members')?.addEventListener('click', async () => {
    const d = await S.getData();
    const rows = [['id','name','email','phone','interests','skills','status','createdAt']];
    (d.members||[]).forEach(m => rows.push([m.id, m.name||'', m.email||'', m.phone||'', m.interests||'', m.skills||'', m.status||'', m.createdAt||'']));
    const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'members.csv'; a.click(); URL.revokeObjectURL(a.href);
  });

  // Generic binders (all except meetings)
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

  // Meetings: custom save that also emails all approved members
  (function bindMeetings(){
    const form = document.getElementById('form-meeting');
    const listEl = document.getElementById('meetings-list');
    if (!form || !listEl) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const obj = UI.formToObject(form);
      try {
        const saved = await S.upsert('meetings', obj);
        UI.toast('Meeting saved', 'success');
        UI.clearForm(form);

        const d = await S.getData();
        const recipients = (d.members||[]).filter(m => (m.status||'') === 'approved' && m.email);

        if (recipients.length){
          const subject = `Meeting: ${saved.title || 'Hack Club'} (${saved.date || ''})`;
          const html = `
            <p>Namaste,</p>
            <p>You are invited to a Hack Club meeting.</p>
            <p><strong>Title:</strong> ${saved.title || ''}<br/>
               <strong>Date:</strong> ${saved.date || ''}</p>
            ${saved.description ? `<p>${saved.description}</p>`:''}
            ${saved.zoomLink ? `<p><strong>Join Link:</strong> <a href="${saved.zoomLink}">${saved.zoomLink}</a></p>`:''}
            ${saved.zoomId ? `<p><strong>Meeting ID:</strong> ${saved.zoomId}</p>`:''}
            ${saved.zoomPass ? `<p><strong>Password:</strong> ${saved.zoomPass}</p>`:''}
          `;
          // Send sequentially (clubs are small); for large lists, batch with Promise.allSettled
          for (const m of recipients){
            try { await Emailer.sendEmail(m.email, subject, html, { to_name: m.name || '', from_email:'sandeshkadel2474@gmail.com' }); }
            catch (e){ console.warn('Email fail for', m.email, e); }
          }
          UI.toast(`Notified ${recipients.length} members`, 'success');
        }
      } catch (e) {
        console.error(e); UI.toast('Save failed', 'danger');
      }
    });

    async function renderList(){
      const d = await S.getData();
      const arr = d.meetings || [];
      listEl.innerHTML = arr.map(h => `
        <article class="card soft">
          <h4>${h.title || ''}</h4>
          ${h.date ? `<p class="muted">${h.date}</p>`:''}
          ${h.zoomLink ? `<p><a href="${h.zoomLink}" target="_blank" rel="noopener">Join Link</a></p>`:''}
          ${(h.zoomId || h.zoomPass) ? `<p class="muted">ID: ${h.zoomId||'-'} • Pass: ${h.zoomPass||'-'}</p>`:''}
          <div class="row">
            <button class="chip" data-edit="${h.id}">Edit</button>
            <button class="chip danger" data-remove="${h.id}">Delete</button>
          </div>
        </article>`).join('');
    }
    listEl.addEventListener('click', async (e) => {
      const idEdit = e.target?.getAttribute?.('data-edit');
      const idDel  = e.target?.getAttribute?.('data-remove');
      if (idEdit){
        const d = await S.getData();
        const item = (d.meetings||[]).find(x=>x.id===idEdit);
        if (item) UI.setForm(form, item);
      }
      if (idDel){
        if (!confirm('Delete permanently?')) return;
        await S.remove('meetings', idDel);
        UI.toast('Deleted', 'danger');
      }
    });

    onDataUpdated(renderList);
    renderList();
  })();

  // Bind other collections
  bindFormAndList('organizers', 'form-organizer', 'organizers-list', 'name', ['role']);
  bindFormAndList('projects', 'form-project', 'projects-list', 'name', ['creators']);
  bindFormAndList('hackathons', 'form-hackathon', 'hackathons-list', 'title', ['date']);
  bindFormAndList('gallery', 'form-gallery', 'gallery-list', 'type', ['event','date']);
  bindFormAndList('sponsors', 'form-sponsor', 'sponsors-list', 'name');
  bindFormAndList('donors', 'form-donor', 'donors-list', 'name', ['amount']);
  bindFormAndList('courses', 'form-course', 'courses-list', 'title', ['level']);
  bindFormAndList('resources', 'form-resource', 'resources-list', 'title', ['url']);

  async function renderMessages(){
    const d = await S.getData();
    const rows = (d.messages||[]).map(m => `
      <tr><td>${m.name||''}</td><td>${m.email||''}</td><td>${m.message||''}</td><td>${m.date||''}</td></tr>`).join('');
    document.getElementById('messages-table').innerHTML = `
      <table><thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  async function renderEmails(){
    try {
      const emails = await S.emailOutbox();
      const rows = (emails||[]).map(e => `
        <tr><td>${e.to||''}</td><td>${e.subject||''}</td><td>${(e.status||'sent')}</td><td>${e.date||''}</td></tr>`).join('');
      document.getElementById('emails-list').innerHTML = `
        <table><thead><tr><th>To</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) { console.error(e); }
  }

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

  (async function init(){
    await S.getData();
    renderStats();
    renderMembersTable();
    renderMessages();
    renderEmails();
    onDataUpdated(() => { renderStats(); renderMembersTable(); renderMessages(); });
  })();
})();
