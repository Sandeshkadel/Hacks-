// Tiny UI helpers: tabs, forms, toast.
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
    // normalize numbers if purely numeric fields like amount
    if (o.amount && !isNaN(Number(o.amount))) o.amount = Number(o.amount);
    return o;
  }
  function setForm(form, obj){
    Object.keys(obj||{}).forEach(k=>{
      const el = form.querySelector(`[name="${k}"]`);
      if (el) el.value = obj[k];
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

  window.UI = { toast, formToObject, setForm, clearForm };
})();
