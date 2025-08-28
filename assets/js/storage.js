// LocalStorage-backed data and simple auth with robust password fallback + detailed checks
(function(){
  const KEY = 'clubData.v2';
  const SESSION = 'clubSession.v1';

  const DEFAULT = {
    settings: {
      adminEmail: 'admin@club.local',
      adminUser: 'admin@club.local',
      // SHA-256 of "hackclub123"
      adminPassHash: '2a0a6f0b5b7a314cf5e0f49c3ec6a2e3d52c2a8b66b9bb9c6a3b15f3d9a0a1a8',
      // Plain fallback for non-secure contexts
      adminPassPlain: 'hackclub123',
      donationLink: 'https://donate.stripe.com/test_12345',
      socials: [
        { name:'Twitter', url:'https://twitter.com/hackclub' },
        { name:'GitHub', url:'https://github.com/hackclub' }
      ],
      contact: 'admin@club.local'
    },
    clubInfo: [
      { id: uid(), section:'goals', title:'Mission', text:'Empower students to build and ship projects.' },
      { id: uid(), section:'achievements', title:'Achievements', text:'Shipped 25+ projects and hosted 3 hackathons.' }
    ],
    organizers: [
      { id: uid(), name:'Jane Doe', role:'Lead Organizer', image:'https://placehold.co/160x160?text=JD' },
      { id: uid(), name:'Sam Lee', role:'Coordinator', image:'https://placehold.co/160x160?text=SL' }
    ],
    sponsors: [
      { id: uid(), name:'Acme Corp', image:'https://placehold.co/240x120?text=Acme', link:'#', description:'Supporting student innovation.' },
      { id: uid(), name:'TechNova', image:'https://placehold.co/240x120?text=TechNova', link:'#', description:'Fueling creativity and learning.' }
    ],
    donors: [
      { id: uid(), name:'John Sponsor', amount:'$200', link:'#', description:'Community donor' }
    ],
    resources: [
      { id: uid(), title:'Hack Club Handbook', url:'https://guide.hackclub.com', description:'Official guides and tips.' },
      { id: uid(), title:'Workshops', url:'https://workshops.hackclub.com', description:'Learn by building.' }
    ],
    projects: [
      { id: uid(), name:'Club Site', creators:'Team', demo:'#', code:'#', description:'Our official site.', award:'month' },
      { id: uid(), name:'IoT Monitor', creators:'Alice, Bob', demo:'#', code:'#', description:'Sensor dashboard.', award:'week' }
    ],
    hackathons: [
      { id: uid(), title:'Winter Hacks', date:'2025-01-15', description:'48-hour hackathon.', participants:['Alice','Bob'], prizes:['Swag','Cash'], winners:['Team Alpha'], images:['https://placehold.co/480x300?text=Hack'] }
    ],
    gallery: [
      { id: uid(), type:'image', src:'https://placehold.co/600x400?text=Demo+1', description:'Workshop' },
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
    ],
    members: [
      { id: uid(), name:'John Doe', caste:'General', contact:'+9779800000000', location:'City', email:'john@example.com', message:'Excited to join!', status:'approved' }
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

  function getData(){
    try{
      const raw = localStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : clone(DEFAULT);
      if (!data.settings.adminPassPlain) { data.settings.adminPassPlain = 'hackclub123'; setData(data); }
      if (!data.settings.adminUser) { data.settings.adminUser = 'admin@club.local'; setData(data); }
      return data;
    }catch{ return clone(DEFAULT); }
  }
  function setData(data){ localStorage.setItem(KEY, JSON.stringify(data)); }

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
      const exists = d.members.some(m => m.email.toLowerCase()===member.email.toLowerCase()
        || m.name.trim().toLowerCase()===member.name.trim().toLowerCase()
        || m.contact===member.contact);
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
      const list = d[listName];
      if (!item.id){ item.id = uid(); list.unshift(item); }
      else {
        const i = list.findIndex(x=>x.id===item.id);
        if (i>=0) list[i] = { ...list[i], ...item };
        else list.unshift(item);
      }
      setData(d); return item;
    },
    remove(listName, id){
      const d = getData();
      d[listName] = d[listName].filter(x=>x.id!==id);
      setData(d);
    },
    reorder(listName, orderedIds){
      const d = getData();
      const map = new Map(d[listName].map(x=>[x.id, x]));
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

    // New: detailed credential check
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
})();
