// Minimal, safe background animation (no-op if canvas missing)
(function(){
  const c = document.getElementById('bg-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  function resize(){ c.width = innerWidth; c.height = innerHeight; }
  window.addEventListener('resize', resize); resize();
  let t = 0;
  function draw(){
    if (!ctx) return;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.strokeStyle = 'rgba(122,92,255,0.15)';
    ctx.beginPath();
    for (let i=0;i<50;i++){
      const x = (i/50)*c.width;
      const y = c.height/2 + Math.sin((i/5)+t)*30;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    t += 0.02;
    requestAnimationFrame(draw);
  }
  draw();
})();
