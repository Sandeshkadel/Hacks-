// Remote Firestore-backed StorageAPI. If Firebase config exists, this overrides the fallback StorageAPI.
(function(){
  const cfg = window.AppConfig?.firebase;
  if (!cfg?.apiKey) {
    // No Firebase configured: keep local fallback
    console.info('[Storage] Firebase not configured, using localStorage fallback.');
    return;
  }
  console.info('[Storage] Using Firebase Firestore for persistent storage.');

  // Initialize Firebase (compat)
  const app = firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Collections mapping
  const COLS = [
    'organizers','sponsors','donors','resources',
    'projects','hackathons','gallery','courses',
    'members','meetings','messages','emails'
  ];
  const META_SETTINGS = db.collection('meta').doc('settings');
  const META_INFO = db.collection('meta').doc('information');

  function uid(){ return db.collection('_seq').doc().id.toUpperCase(); }

  // Helpers
  async function getDocSafe(docRef, fallback){
    const snap = await docRef.get();
    return snap.exists ? snap.data() : (fallback ?? {});
  }
  async function getColAll(name){
    const snap = await db.collection(name).orderBy('order', 'desc').get().catch(async err=>{
      // No index/order yet: fetch without order
      const alt = await db.collection(name).get();
      return alt;
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
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
    // Write incremental order values
    const batch = db.batch();
    const base = Number.MAX_SAFE_INTEGER;
    orderedIds.forEach((id, i)=>{
      const ref = db.collection(name).doc(id);
      batch.set(ref, { order: base - i }, { merge:true });
    });
    await batch.commit();
  }

  // Cache last fetched data for stats
  let cache = null;

  window.StorageAPI = {
    async getData(){
      // Fetch all data concurrently
      const [
        settings, information,
        organizers, sponsors, donors, resources,
        projects, hackathons, gallery, courses,
        members, meetings, messages, emails
      ] = await Promise.all([
        getDocSafe(META_SETTINGS, { adminEmail:'', adminUser:'', donationLink:'', contact:'', socials:[] }),
        getDocSafe(META_INFO, {}),
        ...COLS.map(getColAll)
      ]);
      const data = {
        settings, information,
        organizers, sponsors, donors, resources,
        projects, hackathons, gallery, courses,
        members, meetings, messages, emails
      };
      cache = data;
      return data;
    },

    async setData(){ /* no-op on remote: use per-list upsert/remove APIs */ },

    async reset(){
      // Dangerous utility: wipe collections (admin only). Not exposed in UI.
      if (!auth.currentUser) throw new Error('Not authorized');
      for (const name of COLS){
        const docs = await db.collection(name).get();
        const batch = db.batch();
        docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      await META_SETTINGS.delete();
      await META_INFO.delete();
    },

    stats(){
      const d = cache;
      if (!d) return { participants: 0, projects: 0, organizers: 0 };
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
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
      return { ok:true, id: data.id };
    },
    async updateMember(id, updates){
      await setColItem('members', { id, ...updates });
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
      return true;
    },
    async deleteMember(id){
      await delColItem('members', id);
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
    },

    // Generic lists
    async upsert(listName, item){
      const saved = await setColItem(listName, item);
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
      return saved;
    },
    async remove(listName, id){
      await delColItem(listName, id);
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
    },
    async reorder(listName, orderedIds){
      await reorderCol(listName, orderedIds);
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
    },

    async setInformationSection(section, html){
      await META_INFO.set({ [section]: html }, { merge:true });
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
    },

    async addMessage(msg){
      const data = { id: uid(), date: new Date().toISOString(), ...msg };
      await setColItem('messages', data);
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
    },

    async emailOutbox(){
      return await getColAll('emails');
    },
    async pushEmail(email){
      const data = { id: uid(), date: new Date().toISOString(), ...email };
      await setColItem('emails', data);
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
    },

    async settings(){
      return await getDocSafe(META_SETTINGS, { adminEmail:'', adminUser:'', donationLink:'', contact:'', socials:[] });
    },
    async saveSettings(upd){
      await META_SETTINGS.set(upd, { merge:true });
      window.dispatchEvent?.(new CustomEvent('clubDataUpdated', {}));
    },

    // Auth: use Firebase Auth when configured; fallback to local if Firebase Auth not enabled
    async checkCredentials(username, password){
      // When using Firebase, we check by trying to sign in (but login() does this)
      return { ok:false };
    },
    async login(username, password){
      if (cfg?.apiKey){
        await auth.signInWithEmailAndPassword(username, password);
        return true;
      }
      return false;
    },
    logout(){ return auth.signOut(); },
    isAuthed(){ return !!auth.currentUser; },
    async changePassword(newPass){
      if (!auth.currentUser) throw new Error('Not authorized');
      await auth.currentUser.updatePassword(newPass);
    }
  };

  // Keep cache updated on every write from other tabs (optional: listeners)
  // For simplicity, we refresh cache on-demand when getData() is called.
})();
