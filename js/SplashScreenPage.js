const loadingFill = document.getElementById('loading-fill');
const loadingPercent = document.getElementById('loading-percent');
const startBtn = document.getElementById('start-btn');

let percent = 0;

// 로딩 퍼센트 연출
const loadingTimer = setInterval(() => {
  const step = Math.random() * 7 + 2;
  percent += step;

  if (percent >= 100) {
    percent = 100;
    clearInterval(loadingTimer);

    startBtn.classList.remove('hidden');
    startBtn.classList.add('show');
  }

  loadingFill.style.width = `${percent}%`;
  loadingPercent.textContent = `${Math.floor(percent)}%`;
}, 120);

// 시작 버튼 클릭
startBtn.addEventListener('click', () => {
  document.body.style.transition = 'opacity 0.5s ease';
  document.body.style.opacity = '0';

  setTimeout(() => {
    // 실제 메인 페이지 경로로 변경
    window.location.href = 'MainPage.html';
  }, 500);
});

/* ---------------------------
   파티클 캔버스
---------------------------- */
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let w = 0;
let h = 0;

function resizeCanvas() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}

function createParticles() {
  particles = [];
  const count = Math.min(90, Math.floor(window.innerWidth / 18));

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.5 + 0.8,
      speedY: Math.random() * 0.7 + 0.2,
      speedX: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.6 + 0.2,
    });
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, w, h);

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 222, 120, ${p.alpha})`;
    ctx.fill();

    p.y -= p.speedY;
    p.x += p.speedX;

    if (p.y < -10) {
      p.y = h + 10;
      p.x = Math.random() * w;
    }

    if (p.x < -10) p.x = w + 10;
    if (p.x > w + 10) p.x = -10;
  }

  requestAnimationFrame(drawParticles);
}

resizeCanvas();
createParticles();
drawParticles();

window.addEventListener('resize', () => {
  resizeCanvas();
  createParticles();
});
