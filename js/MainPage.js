const MAX_LEVEL = 3; // 도달 가능한 최대 레벨

const progress = document.getElementById('progress');
const levelBtn = document.getElementById('levelBtn');
const bg = document.getElementById('bg');
const character = document.getElementById('character');
const levelText = document.getElementById('level-text');
const expText = document.getElementById('exp-text');

function getExpPerLevel(level) {
  if (level === 1) return 300; // 1 -> 2
  if (level === 2) return 500; // 2 -> 3
  return 0;
}

/* ---------------------- */
/* localStorage 초기값 */
/* ---------------------- */

if (!localStorage.getItem('level')) {
  localStorage.setItem('level', 1);
}

if (!localStorage.getItem('exp')) {
  localStorage.setItem('exp', 0);
}

/* ---------------------- */
/* 데이터 getter */
/* ---------------------- */

function getLevel() {
  return Number(localStorage.getItem('level'));
}

function getExp() {
  return Number(localStorage.getItem('exp'));
}

function setLevel(v) {
  localStorage.setItem('level', v);
}

function setExp(v) {
  localStorage.setItem('exp', v);
}

/* ---------------------- */
/* UI 업데이트 */
/* ---------------------- */

function updateUI() {
  const level = getLevel();
  const exp = getExp();
  const expNeeded = getExpPerLevel(level);

  /* level 표시 */
  levelText.textContent = `LEVEL ${level}`;

  if (level >= MAX_LEVEL) {
    progress.style.width = '100%';

    expText.textContent = `${exp} EXP`;

    levelBtn.disabled = true;
  } else {
    const percent = Math.min((exp / expNeeded) * 100, 100);
    progress.style.width = percent + '%';

    expText.textContent = `${Math.min(exp, expNeeded)} / ${expNeeded}`;
    levelBtn.disabled = exp < expNeeded;
  }

  bg.src = `/assets/image/bg-level${level}.png`;
  character.src = `/assets/image/character-level${level}.png`;
}

/* ---------------------- */
/* 레벨업 */
/* ---------------------- */

levelBtn.addEventListener('click', () => {
  let level = getLevel();
  let exp = getExp();
  const expNeeded = getExpPerLevel(level);

  if (level >= MAX_LEVEL) return;

  if (exp >= expNeeded) {
    exp -= expNeeded;
    level += 1;

    setLevel(level);
    setExp(exp);

    updateUI();
  }
});

/* ---------------------- */
/* 테스트용 exp 증가 (추후 삭제할 코드) */
/* ---------------------- */

document.getElementById('startBtn').addEventListener('click', () => {
  let level = getLevel();
  let exp = getExp();

  exp += 80;

  setExp(exp);
  updateUI();
});

/* 초기 렌더 */
updateUI();
