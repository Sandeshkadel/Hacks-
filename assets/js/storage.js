// LocalStorage data + auth + email outbox + CRUD helpers
(function(){
  const KEY = 'clubData.v2';
  const SESSION = 'clubSession.v1';

  const DEFAULT = {
    settings: {
      adminEmail: 'admin@club.local',
      adminUser: 'admin@club.local',
      // SHA-256 of "hackclub123"
      adminPassHash: '2a0a6f0b5b7a314cf5e0f49c3ec6a2e3d52c2a8b66b9bb9c6a3b15f3d9a0a1a8',
      adminPassPlain: 'hackclub123',
      donationLink: '',
      socials: [],
      contact: 'admin@club.local'
    },
    organizers: [
      { id: uid(), name:'Jane Doe', role:'Lead Organizer', image:'https://placehold.co/320x200?text=Jane', socials:[{name:'GitHub', url:'https://github.com/janedoe'}] }
    ],
    sponsors: [
      { id: uid(), name:'Acme Corp', image:'https://placehold.co/240x120?text=Acme', link:'#', description:'Supporting student innovation.' }
    ],
    donors: [],
    resources: [
      { id: uid(), title:'Hack Club Handbook', url:'https://guide.hackclub.com', description:'Official guides and tips.' }
    ],
    projects: [
      { id: uid(), name:'Club Site', creators:'Team', makerSocials:[{name:'GitHub',url:'https://github.com/hackclub'}], image:'https://placehold.co/640x360?text=Project', demo:'#', code:'#', description:'Our official site.', award:'month' }
    ],
    hackathons: [
      { id: uid(), title:'Winter Hacks', date:'2025-01-15', website:'#', cover:'https://placehold.co/640x360?text=Hack', description:'48-hour hackathon.', prizes:['Swag'], participants:['Alice','Bob'], winners:['Team Alpha'] }
    ],
    gallery: [
      { id: uid(), type:'image', src:'https://placehold.co/600x400?text=Workshop', link:'#', event:'Workshop', date:'2025-07-01', description:'Great session' }
    ],
    courses: [
      { id: uid(), title:'Intro to Web', level:'beginner', url:'https://youtube.com', embed:'', thumb:'', description:'Basics' }
    ],
    information: {
      goals: '<p>Our goals: build, learn, share.</p>'
    },
    members: [
      { id: uid(), name:'John Doe', caste:'General', contact:'+9779800000000', location:'City', email:'john@example.com', message:'Excited to join!', status:'pending' }
    ],
    meetings: [
      { id: uid(), title:'Weekly Sync', date:'2025-09-01 17:00', description:'Project updates', zoomLink:'' }
    ],
    meetingRecordings: [],
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
      // migrations / defaults
      d.settings = { ...DEFAULT.settings, ...(d.settings||{}) };
      d.organizers = d.organizers || [];
      d.projects = (d.projects || []).map(p => ({ makerSocials: [], ...p }));
      d.gallery = d.gallery || [];
      d.hackathons = d.hackathons || [];
      d.resources = d.resources || [];
      d.courses = d.courses || [];
      d.sponsors = d.sponsors || [];
      d.donors = d.donors || [];
      d.information = d.information || {};
      d.members = d.members || [];
      d.meetings = d.meetings || [];
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

  window.StorageAPI = {
    // data
    getData,
    setData(newData){ setData(newData); },
    reset(){ localStorage.removeItem(KEY); },

    // stats: participants only includes approved members
    stats(){
      const d = getData();
      return {
        participants: d.members.filter(m=>m.status==='approved').length,
        projects: d.projects.length,
        organizers: d.organizers.length
      };
    },

    // members
    addMember(member){
      const d = getData();
      const exists = d.members.some(m =>
        (m.email||'').toLowerCase() === (member.email||'').toLowerCase() ||
        (m.name||'').trim().toLowerCase() === (member.name||'').trim().toLowerCase() ||
        m.contact === member.contact
      );
      if (exists) return { ok:false, message:'Already registered' };
      d.members.push({ id: uid(), ...member, status:'pending' });
      setData(d);
      return { ok:true };
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

    // generic lists
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

    // information
    setInformationSection(section, html){
      const d = getData();
      d.information[section] = html;
      setData(d);
    },

    // meeting recordings/messages/emails
    addRecording(url){
      const d = getData();
      d.meetingRecordings.push(url);
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

    // settings
    settings(){ return getData().settings; },
    saveSettings(upd){
      const d = getData();
      d.settings = { ...d.settings, ...upd };
      setData(d);
    },

    // auth
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
      const res = await this.checkCredentials(username, password);
      if (res.ok){
        setSession({ admin:true, at: Date.now() });
        return true;
      }
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

  window.addEventListener?.('storage', (e) => {
    if (e.key === KEY) {
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', { detail: { key: KEY } }));
    }
  });
})();
