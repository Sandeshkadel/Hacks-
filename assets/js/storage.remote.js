// Firestore-backed StorageAPI with real-time sync for everyone.
// If Firebase config is present, this overrides the local fallback StorageAPI.
(function(){
  const cfg = window.AppConfig?.firebase;
  if (!cfg?.apiKey) {
    console.info('[Storage] Firebase not configured; using local fallback.');
    return;
  }
  console.info('[Storage] Firebase enabled; using Firestore (real-time).');

  // Init Firebase (compat)
  const app = firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Collections we manage
  const COLS = [
    'organizers','sponsors','donors','resources',
    'projects','hackathons','gallery','courses',
    'members','meetings','messages','emails'
  ];
  const META_SETTINGS = db.collection('meta').doc('settings');
  const META_INFO = db.collection('meta').doc('information');

  // In-memory state
  const state = {
    ready: false,
    data: {
      settings: {},
      information: {},
      organizers: [],
      sponsors: [],
      donors: [],
      resources: [],
      projects: [],
      hackathons: [],
      gallery: [],
      courses: [],
      members: [],
      meetings: [],
      messages: [],
      emails: []
    }
  };

  function uid(){ return db.collection('_seq').doc().id.toUpperCase(); }
  function emit(){ window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {})); }

  // One-shot getters used pre-listener
  async function getDocSafe(docRef, fallback){
    const snap = await docRef.get();
    return snap.exists ? (snap.data() || {}) : (fallback ?? {});
  }
  async function getColAll(name){
    try {
      const snap = await db.collection(name).orderBy('order','desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      const snap = await db.collection(name).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  }

  // Real-time listeners (everyone gets updates immediately)
  function attachRealtime(){
    // meta docs
    META_SETTINGS.onSnapshot(s => { state.data.settings = s.data() || {}; emit(); });
    META_INFO.onSnapshot(s => { state.data.information = s.data() || {}; emit(); });
    // collections
    COLS.forEach(name => {
      try {
        db.collection(name).orderBy('order','desc').onSnapshot(snap => {
          state.data[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          emit();
        });
      } catch {
        db.collection(name).onSnapshot(snap => {
          state.data[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          emit();
        });
      }
    });
  }

  // Writers
  async function setColItem(name, item){
    const id = item.id || uid();
    const ref = db.collection(name).doc(id);
    const now = Date.now();
    const data = { ...item, id, order: item.order ?? (Number.MAX_SAFE_INTEGER - now) };
    await ref.set(data, { merge:true });
    return data;
  }
  async function delColItem(name, id){
    await db.collection(name).doc(id).delete();
  }
  async function reorderCol(name, orderedIds){
    const base = Number.MAX_SAFE_INTEGER;
    const batch = db.batch();
    orderedIds.forEach((id, i) => {
      const ref = db.collection(name).doc(id);
      batch.set(ref, { order: base - i }, { merge:true });
    });
    await batch.commit();
  }

  // Override global StorageAPI with remote implementation
  window.StorageAPI = {
    // Load data once, then rely on realtime listeners
    async getData(){
      if (!state.ready){
        const [
          settings, information,
          organizers, sponsors, donors, resources,
          projects, hackathons, gallery, courses,
          members, meetings, messages, emails
        ] = await Promise.all([
          getDocSafe(META_SETTINGS, {}),
          getDocSafe(META_INFO, {}),
          ...COLS.map(getColAll)
        ]);
        state.data = { settings, information, organizers, sponsors, donors, resources, projects, hackathons, gallery, courses, members, meetings, messages, emails };
        state.ready = true;
        attachRealtime();
      }
      return state.data;
    },
    async setData(){ /* no-op on remote */ },
    async reset(){ /* not exposed for safety */ },

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
      const data = { id: uid(), ...member, status:'pending', createdAt: Date.now() };
      await setColItem('members', data);
      return { ok:true, id: data.id };
    },
    async updateMember(id, updates){
      await setColItem('members', { id, ...updates });
      return true;
    },
    async deleteMember(id){
      await delColItem('members', id);
    },

    // Generic CRUD
    async upsert(listName, item){ return await setColItem(listName, item); },
    async remove(listName, id){ await delColItem(listName, id); },
    async reorder(listName, ids){ await reorderCol(listName, ids); },

    async setInformationSection(section, html){
      await META_INFO.set({ [section]: html }, { merge:true });
    },

    async addMessage(msg){
      const data = { id: uid(), date: new Date().toISOString(), ...msg };
      await setColItem('messages', data);
    },

    async emailOutbox(){
      const snap = await db.collection('emails').orderBy('date', 'desc').get().catch(()=> db.collection('emails').get());
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async pushEmail(email){
      const data = { id: uid(), date: new Date().toISOString(), ...email };
      await setColItem('emails', data);
    },

    async settings(){
      const s = await getDocSafe(META_SETTINGS, {});
      return s;
    },
    async saveSettings(upd){
      await META_SETTINGS.set(upd, { merge:true });
    },

    // Auth via Firebase
    async checkCredentials(){ return { ok:false }; },
    async login(username, password){
      await auth.signInWithEmailAndPassword(username, password);
      return true;
    },
    logout(){ return auth.signOut(); },
    isAuthed(){ return !!auth.currentUser; },
    async changePassword(newPass){
      if (!auth.currentUser) throw new Error('Not authorized');
      await auth.currentUser.updatePassword(newPass);
    }
  };

  // Make sure clubDataUpdated fires on auth state changes (useful for UI toggles)
  auth.onAuthStateChanged(() => emit());
})();
