// Simple interactive spider/network background on canvas
(function(){
  let canvas, ctx, w, h, points=[];
  const COUNT = 80, MAX_DIST = 130;

  function rand(a,b){ return Math.random()*(b-a)+a; }
  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  function init(){
    points = Array.from({length: COUNT}, ()=>({
      x: rand(0,w), y: rand(0,h), vx: rand(-0.6,0.6), vy: rand(-0.6,0.6)
    }));
  }
  function step(){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for(const p of points){
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>w) p.vx*=-1;
      if (p.y<0||p.y>h) p.vy*=-1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,229,255,0.15)';
    for(let i=0;i<points.length;i++){
      for(let j=i+1;j<points.length;j++){
        const a=points[i], b=points[j];
        const dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
        if (d<MAX_DIST){
          ctx.globalAlpha = 1 - (d/MAX_DIST);
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(step);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize(); init(); step();
    window.addEventListener('resize', ()=>{ resize(); init(); });
  });
})();