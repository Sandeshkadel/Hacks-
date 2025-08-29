// Email helper. Uses EmailJS if configured; otherwise queues to Firestore 'emails' for record.
(function(){
  const cfg = window.AppConfig?.email?.emailjs || {};
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
    if (ok) {
      try {
        await window.emailjs.send(cfg.serviceId, cfg.templateId, {
          to_email: to,
          subject,
          message_html: html,
          // extra fields if your template uses them:
          to_name: meta.to_name || '',
          from_name: meta.from_name || 'Hack Club'
        });
        return { ok:true, sent:true };
      } catch (e) {
        console.warn('EmailJS send failed; queueing instead:', e);
      }
    }
    // Fallback: store email in Firestore outbox for records
    try {
      await window.StorageAPI.pushEmail({ to, subject, html, meta, status:'queued' });
      return { ok:true, sent:false, queued:true };
    } catch (e) {
      console.error('pushEmail failed:', e);
      return { ok:false, error: e?.message || String(e) };
    }
  }

  window.Emailer = { sendEmail };
})();
