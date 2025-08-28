// Email API (mock by default, EmailJS optional)
(function(){
  async function send({to, subject, message}){
    const cfg = window.AppConfig?.email || {};
    if (cfg.enabled && cfg.provider === 'emailjs'){
      // Requires EmailJS SDK or direct fetch to their API with template.
      // Minimal demo using their REST endpoint is omitted for security.
      // Instead, record in outbox and warn:
      console.warn('EmailJS enabled but client REST not implemented. Falling back to outbox.');
    }
    window.StorageAPI.pushEmail({ to, subject, message });
    return true;
  }
  window.EmailAPI = { send };
})();