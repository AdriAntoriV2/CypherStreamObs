(() => {
  // URL options for the OBS Browser Source:
  //   ?motion=off      disable all animation
  //   ?guides=off      hide labels and the VTube box once everything is placed
  //   ?density=1.5     scale particle count (default 1)
  //   ?bpm=128         pulse tempo (default 128)
  const params = new URLSearchParams(window.location.search);
  const root = document.documentElement;

  if (params.get('motion') === 'off') root.classList.add('motion-off');
  if (params.get('guides') === 'off') root.classList.add('guides-off');
  const still = root.classList.contains('motion-off') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.getElementById('fx');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const COLORS = ['#4455dd', '#88dd44', '#ee1166', '#ff9900', '#884499', '#33ccbb', '#ffffff'];
  const SHAPES = ['sparkle', 'note', 'ring', 'diamond', 'triangle', 'dot'];
  const density = Math.max(0.2, Math.min(3, parseFloat(params.get('density')) || 1));
  const bpm = Math.max(40, Math.min(220, parseFloat(params.get('bpm')) || 128));
  const beatMs = 60000 / bpm;
  const COUNT = Math.round(70 * density);

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function spawn(initial) {
    return {
      shape: pick(SHAPES),
      color: pick(COLORS),
      x: rand(0, W),
      y: initial ? rand(0, H) : H + rand(20, 120),
      size: rand(8, 30),
      vy: rand(16, 60),            // px/sec upward
      sway: rand(10, 45),
      swaySpeed: rand(0.4, 1.4),
      phase: rand(0, Math.PI * 2),
      rot: rand(0, Math.PI * 2),
      vr: rand(-1.2, 1.2),
      twinkle: rand(1.5, 4),
      alpha: rand(0.35, 0.9)
    };
  }

  // Shape painters: each draws centred on (0,0) within radius s.
  const paint = {
    sparkle(s) {
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s * 0.9, 0);
      ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s * 0.9, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill();
    },
    note(s) {
      ctx.beginPath(); ctx.ellipse(-s * 0.3, s * 0.6, s * 0.45, s * 0.3, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(s * 0.06, -s * 0.9, s * 0.14, s * 1.55);
      ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.9);
      ctx.quadraticCurveTo(s * 0.95, -s * 0.5, s * 0.55, 0);
      ctx.quadraticCurveTo(s * 0.8, -s * 0.5, s * 0.2, -s * 0.5); ctx.fill();
    },
    ring(s) { ctx.lineWidth = Math.max(2, s * 0.18); ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2); ctx.stroke(); },
    diamond(s) { ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.65, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.65, 0); ctx.closePath(); ctx.fill(); },
    triangle(s) {
      ctx.lineWidth = Math.max(2, s * 0.16); ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(s * 0.8, s * 0.6); ctx.lineTo(-s * 0.8, s * 0.6); ctx.closePath(); ctx.stroke();
    },
    dot(s) { ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2); ctx.fill(); }
  };
  const stroked = new Set(['ring', 'triangle']);

  const particles = Array.from({ length: COUNT }, () => spawn(true));

  function draw(p, t, beat) {
    const twinkle = 0.65 + 0.35 * Math.sin(t * p.twinkle + p.phase);
    const x = p.x + Math.sin(t * p.swaySpeed + p.phase) * p.sway;
    const s = p.size * (1 + beat * 0.18);
    ctx.save();
    ctx.translate(x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha * twinkle;
    ctx.fillStyle = ctx.strokeStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12 + beat * 10;
    paint[p.shape](s);
    ctx.restore();
  }

  // Shockwave rings pulsing from the stage floor on each bar (4 beats)
  const waves = [];
  let lastBeatIdx = -1;

  let dt = 1 / 60, prev = performance.now();

  function frame(now) {
    dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    const t = now / 1000;
    const beatPos = (now % beatMs) / beatMs;
    const beat = Math.pow(1 - beatPos, 3);                  // sharp attack, smooth decay
    root.style.setProperty('--beat', beat.toFixed(3));

    const beatIdx = Math.floor(now / beatMs);
    if (beatIdx !== lastBeatIdx) {
      lastBeatIdx = beatIdx;
      if (beatIdx % 4 === 0) waves.push({ born: now, color: pick(COLORS.slice(0, 6)) });
    }

    ctx.clearRect(0, 0, W, H);

    for (let i = waves.length - 1; i >= 0; i--) {
      const age = (now - waves[i].born) / (beatMs * 3);
      if (age >= 1) { waves.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = (1 - age) * 0.35;
      ctx.strokeStyle = waves[i].color;
      ctx.lineWidth = 6 * (1 - age) + 1;
      ctx.beginPath();
      ctx.ellipse(W / 2, H + 40, 200 + age * 1500, 80 + age * 520, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of particles) {
      p.y -= p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y < -60) Object.assign(p, spawn(false));
      draw(p, t, beat);
    }
    requestAnimationFrame(frame);
  }

  if (still) {
    particles.forEach((p) => draw(p, 0, 0)); // one static frame
  } else {
    requestAnimationFrame(frame);
  }
})();
