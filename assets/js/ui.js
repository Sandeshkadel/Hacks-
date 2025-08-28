(function(){
  const toastEl = document.getElementById('toast');
  function toast(msg, type){
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.background = type==='error' ? '#7f1d1d' : type==='success' ? '#065f46' : '#1e293b';
    toastEl.classList.add('show');
    setTimeout(()=> toastEl.classList.remove('show'), 2200);
  }
  function escape(str){ return (str||'').replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[s])); }
  function openModal(innerHTML){
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    if (!modal || !body) return;
    body.innerHTML = innerHTML;
    modal.classList.remove('hidden');
  }
  function closeModal(){
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
  }
  function sortable(container, onOrder){
    let drag;
    container.addEventListener('dragstart', e => {
      drag = e.target.closest('[data-id]');
      if (drag) e.dataTransfer.effectAllowed='move';
    });
    container.addEventListener('dragover', e=>{
      e.preventDefault();
      const cur = e.target.closest('[data-id]');
      if (!drag || !cur || cur===drag) return;
      const rect = cur.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height/2;
      cur.parentNode.insertBefore(drag, before ? cur : cur.nextSibling);
    });
    container.addEventListener('drop', ()=>{
      drag = null;
      const ids = [...container.querySelectorAll('[data-id]')].map(el=>el.dataset.id);
      onOrder(ids);
    });
  }
  function nav(){
    const btn = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    btn?.addEventListener('click', ()=> links?.classList.toggle('open'));
  }
  function year(){ const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear(); }
  window.UI = { toast, escape, openModal, closeModal, sortable, nav, year };
})();