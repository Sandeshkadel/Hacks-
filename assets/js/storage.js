// LocalStorage-backed data and simple auth
(function(){
  const KEY = 'clubData.v1';
  const SESSION = 'clubSession.v1';
  const DEFAULT = {
    settings: {
      adminEmail: 'admin@club.local',
      adminUser: 'admin@club.local',
      // SHA-256 of "hackclub123"
      adminPassHash: '2a0a6f0b5b7a314cf5e0f49c3ec6a2e3d52c2a8b66b9bb9c6a3b15f3d9a0a1a8',
      donationLink: 'https://donate.stripe.com/test_12345',
      socials: [
        { name:'Twitter', url:'https://twitter.com/hackclub' },
        { name:'GitHub', url:'https://github.com/hackclub' }
      ],
      contact: 'admin@club.local'
    },
    clubInfo: [
      { title:'Mission', text:'Empower students to build and ship projects.' },
      { title:'Goals', text:'Workshops, open-source, hackathons, and community.' },
      { title:'Achievements', text:'Shipped 25+ projects and hosted 3 hackathons.' }
    ],
    sponsors: [
      { id: uid(), name:'Acme Corp', image:'https://placehold.co/240x120?text=Acme', link:'#', description:'Supporting student innovation.' },
      { id: uid(), name:'TechNova', image:'https://placehold.co/240x120?text=TechNova', link:'#', description:'Fueling creativity and learning.' }
    ],
    projects: [
      { id: uid(), name:'Club Site', creators:'Team', demo:'#', code:'#', description:'Our official site.' },
      { id: uid(), name:'IoT Monitor', creators:'Alice, Bob', demo:'#', code:'#', description:'Sensor dashboard.' }
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
    information: { html: '<p>Welcome to <strong>Hack Club</strong>. Edit this content in Admin &gt; Information.</p>' },
    members: [
      { id: uid(), name:'John Doe', caste:'General', contact:'1234567890', location:'City', email:'john@example.com', message:'Excited to join!', status:'approved' }
    ],
    meetings: [
      { id: uid(), title:'Weekly Sync', date:'2025-09-01 17:00', description:'Project updates', zoomLink:'' }
    ],
    meetingRecordings: [],
    emails: []
  };

  function uid(){ return (Date.now().toString(36) + Math.random().toString(36).slice(2,8)).toUpperCase(); }
  function getData(){
    try{
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : clone(DEFAULT);
    }catch{ return clone(DEFAULT); }
  }
  function setData(data){ localStorage.setItem(KEY, JSON.stringify(data)); }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }

  async function sha256(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function getSession(){
    try{ return JSON.parse(sessionStorage.getItem(SESSION) || '{}'); }catch{ return {}; }
  }
  function setSession(s){ sessionStorage.setItem(SESSION, JSON.stringify(s)); }

  // Public API
  window.StorageAPI = {
    getData,
    saveData(){ setData(getData()); },
    setData(newData){ setData(newData); },
    reset(){ localStorage.removeItem(KEY); },
    stats(){
      const d = getData();
      return {
        participants: d.members.filter(m=>m.status==='approved').length,
        projects: d.projects.length,
        organizers:  d.members.filter(m=>m.status==='approved').slice(0,3).length || 3
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
    setInformation(html){
      const d = getData();
      d.information = { html };
      setData(d);
    },
    addRecording(url){
      const d = getData();
      d.meetingRecordings.push(url);
      setData(d);
    },
    emailOutbox(){
      return getData().emails;
    },
    pushEmail(email){
      const d = getData();
      d.emails.unshift({ id: uid(), date: new Date().toISOString(), ...email });
      setData(d);
    },
    settings(){
      const d = getData(); return d.settings;
    },
    saveSettings(upd){
      const d = getData();
      d.settings = { ...d.settings, ...upd };
      setData(d);
    },
    async login(username, password){
      const d = getData();
      const okUser = username.toLowerCase() === d.settings.adminUser.toLowerCase();
      const hash = await sha256(password);
      const okPass = hash === d.settings.adminPassHash;
      if (okUser && okPass){
        setSession({ admin:true, at: Date.now() });
        return true;
      }
      return false;
    },
    logout(){ setSession({}); },
    isAuthed(){ return !!getSession().admin; },
    async changePassword(newPass){
      const d = getData();
      d.settings.adminPassHash = await sha256(newPass);
      setData(d);
    }
  };
})();