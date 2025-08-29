// Local fallback StorageAPI: used only when Firebase config is missing.
// Remote (Firestore) will override with storage.remote.js if configured.
(function(){
  const KEY = 'clubData.v2';
  const SESSION = 'clubSession.v1';

  const DEFAULT = {
    settings: {
      adminEmail: 'admin@club.local',
      adminUser: 'admin@club.local',
      adminPassHash: '',
      adminPassPlain: 'hackclub123',
      donationLink: '',
      socials: [],
      contact: 'admin@club.local'
    },
    organizers: [],
    sponsors: [],
    donors: [],
    resources: [],
    projects: [],
    hackathons: [],
    gallery: [],
    courses: [],
    information: { goals: '<p>Our goals: build, learn, share.</p>' },
    members: [],
    meetings: [],
    messages: [],
    emails: []
  };

  function uid(){ return (Date.now().toString(36) + Math.random().toString(36).slice(2,8)).toUpperCase(); }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }

  function setData(data){
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent?.(new CustomEvent('clubDataUpdated', { detail: { key: KEY } }));
  }
  function getData(){
    try{
      const raw = localStorage.getItem(KEY);
      const d = raw ? JSON.parse(raw) : clone(DEFAULT);
      d.settings = { ...DEFAULT.settings, ...(d.settings||{}) };
      return d;
    }catch{ return clone(DEFAULT); }
  }

  async function sha256(text){
    try{
      if (!('crypto' in window) || !window.crypto?.subtle) throw new Error('no subtle');
      const enc = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch{ return null; }
  }

  function getSession(){
    try{ return JSON.parse(sessionStorage.getItem(SESSION) || '{}'); }catch{ return {}; }
  }
  function setSession(s){ sessionStorage.setItem(SESSION, JSON.stringify(s)); }

  // Expose local fallback
  window.StorageAPI = {
    // data
    getData,
    setData(newData){ setData(newData); },
    reset(){ localStorage.removeItem(KEY); },

    stats(){
      const d = getData();
      return {
        participants: d.members.filter(m=>m.status==='approved').length,
        projects: d.projects.length,
        organizers: d.organizers.length
      };
    },

    addMember(member){
      const d = getData();
      d.members.push({ id: uid(), ...member, status:'pending' });
      setData(d); return { ok:true };
    },
    updateMember(id, updates){
      const d = getData();
      const i = d.members.findIndex(m=>m.id===id);
      if (i<0) return false;
      d.members[i] = { ...d.members[i], ...updates };
      setData(d); return true;
    },
    deleteMember(id){
      const d = getData();
      d.members = d.members.filter(m=>m.id!==id);
      setData(d);
    },

    upsert(listName, item){
      const d = getData();
      const list = d[listName] || [];
      if (!item.id){ item.id = uid(); list.unshift(item); }
      else {
        const i = list.findIndex(x=>x.id===item.id);
        if (i>=0) list[i] = { ...list[i], ...item };
        else list.unshift(item);
      }
      d[listName] = list;
      setData(d); return item;
    },
    remove(listName, id){
      const d = getData();
      d[listName] = (d[listName]||[]).filter(x=>x.id!==id);
      setData(d);
    },
    reorder(listName, orderedIds){
      const d = getData();
      const map = new Map((d[listName]||[]).map(x=>[x.id, x]));
      d[listName] = orderedIds.map(id => map.get(id)).filter(Boolean);
      setData(d);
    },

    setInformationSection(section, html){
      const d = getData();
      d.information[section] = html;
      setData(d);
    },
    addMessage(msg){
      const d = getData();
      d.messages.unshift({ id: uid(), date: new Date().toISOString(), ...msg });
      setData(d);
    },
    emailOutbox(){ return getData().emails; },
    pushEmail(email){
      const d = getData();
      d.emails.unshift({ id: uid(), date: new Date().toISOString(), ...email });
      setData(d);
    },
    settings(){ return getData().settings; },
    saveSettings(upd){
      const d = getData();
      d.settings = { ...d.settings, ...upd };
      setData(d);
    },

    async checkCredentials(username, password){
      const d = getData();
      const okUser = (username || '').toLowerCase() === (d.settings.adminUser || '').toLowerCase();
      if (!okUser) return { ok:false, reason:'user' };
      const hash = await sha256(password);
      let okPass = false;
      if (hash && d.settings.adminPassHash) okPass = (hash === d.settings.adminPassHash);
      if (!okPass) okPass = (password === (d.settings.adminPassPlain ?? 'hackclub123'));
      if (!okPass) return { ok:false, reason:'pass' };
      return { ok:true };
    },
    async login(username, password){
      const r = await this.checkCredentials(username, password);
      if (r.ok){ setSession({ admin:true, at: Date.now() }); return true; }
      return false;
    },
    logout(){ setSession({}); },
    isAuthed(){ return !!getSession().admin; },
    async changePassword(newPass){
      const d = getData();
      const hash = await sha256(newPass);
      d.settings.adminPassPlain = newPass;
      d.settings.adminPassHash = hash || '';
      setData(d);
    }
  };
})();
