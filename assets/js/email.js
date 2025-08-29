// Email helper. Uses EmailJS if configured; otherwise stores in Firestore 'emails' outbox.
(function(){
  const cfg = window.AppConfig?.email?.emailjs || {};
  const defaultFromEmail = window.AppConfig?.email?.from || 'sandeshkadel2474@gmail.com';
  let emailjsLoaded = false;

  async function ensureEmailJs(){
    if (emailjsLoaded) return true;
    if (!cfg?.publicKey || !cfg?.serviceId || !cfg?.templateId) return false;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    }).catch(()=>{});
    try { window.emailjs?.init({ publicKey: cfg.publicKey }); emailjsLoaded = true; } catch { emailjsLoaded = false; }
    return emailjsLoaded;
  }

  async function sendEmail(to, subject, html, meta={}){
    const ok = await ensureEmailJs();
    const from_email = meta.from_email || defaultFromEmail;
    const from_name = meta.from_name || 'Hack Club';
    const to_name = meta.to_name || '';

    if (ok) {
      try {
        await window.emailjs.send(cfg.serviceId, cfg.templateId, {
          to_email: to,
          to_name,
          subject,
          message_html: html,
          from_name,
          from_email
        });
        return { ok:true, sent:true };
      } catch (e) {
        console.warn('EmailJS send failed; queueing instead:', e);
      }
    }
    try {
      await window.StorageAPI.pushEmail({ to, subject, html, meta: { from_email, from_name, to_name }, status:'queued' });
      return { ok:true, sent:false, queued:true };
    } catch (e) {
      console.error('pushEmail failed:', e);
      return { ok:false, error: e?.message || String(e) };
    }
  }

  window.Emailer = { sendEmail };
})();
