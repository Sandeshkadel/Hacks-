// Saves registration to Firestore with Nepal phone validation and emails the applicant.
(function(){
  const S = window.StorageAPI;

  function isNepalPhone(p){
    const s = String(p||'').replace(/\s+/g,'');
    return /^((\+?977-?)?(98|97)\d{8}|0(98|97)\d{8})$/.test(s);
  }
  function setMsg(el, text, type){ el.textContent = text || ''; el.className = 'msg ' + (type || 'muted'); }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('join-form');
    if (!form) return;
    const btn = document.getElementById('join-btn');
    const msg = document.getElementById('join-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data?.name || !data?.email) return setMsg(msg, 'Please enter your name and email', 'error');
      if (!isNepalPhone(data.phone)) return setMsg(msg, 'Please enter a valid Nepal phone number', 'error');

      try {
        btn.disabled = true; btn.textContent = 'Submitting…';
        await S.addMember({
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          interests: data.interests || '',
          skills: data.skills || '',
          status: 'pending'
        });
        setMsg(msg, 'Thanks for registering! We will inform you later via email.', 'success');
        form.reset();

        // Confirmation email to registrant
        const subject = 'Hack Club registration received';
        const html = `<p>Namaste ${data.name},</p><p>Thanks for registering with Hack Club! Your application is under review. We will inform you later.</p>`;
        try {
          await window.Emailer?.sendEmail(
            data.email,
            subject,
            html,
            { to_name: data.name, from_name: 'Hack Club', from_email: 'sandeshkadel2474@gmail.com' }
          );
        } catch {}
      } catch (err){
        console.error(err);
        setMsg(msg, err?.message || 'Submission failed', 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Submit';
      }
    });
  });
})();
