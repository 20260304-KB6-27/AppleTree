const questionDiv = document.getElementById('question');
const optionsDiv = document.getElementById('options');
const explanationDiv = document.getElementById('explanation');
const wrongIndicator = document.getElementById('wrong-indicator');

/* 틀린 문제 id */
const wrongIds = [1, 58, 185];

let currentIndex = 0;
let problems = [];

/* 레벨 배경 적용 */
function applyLevelBackground() {
  let level = parseInt(localStorage.getItem('level')) || 1;

  if (level < 1 || level > 3) {
    level = 1;
  }

  const quizPage = document.querySelector('.quiz-page');

  if (quizPage) {
    quizPage.classList.add(`level${level}`);
  }
}

/* 문제 불러오기 */
async function loadProblems() {
  const res = await fetch('../assets/problem/problem.json');
  return await res.json();
}

/* 문제 출력 */
function renderQuestion(q) {
  questionDiv.textContent = `Q. ${q.question}`;
  optionsDiv.innerHTML = '';

  /* OX 문제 */
  if (q.type === 'ox') {
    const btn = document.createElement('button');
    btn.className = 'option-btn correct';
    btn.textContent = `정답: ${q.answer}`;

    optionsDiv.appendChild(btn);
  } else {
    /* 객관식 */
    q.options.forEach((opt, index) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';

      btn.textContent = `${index + 1}. ${opt}`;

      if (index + 1 === q.answer) {
        btn.classList.add('correct');
      }

      optionsDiv.appendChild(btn);
    });
  }

  /* 해설 */
  explanationDiv.textContent = q.explanation ?? '';
}

/* 동그라미 표시 */
function renderWrongCircles() {
  wrongIndicator.innerHTML = '';

  wrongIds.forEach((id, index) => {
    /* 6번째부터 줄바꿈 */
    if (index === 5) {
      const breakLine = document.createElement('div');
      breakLine.style.flexBasis = '100%';
      wrongIndicator.appendChild(breakLine);
    }

    const circle = document.createElement('div');

    circle.className = 'circle';
    circle.textContent = index + 1;

    if (index === currentIndex) {
      circle.classList.add('active');
    }

    circle.onclick = () => {
      currentIndex = index;
      showCurrentProblem();
    };

    wrongIndicator.appendChild(circle);
  });
}

/* 문제 보여주기 */
function showCurrentProblem() {
  const id = wrongIds[currentIndex];

  const q = problems.find((p) => p.id === id);

  if (!q) {
    console.error('문제 없음:', id);
    return;
  }

  renderQuestion(q);
  renderWrongCircles();
}

/* 메인 이동 */
document.querySelector('.home-btn').onclick = () => {
  window.location.href = '../index.html';
};

/* 초기 실행 */
async function init() {
  applyLevelBackground();

  problems = await loadProblems();

  showCurrentProblem();
}

init();
