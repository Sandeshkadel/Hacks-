// Zoom integration placeholder (requires server-side token generation)
(function(){
  async function createMeeting(details){
    const cfg = window.AppConfig?.zoom;
    if (!cfg?.enabled) {
      console.warn('Zoom disabled, returning mock link');
      return { join_url: 'https://zoom.us/j/000000000' };
    }
    const res = await fetch(`${cfg.apiBase}/create`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(details)
    });
    if (!res.ok) throw new Error('Zoom API error');
    return await res.json();
  }
  window.ZoomAPI = { createMeeting };
})();