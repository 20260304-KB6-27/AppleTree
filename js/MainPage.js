const EXP_PER_LEVEL = 300;
const MAX_LEVEL = 3;

const progress = document.getElementById('progress');
const levelBtn = document.getElementById('levelBtn');
const bg = document.getElementById('bg');
const character = document.getElementById('character');

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

  /* progress */
  const percent = Math.min((exp / EXP_PER_LEVEL) * 100, 100);
  progress.style.width = percent + '%';

  /* LEVEL UP 버튼 조건 */
  if (level >= MAX_LEVEL) {
    levelBtn.disabled = true;
  } else {
    levelBtn.disabled = exp < EXP_PER_LEVEL;
  }

  /* 이미지 변경 */
  bg.src = `/assets/image/bg-level${level}.png`;
  character.src = `/assets/image/character-level${level}.png`;
}

/* ---------------------- */
/* 레벨업 */
/* ---------------------- */

levelBtn.addEventListener('click', () => {
  let level = getLevel();
  let exp = getExp();

  if (level >= MAX_LEVEL) return;

  if (exp >= EXP_PER_LEVEL) {
    exp -= EXP_PER_LEVEL;
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
