// LocalStorage-backed data and simple auth; includes organizers socials and clubs dataset
(function(){
  const KEY = 'clubData.v2';
  const SESSION = 'clubSession.v1';
  function uid(){ return (Date.now().toString(36) + Math.random().toString(36).slice(2,8)).toUpperCase(); }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }

  const DEFAULT = {
    settings: {
      adminEmail: 'admin@club.local',
      adminUser: 'admin@club.local',
      // SHA-256 of "hackclub123"
      adminPassHash: '2a0a6f0b5b7a314cf5e0f49c3ec6a2e3d52c2a8b66b9bb9c6a3b15f3d9a0a1a8',
      adminPassPlain: 'hackclub123',
      donationLink: 'https://donate.stripe.com/test_12345',
      socials: [
        { name:'Twitter', url:'https://twitter.com/hackclub' },
        { name:'GitHub', url:'https://github.com/hackclub' }
      ],
      contact: 'admin@club.local'
    },
    // New: clubs dataset for index Clubs section
    clubs: [
      { id: uid(), name:'TechCrafters Kathmandu', link:'https://example.com/techcrafters', image:'https://placehold.co/640x360?text=TechCrafters', socials:[{name:'GitHub', url:'https://github.com/hackclub'}] },
      { id: uid(), name:'Hack Club Pokhara', link:'https://example.com/pokhara', image:'https://placehold.co/640x360?text=Hack+Club+Pokhara' }
    ],
    organizers: [
      { id: uid(), name:'Jane Doe', role:'Lead Organizer', image:'https://placehold.co/320x200?text=Jane', socials:[{name:'GitHub', url:'https://github.com/janedoe'},{name:'LinkedIn', url:'https://linkedin.com/in/janedoe'}] },
      { id: uid(), name:'Sam Lee', role:'Coordinator', image:'https://placehold.co/320x200?text=Sam', socials:[{name:'Twitter', url:'https://x.com/samlee'}] }
    ],
    sponsors: [
      { id: uid(), name:'Acme Corp', image:'https://placehold.co/240x120?text=Acme', link:'#', description:'Supporting student innovation.' },
      { id: uid(), name:'TechNova', image:'https://placehold.co/240x120?text=TechNova', link:'#', description:'Fueling creativity and learning.' }
    ],
    donors: [],
    resources: [
      { id: uid(), title:'Hack Club Handbook', url:'https://guide.hackclub.com', description:'Official guides and tips.' },
      { id: uid(), title:'Workshops', url:'https://workshops.hackclub.com', description:'Learn by building.' }
    ],
    projects: [
      { id: uid(), name:'Club Site', creators:'Team', demo:'#', code:'#', description:'Our official site.', award:'month', image:'https://placehold.co/640x360?text=Club+Site' },
      { id: uid(), name:'IoT Monitor', creators:'Alice, Bob', demo:'#', code:'#', description:'Sensor dashboard.', award:'week', image:'https://placehold.co/640x360?text=IoT+Monitor' },
      { id: uid(), name:'Portfolio Hub', creators:'Nita', description:'Student portfolios hub.', image:'https://placehold.co/640x360?text=Portfolio+Hub' }
    ],
    hackathons: [
      { id: uid(), title:'Winter Hacks', date:'2025-01-15', description:'48-hour hackathon.', participants:['Alice','Bob'], prizes:['Swag','Cash'], winners:['Team Alpha'], images:['https://placehold.co/480x300?text=Hack'] }
    ],
    gallery: [
      { id: uid(), type:'image', src:'https://placehold.co/600x400?text=Workshop', description:'Workshop' },
      { id: uid(), type:'video', src:'https://www.w3schools.com/html/mov_bbb.mp4', description:'Highlights' }
    ],
    courses: [
      { id: uid(), title:'Intro to Web', level:'beginner', url:'https://youtube.com', embed:'' },
      { id: uid(), title:'React Deep Dive', level:'advanced', url:'https://youtube.com', embed:'' }
    ],
    information: {
      goals: '<p>Our goals: build, learn, share.</p>',
      motto: '<p>Our motto: Ship it!</p>',
      what_is_hackclub: '<p>Hack Club is a global student community of makers.</p>',
      what_is_our_club: '<p>Our club is a local chapter that meets weekly.</p>',
      sources: '<p>Useful sources listed in Resources.</p>'
    },
    members: [],
    meetings: [],
    meetingRecordings: [],
    messages: [],
    emails: []
  };

  function setData(data){
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent?.(new CustomEvent('clubDataUpdated', { detail: { key: KEY } }));
  }
  function getData(){
    try{
      const raw = localStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : clone(DEFAULT);
      if (!data.settings.adminUser) { data.settings.adminUser = 'admin@club.local'; setData(data); }
      if (!data.settings.adminPassPlain) { data.settings.adminPassPlain = 'hackclub123'; setData(data); }
      if (!Array.isArray(data.clubs)) { data.clubs = clone(DEFAULT.clubs); setData(data); }
      return data;
    }catch{ return clone(DEFAULT); }
  }

  async function sha256(text){
    try{
      if (!('crypto' in window) || !window.crypto?.subtle) throw new Error('no subtle crypto');
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
    getData,
    setData(newData){ setData(newData); },
    reset(){ localStorage.removeItem(KEY); },

    stats(){
      const d = getData();
      return {
        participants: d.members.filter(m=>m.status==='approved').length,
        projects: d.projects.length,
        organizers:  d.organizers.length
      };
    },

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
