// Minimal UI helpers: toast, escape, navbar toggle, sortable
(function(){
  const UI = {
    escape(s){
      return String(s ?? '').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
    },
    year(){ try{ const y = document.getElementById('year'); if (y) y.textContent = String(new Date().getFullYear()); }catch{} },
    nav(){
      try{
        const btn = document.querySelector('.nav-toggle');
        const links = document.querySelector('.nav-links');
        btn?.addEventListener('click', ()=> links?.classList.toggle('open'));
      }catch{}
    },
    toast(msg, type='info'){
      try{
        const el = document.getElementById('toast');
        if (!el) { alert(msg); return; }
        el.textContent = msg;
        el.classList.add('show');
        el.style.background = type==='error' ? '#7f1d1d' : type==='success' ? '#14532d' : '#1e293b';
        setTimeout(()=> el.classList.remove('show'), 1800);
      }catch{ alert(msg); }
    },
    sortable(container, onDone){
      if (!container) return;
      let dragEl = null;
      container.addEventListener('dragstart', e=>{
        const card = e.target.closest('[data-id]');
        if (!card) return;
        dragEl = card;
        card.classList.add('dragging');
      });
      container.addEventListener('dragend', e=>{
        const card = e.target.closest('[data-id]');
        if (!card) return;
        card.classList.remove('dragging');
        const ids = [...container.querySelectorAll('[data-id]')].map(n=>n.getAttribute('data-id'));
        onDone?.(ids);
        dragEl = null;
      });
      container.addEventListener('dragover', (e)=>{
        e.preventDefault();
        const after = getDragAfterElement(container, e.clientY);
        if (!dragEl) return;
        if (after == null) container.appendChild(dragEl);
        else container.insertBefore(dragEl, after);
      });
      function getDragAfterElement(container, y){
        const els = [...container.querySelectorAll('[data-id]:not(.dragging)')];
        return els.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height/2;
          if (offset < 0 && offset > closest.offset) return { offset, element: child };
          else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
      }
    }
  };
  window.UI = UI;
  document.addEventListener('DOMContentLoaded', ()=> { UI.nav(); UI.year(); });
})();
