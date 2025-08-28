document.addEventListener('DOMContentLoaded', () => {
  if (!window.StorageAPI.isAuthed()){
    // fall back message without UI dependency
    try { window.UI.toast('Please login', 'error'); } catch {}
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
    const s = window.StorageAPI.stats();
    // Show approved members count only
    const m = document.getElementById('stat-members');
    if (m) m.textContent = s.participants;
    const p = document.getElementById('stat-projects');
    if (p) p.textContent = s.projects;
    const h = document.getElementById('stat-hackathons');
    if (h) h.textContent = window.StorageAPI.getData().hackathons.length;
  }
  refreshStats();

  // Members table (approve/decline/update/delete)
  const membersTable = document.getElementById('members-table');
  function renderMembers(){
    const data = window.StorageAPI.getData().members;
    membersTable.innerHTML = `
      <div class="row header"><div>Name</div><div>Email</div><div>Contact</div><div>Location</div><div>Status</div><div class="actions">Actions</div></div>
      ${data.map(m => `
        <div class="row">
          <div>${window.UI.escape(m.name||'')}</div>
          <div>${window.UI.escape(m.email||'')}</div>
          <div>${window.UI.escape(m.contact||'')}</div>
          <div>${window.UI.escape(m.location||'')}</div>
          <div>${window.UI.escape(m.status||'pending')}</div>
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
      try {
        const m = window.StorageAPI.getData().members.find(x=>x.id===approve);
        window.EmailAPI?.send?.({ to: m.email, subject:'Hack Club: Approved', message:`Hi ${m.name}, you are approved!` });
      } catch {}
    } else if (decline){
      window.StorageAPI.updateMember(decline, { status:'declined' });
      try {
        const m = window.StorageAPI.getData().members.find(x=>x.id===decline);
        window.EmailAPI?.send?.({ to: m.email, subject:'Hack Club: Declined', message:`Hi ${m.name}, please re-apply later.` });
      } catch {}
    } else if (del){
      window.StorageAPI.deleteMember(del);
    } else if (edit){
      const m = window.StorageAPI.getData().members.find(x=>x.id===edit);
      const name = prompt('Name', m.name); if (name==null) return;
      const email = prompt('Email', m.email); if (email==null) return;
      const contact = prompt('Contact', m.contact); if (contact==null) return;
      const location = prompt('Location', m.location); if (location==null) return;
      window.StorageAPI.updateMember(edit, { name, email, contact, location });
    }
    try { window.UI.toast('Updated', 'success'); } catch {}
    renderMembers(); refreshStats();
  });
  renderMembers();

  // The rest of the CRUD sections remain as before...
  // (If you need me to include the full admin.js with all CRUD again, say "send full admin.js")
});
