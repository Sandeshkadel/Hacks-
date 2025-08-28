// Simple mock email API with optional EmailJS integration
(function(){
  const cfg = window.AppConfig || {};
  async function sendViaEmailJS({ to, subject, message }){
    if (!cfg.email?.emailjs?.serviceId || !cfg.email?.emailjs?.templateId || !cfg.email?.emailjs?.publicKey) {
      throw new Error('EmailJS not configured');
    }
    // Example EmailJS client usage (pseudo; adapt if you include EmailJS SDK)
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        service_id: cfg.email.emailjs.serviceId,
        template_id: cfg.email.emailjs.templateId,
        user_id: cfg.email.emailjs.publicKey,
        template_params: { to, subject, message }
      })
    });
    if (!res.ok) throw new Error('EmailJS send failed');
    return true;
  }

  window.EmailAPI = {
    async send({ to, subject, message }){
      try {
        // Try EmailJS if configured
        await sendViaEmailJS({ to, subject, message });
      } catch {
        // Fallback: mock outbox
        window.StorageAPI?.pushEmail?.({ to, subject, message });
      }
      return true;
    }
  };
})();
