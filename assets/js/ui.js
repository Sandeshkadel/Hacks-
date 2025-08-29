// UI helpers: toast, forms, tabs, and splash loader handling.
(function(){
  function toast(msg, type){
    const el = document.getElementById('toast');
    if (!el) return alert(msg);
    el.textContent = msg;
    el.className = 'toast ' + (type || '');
    el.style.opacity = 1;
    setTimeout(()=> el.style.opacity = 0, 2500);
  }
  function formToObject(form){
    const o = {};
    new FormData(form).forEach((v,k)=>{ o[k]=v; });
    if (o.amount && !isNaN(Number(o.amount))) o.amount = Number(o.amount);
    return o;
  }
  function setForm(form, obj){
    Object.keys(obj||{}).forEach(k=>{
      const el = form.querySelector(`[name="${k}"]`);
      if (el) el.value = obj[k] ?? '';
    });
  }
  function clearForm(form){ form.reset(); const id = form.querySelector('[name="id"]'); if (id) id.value=''; }

  // Tabs
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.admin-sidebar button[data-tab]');
    if (!btn) return;
    document.querySelectorAll('.admin-sidebar button').forEach(b=> b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.admin-content .tab').forEach(t=> t.classList.add('hidden'));
    document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
  });

  // Splash loader hider (fixes index.html stuck on loading)
  let splashHidden = false;
  function hideSplash(){
    if (splashHidden) return;
    const el = document.getElementById('splash');
    if (el) { el.style.display = 'none'; splashHidden = true; }
  }
  // Hide when data first arrives or after a fallback timeout
  window.addEventListener('clubDataUpdated', hideSplash, { once: true });
  window.addEventListener('load', () => setTimeout(hideSplash, 1200));

  window.UI = { toast, formToObject, setForm, clearForm, hideSplash };
})();
