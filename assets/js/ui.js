// Minimal UI helpers: toast, escape, navbar toggle, year, modal, sortable
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
        setTimeout(()=> el.classList.remove('show'), 2000);
      }catch{ alert(msg); }
    },
    openModal(html){
      let m = document.getElementById('modal');
      let body = document.getElementById('modal-body');
      if (!m){
        m = document.createElement('div'); m.id='modal'; m.className='modal';
        m.innerHTML = `<div class="modal-content card"><button class="modal-close" aria-label="Close">&times;</button><div id="modal-body"></div></div>`;
        document.body.appendChild(m);
      }
      body = document.getElementById('modal-body');
      if (body) body.innerHTML = html;
      m.classList.remove('hidden');
      m.addEventListener('click', (e)=>{ if (e.target.id==='modal' || e.target.classList.contains('modal-close')) UI.closeModal(); }, { once:true });
    },
    closeModal(){ document.getElementById('modal')?.classList.add('hidden'); },
    // Basic sortable using HTML5 drag/drop. Container must have children with [data-id]
    sortable(container, onDone){
      if (!container) return;
      let dragEl = null;
      container.querySelectorAll('[data-id]').forEach(card => {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', ()=> { dragEl = card; card.classList.add('dragging'); });
        card.addEventListener('dragend', ()=> { card.classList.remove('dragging'); dragEl = null; const ids = [...container.querySelectorAll('[data-id]')].map(n=>n.getAttribute('data-id')); onDone?.(ids); });
      });
      container.addEventListener('dragover', (e)=>{
        e.preventDefault();
        const after = getDragAfterElement(container, e.clientY);
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
