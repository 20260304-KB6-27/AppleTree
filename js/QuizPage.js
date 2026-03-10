const QUIZ_TIME = 60;
const QUESTION_COUNT = 10;
const DATA_PATH = '../assets/quiz_problem/quiz_data.json';

const state = {
    quizData: [],
    selectedQuestions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    timeLeft: QUIZ_TIME,
    timerId: null,
};

const elements = {
    timer: document.getElementById('timer'),
    questionNumber: document.getElementById('questionNumber'),
    questionText: document.getElementById('questionText'),
    answerArea: document.getElementById('answerArea'),
    progressText: document.getElementById('progressText'),
    nextBtn: document.getElementById('nextBtn'),
    finishBtn: document.getElementById('finishBtn'),
    timerAudio: document.getElementById('quizAudio'),
};

// 퀴즈 데이터 불러오기
async function loadQuizData() {
    try {
        const response = await fetch(DATA_PATH);

        if (!response.ok) {
            throw new Error('문제 데이터 불러오기 실패');
        }

        const data = await response.json();
        state.quizData = data;

        initQuiz();
    } catch (error) {
        console.error(error);
        elements.questionText.textContent = '문제 데이터 불러오기 실패';
    }
}

// 퀴즈 시작
function initQuiz() {
    state.selectedQuestions = getRandomQuestions(
        state.quizData,
        QUESTION_COUNT,
    );
    state.currentQuestionIndex = 0;
    state.timeLeft = QUIZ_TIME;

    state.userAnswers = state.selectedQuestions.map((question) => ({
        questionId: question.id,
        userAnswer: null,
    }));

    renderQuestion();
    startTimer();
}

function getRandomQuestions(data, count) {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function getCurrentQuestion() {
    return state.selectedQuestions[state.currentQuestionIndex];
}

// 문제 렌더링
function renderQuestion() {
    const currentQuestion = getCurrentQuestion();

    elements.questionNumber.textContent = `Q. ${state.currentQuestionIndex + 1}`;
    elements.questionText.textContent = currentQuestion.question;
    elements.progressText.textContent = `${state.currentQuestionIndex + 1} / ${state.selectedQuestions.length}`;

    renderAnswerArea(currentQuestion);
    updateButtonUI();
}

function renderAnswerArea(question) {
    elements.answerArea.innerHTML = '';

    if (question.type === 'ox') {
        renderOxQuestion(question);
    } else {
        renderMultipleQuestion(question);
    }
}

// OX 문제
function renderOxQuestion(question) {
    const savedAnswer =
        state.userAnswers[state.currentQuestionIndex].userAnswer;

    question.options.forEach((option) => {
        const button = createButton('ox-btn', option);

        if (savedAnswer === option) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            saveAnswer(option);
            clearSelected('.ox-btn');
            button.classList.add('selected');
        });
        elements.answerArea.appendChild(button);
    });
}

function renderMultipleQuestion(question) {
    const savedAnswer =
        state.userAnswers[state.currentQuestionIndex].userAnswer;

    question.options.forEach((option, index) => {
        const button = createButton('option-btn', `${index + 1}. ${option}`);

        if (savedAnswer === index) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            saveAnswer(index);
            clearSelected('.option-btn');
            button.classList.add('selected');
        });
        elements.answerArea.appendChild(button);
    });
}

// 버튼 생성
function createButton(className, text) {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = text;
    button.type = 'button';
    return button;
}

function clearSelected(selector) {
    document.querySelectorAll(selector).forEach((btn) => {
        btn.classList.remove('selected');
    });
}

// 답 저장
function saveAnswer(answer) {
    state.userAnswers[state.currentQuestionIndex].userAnswer = answer;
}

// 버튼 UI
function updateButtonUI() {
    const isLastQuestion =
        state.currentQuestionIndex === state.selectedQuestions.length - 1;

    if (isLastQuestion) {
        elements.nextBtn.classList.add('hidden');
        elements.finishBtn.classList.remove('hidden');
    } else {
        elements.nextBtn.classList.remove('hidden');
        elements.finishBtn.classList.add('hidden');
    }
}

function nextQuestion() {
    if (state.currentQuestionIndex < state.selectedQuestions.length - 1) {
        state.currentQuestionIndex++;
        renderQuestion();
    }
}

// 오디오
function startAudio() {
    if (!elements.timerAudio) return;

    elements.timerAudio.loop = true;
    elements.timerAudio.volume = 0.5;

    elements.timerAudio.play().catch(() => {
        console.log('오디오 재생 안 됨');
    });
}

function stopAudio() {
    if (!elements.timerAudio) return;

    elements.timerAudio.pause();
    elements.timerAudio.currentTime = 0;
}

// 타이머
function startTimer() {
    stopTimer();
    startAudio();
    updateTimer();

    state.timerId = setInterval(() => {
        state.timeLeft--;
        updateTimer();

        if (state.timeLeft <= 0) {
            finishQuiz();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
}

function updateTimer() {
    const minutes = String(Math.floor(state.timeLeft / 60)).padStart(2, '0');
    const seconds = String(state.timeLeft % 60).padStart(2, '0');
    elements.timer.textContent = `${minutes}:${seconds}`;
}

// 정답 계산
function getCorrectIndex(question) {
    if (question.type === 'ox') return question.answer;

    return question.answer - 1;
}

function isCorrect(question, userAnswer) {
    const correct = getCorrectIndex(question);
    return userAnswer === correct;
}

// 결과 저장
function getWrongIds() {
    return state.selectedQuestions
        .filter((q, i) => {
            const userAnswer = state.userAnswers[i].userAnswer;
            return !isCorrect(q, userAnswer);
        })
        .map((question) => question.id);
}

function saveResult() {
    const wrongIds = getWrongIds();
    const timeSpent = QUIZ_TIME - state.timeLeft;

    localStorage.setItem('wrongIds', JSON.stringify(wrongIds));
    localStorage.setItem('userAnswers', JSON.stringify(state.userAnswers));
    localStorage.setItem('timeSpent', timeSpent);
}

// 종료
function finishQuiz() {
    stopTimer();
    stopAudio();
    saveResult();

    window.location.href = 'ResultPage.html';
}

// 이벤트
elements.nextBtn.addEventListener('click', nextQuestion);
elements.finishBtn.addEventListener('click', finishQuiz);

loadQuizData();
