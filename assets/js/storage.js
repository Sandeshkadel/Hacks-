// Local fallback StorageAPI (used ONLY when Firebase config is missing).
(function(){
  const KEY = 'clubData.v2';
  const SESSION = 'clubSession.v1';
  const DEFAULT = {
    settings: { adminEmail:'admin@club.local', adminUser:'admin@club.local', donationLink:'', contact:'admin@club.local' },
    organizers: [], sponsors: [], donors: [], resources: [], projects: [], hackathons: [], gallery: [], courses: [],
    information: { goals: '<p>Our goals: build, learn, share.</p>' },
    members: [], meetings: [], messages: [], emails: []
  };
  const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2,8)).toUpperCase();
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || DEFAULT; } catch { return DEFAULT; } };
  const save = (d) => { localStorage.setItem(KEY, JSON.stringify(d)); window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {})); };
  const get = () => { const d = load(); d.settings = { ...DEFAULT.settings, ...(d.settings||{}) }; return d; };
  const setSession = s => sessionStorage.setItem(SESSION, JSON.stringify(s||{}));
  const getSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION)||'{}'); } catch { return {}; } };

  window.StorageAPI = {
    async getData(){ return get(); },
    stats(){ const d=get(); return { participants:(d.members||[]).filter(m=>m.status==='approved').length, projects:(d.projects||[]).length, organizers:(d.organizers||[]).length }; },
    addMember(m){ const d=get(); d.members.unshift({ id:uid(), ...m, status:'pending'}); save(d); return { ok:true }; },
    updateMember(id, u){ const d=get(); const i=(d.members||[]).findIndex(x=>x.id===id); if(i>=0){ d.members[i]={...d.members[i], ...u}; save(d);} return true; },
    deleteMember(id){ const d=get(); d.members=(d.members||[]).filter(x=>x.id!==id); save(d); },
    upsert(name, item){ const d=get(); const list=d[name]||[]; if(!item.id){ item.id=uid(); list.unshift(item);} else { const i=list.findIndex(x=>x.id===item.id); if(i>=0) list[i]={...list[i], ...item}; else list.unshift(item);} d[name]=list; save(d); return item; },
    remove(name, id){ const d=get(); d[name]=(d[name]||[]).filter(x=>x.id!==id); save(d); },
    reorder(name, ids){ const d=get(); const map=new Map((d[name]||[]).map(x=>[x.id,x])); d[name]=ids.map(id=>map.get(id)).filter(Boolean); save(d); },
    setInformationSection(section, html){ const d=get(); d.information[section]=html; save(d); },
    addMessage(msg){ const d=get(); d.messages.unshift({ id:uid(), date:new Date().toISOString(), ...msg }); save(d); },
    emailOutbox(){ return get().emails || []; },
    pushEmail(email){ const d=get(); d.emails.unshift({ id:uid(), date:new Date().toISOString(), ...email }); save(d); },
    settings(){ return get().settings || {}; },
    saveSettings(upd){ const d=get(); d.settings={...(d.settings||{}), ...upd}; save(d); },
    async login(user, pass){ setSession({admin:true, at:Date.now()}); return true; },
    logout(){ setSession({}); },
    isAuthed(){ return !!getSession().admin; },
    async changePassword(){ throw new Error('Local mode only.'); }
  };
})();
