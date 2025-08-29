// Add one-time dedupe on admin load (keeps oldest, removes duplicates by email/phone)
(function(){
  const S = window.StorageAPI;
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await S.getData();
      const flagKey = 'members.dedupe.ran';
      if (!sessionStorage.getItem(flagKey) && typeof S.dedupeMembers === 'function'){
        const removed = await S.dedupeMembers();
        if (removed > 0 && window.UI?.toast) UI.toast(`Removed ${removed} duplicate registrations`, 'success');
        sessionStorage.setItem(flagKey, '1');
      }
    } catch {}
  });
})();
// Admin wiring: updated members table shows resume link; organizer form already supports social fields via admin.html
(function(){
  const S = window.StorageAPI;
  const UI = window.UI;
  const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function onDataUpdated(fn){ window.addEventListener('clubDataUpdated', fn); }

  async function renderStats(){
    try {
      const st = S.stats();
      document.getElementById('stat-members').textContent = st.participants || 0;
      document.getElementById('stat-projects').textContent = st.projects || 0;
      // Hackathons count (if needed)
      const d = await S.getData();
      document.getElementById('stat-hackathons').textContent = (d.hackathons||[]).length || 0;
    } catch {}
  }

  function renderMembersTable(){
    S.getData().then(d => {
      const rows = (d.members||[]).map(m => `
        <tr>
          <td>${esc(m.name)}</td>
          <td>${esc(m.email)}</td>
          <td>${esc(m.phone)}</td>
          <td>${esc(m.interests)}</td>
          <td>${esc(m.skills)}</td>
          <td>${m.resumeUrl ? `<a href="${esc(m.resumeUrl)}" target="_blank" rel="noopener">Resume</a>` : ''}</td>
          <td>${esc(m.status || 'pending')}</td>
          <td class="row">
            <button class="chip success" data-approve="${m.id}">Approve</button>
            <button class="chip warn" data-decline="${m.id}">Decline</button>
            <button class="chip danger" data-delete="${m.id}">Delete</button>
          </td>
        </tr>`).join('');
      document.getElementById('members-table').innerHTML = `
        <table>
          <thead><tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Interests</th><th>Skills</th><th>Resume</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>${rows || ''}</tbody>
        </table>`;
    });
  }

  document.addEventListener('click', async (e) => {
    const approveId = e.target?.getAttribute?.('data-approve');
    const declineId = e.target?.getAttribute?.('data-decline');
    const deleteId  = e.target?.getAttribute?.('data-delete');
    if (!approveId && !declineId && !deleteId) return;

    const d = await S.getData();
    const getById = (id) => (d.members||[]).find(x=>x.id===id);

    if (approveId){
      const m = getById(approveId); if (!m) return;
      await S.updateMember(m.id, { status:'approved', approvedAt: Date.now() });
      UI.toast('Member approved', 'success');
      if (m.email) {
        const subject = 'Welcome to Hack Club!';
        const html = `<p>Hi ${esc(m.name)},</p><p>Your registration has been approved. Welcome to the club!</p>`;
        await Emailer.sendEmail(m.email, subject, html, { to_name: m.name||'', from_email:'sandeshkadel2474@gmail.com' });
      }
    }
    if (declineId){
      const m = getById(declineId); if (!m) return;
      await S.updateMember(m.id, { status:'declined', declinedAt: Date.now() });
      UI.toast('Member declined', 'warn');
      if (m.email) {
        const subject = 'Your Hack Club registration';
        const html = `<p>Hi ${esc(m.name)},</p><p>Thank you for applying. Unfortunately, your registration was not accepted at this time.</p>`;
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
  });

  document.getElementById('export-members')?.addEventListener('click', async () => {
    const d = await S.getData();
    const rows = [['id','name','email','phone','interests','skills','resumeUrl','status','createdAt']];
    (d.members||[]).forEach(m => rows.push([m.id, m.name||'', m.email||'', m.phone||'', m.interests||'', m.skills||'', m.resumeUrl||'', m.status||'', m.createdAt||'']));
    const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'members.csv'; a.click(); URL.revokeObjectURL(a.href);
  });

  // Generic CRUD binders
  function bindFormAndList(collection, formId, listId, titleField, extraLabelFields=[]){
    const form = document.getElementById(formId);
    const listEl = document.getElementById(listId);
    if (!form || !listEl) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const obj = UI.formToObject(form);
      try { await S.upsert(collection, obj); UI.toast('Saved', 'success'); UI.clearForm(form); }
      catch (e) { console.error(e); UI.toast('Save failed', 'danger'); }
    });
    form.querySelector('[data-reset]')?.addEventListener('click', () => UI.clearForm(form));

    async function renderList(){
      const d = await S.getData();
      const arr = d[collection] || [];
      listEl.innerHTML = arr.map(item => {
        const title = item[titleField] || '(untitled)';
        const subtitle = extraLabelFields.map(f=> item[f]).filter(Boolean).join(' • ');
        return `<article class="card soft">
          <h4>${esc(title)}</h4>
          ${subtitle ? `<p class="muted">${esc(subtitle)}</p>`:''}
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
        if (item) {
          UI.setForm(form, item);
          // ensure hidden id field exists
          if (!form.querySelector('input[name="id"]')) {
            const hid = document.createElement('input'); hid.type='hidden'; hid.name='id'; hid.value=item.id; form.appendChild(hid);
          }
        }
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

  // Meetings: keep your existing notify-all logic if present (not shown here to keep this file focused)

  // Bind collections
  bindFormAndList('organizers', 'form-organizer', 'organizers-list', 'name', ['role']);
  bindFormAndList('projects', 'form-project', 'projects-list', 'name', ['creators']);
  bindFormAndList('hackathons', 'form-hackathon', 'hackathons-list', 'title', ['date']);
  bindFormAndList('gallery', 'form-gallery', 'gallery-list', 'type', ['event','date']);
  bindFormAndList('sponsors', 'form-sponsor', 'sponsors-list', 'name');
  bindFormAndList('donors', 'form-donor', 'donors-list', 'name', ['amount']);
  bindFormAndList('courses', 'form-course', 'courses-list', 'title', ['level']);
  bindFormAndList('resources', 'form-resource', 'resources-list', 'title', ['url']);

  // Messages and Emails (unchanged minimal rendering)
  async function renderMessages(){
    const d = await S.getData();
    const rows = (d.messages||[]).map(m => `
      <tr><td>${esc(m.name)}</td><td>${esc(m.email)}</td><td>${esc(m.message)}</td><td>${esc(m.date)}</td></tr>`).join('');
    document.getElementById('messages-table').innerHTML =
      `<table><thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  async function renderEmails(){
    try {
      const emails = await S.emailOutbox();
      const rows = (emails||[]).map(e => `
        <tr><td>${esc(e.to)}</td><td>${esc(e.subject)}</td><td>${esc(e.status||'sent')}</td><td>${esc(e.date)}</td></tr>`).join('');
      document.getElementById('emails-list').innerHTML =
        `<table><thead><tr><th>To</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) { console.error(e); }
  }

  (async function init(){
    await S.getData();
    renderStats();
    renderMembersTable();
    renderMessages();
    renderEmails();
    onDataUpdated(() => { renderStats(); renderMembersTable(); renderMessages(); });
  })();
})();
