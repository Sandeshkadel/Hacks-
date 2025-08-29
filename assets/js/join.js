// Handles Join form: saves member as 'pending' in Firestore and emails "we'll inform you later".
(function(){
  const S = window.StorageAPI;

  function setMsg(el, text, type){ el.textContent = text || ''; el.className = 'msg ' + (type || 'muted'); }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('join-form');
    if (!form) return;
    const btn = document.getElementById('join-btn');
    const msg = document.getElementById('join-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data?.name || !data?.email) return setMsg(msg, 'Please enter name and email', 'error');
      try {
        btn.disabled = true; btn.textContent = 'Submitting…';
        const res = await S.addMember({ name: data.name, email: data.email, grade: data.grade || '', interests: data.interests || '', message: data.message || '' });
        setMsg(msg, 'Thanks for registering! We will inform you later via email.', 'success');
        form.reset();

        // Send confirmation email to registrant
        const subject = 'Hack Club registration received';
        const html = `<p>Hi ${data.name},</p><p>Thanks for registering with Hack Club! Your application is under review. We will inform you later.</p>`;
        try { await window.Emailer?.sendEmail(data.email, subject, html, { to_name: data.name }); } catch {}
      } catch (err){
        console.error(err);
        setMsg(msg, err?.message || 'Submission failed', 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Submit';
      }
    });
  });
})();
