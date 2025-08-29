// Firestore-backed StorageAPI with live sync + duplicate registration protection + optional dedupe
(function(){
  const cfg = window.AppConfig?.firebase;
  if (!cfg?.apiKey) { console.info('[Storage] Firebase not configured; using local fallback.'); return; }
  console.info('[Storage] Firebase enabled; using Firestore (real-time).');

  const app = firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();

  try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch {}

  const COLS = [
    'organizers','sponsors','donors','resources',
    'projects','hackathons','gallery','courses',
    'members','meetings','messages','emails'
  ];
  const META_SETTINGS = db.collection('meta').doc('settings');
  const META_INFO = db.collection('meta').doc('information');

  const state = {
    ready: false,
    data: {
      settings: {}, information: {},
      organizers: [], sponsors: [], donors: [], resources: [],
      projects: [], hackathons: [], gallery: [], courses: [],
      members: [], meetings: [], messages: [], emails: []
    }
  };

  function uid(){ return db.collection('_seq').doc().id.toUpperCase(); }
  function emit(){ window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {})); }

  async function getDocSafe(ref, fallback){ const s = await ref.get(); return s.exists ? (s.data()||{}) : (fallback||{}); }
  async function getColAll(name){
    try { const snap = await db.collection(name).orderBy('order','desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      const snap = await db.collection(name).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  }

  function attachRealtime(){
    META_SETTINGS.onSnapshot(s => { state.data.settings = s.data() || {}; emit(); });
    META_INFO.onSnapshot(s => { state.data.information = s.data() || {}; emit(); });
    COLS.forEach(name => {
      try {
        db.collection(name).orderBy('order','desc').onSnapshot(snap => {
          state.data[name] = snap.docs.map(d => ({ id: d.id, ...d.data() })); emit();
        });
      } catch {
        db.collection(name).onSnapshot(snap => {
          state.data[name] = snap.docs.map(d => ({ id: d.id, ...d.data() })); emit();
        });
      }
    });
  }

  async function setColItem(name, item){
    const id = item.id || uid();
    const ref = db.collection(name).doc(id);
    const now = Date.now();
    const data = { ...item, id, order: item.order ?? (Number.MAX_SAFE_INTEGER - now) };
    await ref.set(data, { merge:true });
    return data;
  }
  async function delColItem(name, id){ await db.collection(name).doc(id).delete(); }
  async function reorderCol(name, orderedIds){
    const base = Number.MAX_SAFE_INTEGER;
    const batch = db.batch();
    orderedIds.forEach((id, i) => batch.set(db.collection(name).doc(id), { order: base - i }, { merge:true }));
    await batch.commit();
  }

  // Helpers for duplicate checks
  function normEmail(e){ return String(e||'').trim().toLowerCase(); }
  function normPhone(p){ return String(p||'').replace(/[^\d]/g,''); }

  window.StorageAPI = {
    async getData(){
      if (!state.ready){
        const [settings, information, ...colls] = await Promise.all([
          getDocSafe(META_SETTINGS, {}),
          getDocSafe(META_INFO, {}),
          ...COLS.map(getColAll)
        ]);
        const [
          organizers, sponsors, donors, resources,
          projects, hackathons, gallery, courses,
          members, meetings, messages, emails
        ] = colls;
        state.data = { settings, information, organizers, sponsors, donors, resources, projects, hackathons, gallery, courses, members, meetings, messages, emails };
        state.ready = true;
        attachRealtime();
      }
      return state.data;
    },

    // Stats: only approved members count
    stats(){
      const d = state.data;
      return {
        participants: (d.members||[]).filter(m=>m.status==='approved').length,
        projects: (d.projects||[]).length,
        organizers: (d.organizers||[]).length
      };
    },

    // Members
    async addMember(member){
      // Duplicate prevention: same email OR same phone
      const email = normEmail(member.email);
      const phone = normPhone(member.phone);
      const checks = [];
      if (email) checks.push(db.collection('members').where('email', '==', email).limit(1).get());
      if (phone) checks.push(db.collection('members').where('phone', '==', phone).limit(1).get());
      if (checks.length){
        const snaps = await Promise.all(checks);
        const dup = snaps.some(s => s.docs.length > 0);
        if (dup) {
          const err = new Error('You are already registered with this email/phone.');
          err.code = 'already-registered';
          throw err;
        }
      }
      const data = {
        id: uid(),
        ...member,
        email,
        phone,
        status:'pending',
        createdAt: Date.now()
      };
      await setColItem('members', data);
      return { ok:true, id: data.id };
    },
    async updateMember(id, updates){ await setColItem('members', { id, ...updates }); return true; },
    async deleteMember(id){ await delColItem('members', id); },

    // Admin: optional dedupe (keep oldest by createdAt)
    async dedupeMembers(){
      const snap = await db.collection('members').get();
      const list = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      const map = new Map();
      const del = [];
      for (const m of list){
        const key = `${normEmail(m.email)}|${normPhone(m.phone)}`;
        if (!key.trim()) continue;
        const cur = map.get(key);
        if (!cur) { map.set(key, m); continue; }
        // Keep older one
        const keep = (cur.createdAt||0) <= (m.createdAt||0) ? cur : m;
        const drop = keep === cur ? m : cur;
        map.set(key, keep);
        del.push(drop.id);
      }
      if (!del.length) return 0;
      const batch = db.batch();
      del.forEach(id => batch.delete(db.collection('members').doc(id)));
      await batch.commit();
      return del.length;
    },

    // Generic CRUD
    async upsert(name, item){ return await setColItem(name, item); },
    async remove(name, id){ await delColItem(name, id); },
    async reorder(name, ids){ await reorderCol(name, ids); },

    async setInformationSection(section, html){ await META_INFO.set({ [section]: html }, { merge:true }); },

    // Messages / Emails
    async addMessage(msg){ const data = { id: uid(), date: new Date().toISOString(), ...msg }; await setColItem('messages', data); },
    async emailOutbox(){
      const snap = await db.collection('emails').orderBy('date', 'desc').get().catch(()=> db.collection('emails').get());
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async pushEmail(email){
      const data = { id: uid(), date: new Date().toISOString(), ...email };
      await setColItem('emails', data);
    },

    // Settings
    async settings(){ return await getDocSafe(META_SETTINGS, {}); },
    async saveSettings(upd){ await META_SETTINGS.set(upd, { merge:true }); },

    // Auth
    async login(username, password){ await auth.signInWithEmailAndPassword(username, password); return true; },
    logout(){ return auth.signOut(); },
    isAuthed(){ return !!auth.currentUser; },
    async changePassword(newPass){
      if (!auth.currentUser) throw new Error('Not authorized');
      await auth.currentUser.updatePassword(newPass);
    }
  };

  auth.onAuthStateChanged(() => emit());
})();
