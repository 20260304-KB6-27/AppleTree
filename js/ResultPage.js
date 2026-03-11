// Centralized game balance config. Change only this block to rebalance.
const GAME_BALANCE = {
  stages: 3,
  stageNames: {
    1: '학생',
    2: '직원',
    3: '지점장',
  },
  expToNextStage: {
    1: 300,
    2: 500,
  },
  // Background image by stage.
  tierBackgroundFiles: {
    1: 'assets/image/bg-level1.png',
    2: 'assets/image/bg-level2.png',
    3: 'assets/image/bg-level3.png',
  },
  quiz: {
    questionsPerRound: 10,
    scorePerCorrect: 10,
    timeLimitSeconds: 60,
  },
};

const STORAGE_KEYS = {
  // MainPage keys
  level: 'level',
  exp: 'exp',

  // QuizPage keys
  wrongIds: 'wrongIds',
  userAnswers: 'userAnswers',
  timeSpent: 'timeSpent',

  // Result summary keys (overwritten in ResultPage)
  quizCorrect: 'quizCorrect',
  quizTotal: 'quizTotal',
  earnedExp: 'earnedExp',
  spentTime: 'spentTime',
  wrongQuestionNumbers: 'wrongQuestionNumbers',
  correctCount: 'correctCount',
  totalQuestions: 'totalQuestions',
  requiredExp: 'requiredExp',

  // Route keys
  reviewUrl: 'reviewUrl',
  mainUrl: 'mainUrl',
};

const ROUTE_PAGES = {
  review: 'ExplainPage.html',
  main: 'MainPage.html',
};

const MAX_GAIN_PER_ROUND =
  GAME_BALANCE.quiz.questionsPerRound * GAME_BALANCE.quiz.scorePerCorrect;
const QUIZ_TIME_LIMIT_SECONDS = GAME_BALANCE.quiz.timeLimitSeconds;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatTime = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
};

const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage write errors (private mode, quota, etc).
  }
};

const removeStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage remove errors.
  }
};

const parseJsonArray = (value) => {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseWrongIds = (rawValue) => {
  const parsed = parseJsonArray(rawValue);
  const normalized = parsed
    .map((item) => Number(item))
    .filter((num) => Number.isFinite(num))
    .map((num) => Math.trunc(num))
    .filter((num) => num >= 1);

  return [...new Set(normalized)];
};

const getStageName = (stage) =>
  GAME_BALANCE.stageNames[stage] ?? `${stage}단계`;

const getRequiredExpForLevel = (level) =>
  clamp(toNumber(GAME_BALANCE.expToNextStage[level], 0), 0, 9999);

const getStageKey = (stage) => {
  if (stage === 1) return 'student';
  if (stage === 2) return 'staff';
  return 'manager';
};

const getAssetPrefix = () =>
  window.location.pathname.includes('/html/') ? '../' : './';

const getTierBackgroundUrl = (stage) => {
  const imagePath =
    GAME_BALANCE.tierBackgroundFiles[stage] ??
    GAME_BALANCE.tierBackgroundFiles[1];
  return `${getAssetPrefix()}${imagePath}`;
};

const applyTierBackground = (stage) => {
  const safeStage = clamp(toNumber(stage, 1), 1, GAME_BALANCE.stages);
  const bgUrl = getTierBackgroundUrl(safeStage);
  const body = document.body;

  if (body) {
    body.dataset.tier = getStageKey(safeStage);
    body.dataset.tierBg = bgUrl;
  }

  document.documentElement.style.setProperty(
    '--tier-bg-image',
    `url("${bgUrl}")`,
  );
};

const getPageRoute = (pageFile) => {
  const isInsideHtmlDir = window.location.pathname.includes('/html/');
  return isInsideHtmlDir ? `./${pageFile}` : `./html/${pageFile}`;
};

const getDefaultRoutes = () => ({
  review: getPageRoute(ROUTE_PAGES.review),
  main: getPageRoute(ROUTE_PAGES.main),
});

const normalizeRoute = (value, pageFile) => {
  const fallback = getPageRoute(pageFile);

  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.includes(pageFile)) return fallback;

  return fallback;
};

const resolveResultData = () => {
  const defaultRoutes = getDefaultRoutes();

  const rawLevel = readStorage(STORAGE_KEYS.level);
  const rawExp = readStorage(STORAGE_KEYS.exp);

  const rawWrongIds = readStorage(STORAGE_KEYS.wrongIds);
  const rawUserAnswers = readStorage(STORAGE_KEYS.userAnswers);
  const rawTimeSpent = readStorage(STORAGE_KEYS.timeSpent);

  const wrongIds = parseWrongIds(rawWrongIds);
  const userAnswers = parseJsonArray(rawUserAnswers);

  const level = clamp(toNumber(rawLevel, 1), 1, GAME_BALANCE.stages);
  const expBefore = clamp(toNumber(rawExp, 0), 0, 9999);
  // Quiz payload exists when QuizPage just finished this round.
  // Use userAnswers/timeSpent presence to avoid re-applying on Result refresh.
  const hasQuizPayload = rawUserAnswers !== null || rawTimeSpent !== null;

  let total;
  let wrongCount;
  let correct;
  let earnedExp;
  let durationSeconds;

  if (hasQuizPayload) {
    total = clamp(
      userAnswers.length > 0
        ? userAnswers.length
        : toNumber(
            readStorage(STORAGE_KEYS.quizTotal),
            GAME_BALANCE.quiz.questionsPerRound,
          ),
      1,
      GAME_BALANCE.quiz.questionsPerRound,
    );
    wrongCount = clamp(wrongIds.length, 0, total);
    correct = total - wrongCount;
    earnedExp = clamp(
      correct * GAME_BALANCE.quiz.scorePerCorrect,
      0,
      MAX_GAIN_PER_ROUND,
    );
    durationSeconds = clamp(
      toNumber(rawTimeSpent, 0),
      0,
      QUIZ_TIME_LIMIT_SECONDS,
    );
  } else {
    total = clamp(
      toNumber(
        readStorage(STORAGE_KEYS.quizTotal),
        GAME_BALANCE.quiz.questionsPerRound,
      ),
      1,
      GAME_BALANCE.quiz.questionsPerRound,
    );
    correct = clamp(
      toNumber(readStorage(STORAGE_KEYS.quizCorrect), total),
      0,
      total,
    );
    wrongCount = clamp(
      wrongIds.length > 0 ? wrongIds.length : total - correct,
      0,
      total,
    );
    earnedExp = clamp(
      toNumber(
        readStorage(STORAGE_KEYS.earnedExp),
        correct * GAME_BALANCE.quiz.scorePerCorrect,
      ),
      0,
      MAX_GAIN_PER_ROUND,
    );
    durationSeconds = clamp(
      toNumber(readStorage(STORAGE_KEYS.spentTime), 0),
      0,
      QUIZ_TIME_LIMIT_SECONDS,
    );
  }

  const currentExp = clamp(
    hasQuizPayload ? expBefore + earnedExp : expBefore,
    0,
    9999,
  );

  // Always derive threshold from current level to avoid stale localStorage data.
  const requiredExp = getRequiredExpForLevel(level);

  const remainingExp =
    requiredExp > 0 ? clamp(requiredExp - currentExp, 0, requiredExp) : 0;

  return {
    level,
    total,
    correct,
    wrongCount,
    wrongIds,
    earnedExp,
    expMax: MAX_GAIN_PER_ROUND,
    currentExp,
    requiredExp,
    remainingExp,
    durationSeconds,
    spentTimeLabel: formatTime(durationSeconds),
    fromQuizPayload: hasQuizPayload,
    routes: {
      review:
        normalizeRoute(
          readStorage(STORAGE_KEYS.reviewUrl),
          ROUTE_PAGES.review,
        ) || defaultRoutes.review,
      main:
        normalizeRoute(readStorage(STORAGE_KEYS.mainUrl), ROUTE_PAGES.main) ||
        defaultRoutes.main,
    },
  };
};

const persistResult = (result) => {
  // MainPage state overwrite
  writeStorage(STORAGE_KEYS.level, result.level);
  writeStorage(STORAGE_KEYS.exp, result.currentExp);

  // Result summary overwrite
  writeStorage(STORAGE_KEYS.quizCorrect, result.correct);
  writeStorage(STORAGE_KEYS.correctCount, result.correct);
  writeStorage(STORAGE_KEYS.quizTotal, result.total);
  writeStorage(STORAGE_KEYS.totalQuestions, result.total);
  writeStorage(STORAGE_KEYS.earnedExp, result.earnedExp);
  writeStorage(STORAGE_KEYS.requiredExp, result.requiredExp);
  writeStorage(STORAGE_KEYS.timeSpent, result.durationSeconds);
  writeStorage(STORAGE_KEYS.spentTime, result.durationSeconds);

  const wrongIdsSerialized = JSON.stringify(result.wrongIds);
  writeStorage(STORAGE_KEYS.wrongIds, wrongIdsSerialized);
  writeStorage(STORAGE_KEYS.wrongQuestionNumbers, wrongIdsSerialized);

  // Keep route keys stable for anchor links.
  writeStorage(STORAGE_KEYS.reviewUrl, result.routes.review);
  writeStorage(STORAGE_KEYS.mainUrl, result.routes.main);

  if (result.fromQuizPayload) {
    removeStorage(STORAGE_KEYS.userAnswers);
    removeStorage(STORAGE_KEYS.timeSpent);
  }

  removeStorage('gameResult');
};

// Compatibility setter for pages/tests that still call window.setGameResult
const setGameResult = (partialResult = {}) => {
  if (partialResult.level !== undefined) {
    writeStorage(STORAGE_KEYS.level, partialResult.level);
  }

  if (partialResult.currentExp !== undefined) {
    writeStorage(STORAGE_KEYS.exp, partialResult.currentExp);
  }

  if (partialResult.correct !== undefined) {
    writeStorage(STORAGE_KEYS.quizCorrect, partialResult.correct);
  }

  if (partialResult.total !== undefined) {
    writeStorage(STORAGE_KEYS.quizTotal, partialResult.total);
  }

  if (partialResult.spentTime !== undefined) {
    writeStorage(STORAGE_KEYS.timeSpent, partialResult.spentTime);
    writeStorage(STORAGE_KEYS.spentTime, partialResult.spentTime);
  }

  if (partialResult.duration !== undefined) {
    writeStorage(STORAGE_KEYS.timeSpent, partialResult.duration);
    writeStorage(STORAGE_KEYS.spentTime, partialResult.duration);
  }

  if (partialResult.wrongIds !== undefined) {
    const serialized = JSON.stringify(partialResult.wrongIds);
    writeStorage(STORAGE_KEYS.wrongIds, serialized);
    writeStorage(STORAGE_KEYS.wrongQuestionNumbers, serialized);
  }

  if (partialResult.wrongQuestionNumbers !== undefined) {
    const serialized = JSON.stringify(partialResult.wrongQuestionNumbers);
    writeStorage(STORAGE_KEYS.wrongIds, serialized);
    writeStorage(STORAGE_KEYS.wrongQuestionNumbers, serialized);
  }

  return resolveResultData();
};

window.setGameResult = setGameResult;

const messageByAccuracy = (accuracy) => {
  if (accuracy === 100) return '완벽해요. 지점장 승진 준비 완료!';
  if (accuracy >= 80) return '훌륭해요. 안정적으로 개념을 잡았어요.';
  if (accuracy >= 60) return '좋아요. 오답노트를 보면 더 빨리 올라가요.';
  return '시작이 좋아요. 다시 도전하면 바로 성장합니다.';
};

const setRouteLink = (id, href, fallbackHref) => {
  const node = document.getElementById(id);
  if (!node) return;

  node.href = href || fallbackHref;
};

const setReviewLinkState = (href, fallbackHref, enabled) => {
  const node = document.getElementById('review-link');
  if (!node) return;

  if (enabled) {
    node.classList.remove('is-disabled');
    node.removeAttribute('aria-disabled');
    node.removeAttribute('tabindex');
    node.href = href || fallbackHref;
    return;
  }

  node.classList.add('is-disabled');
  node.setAttribute('aria-disabled', 'true');
  node.setAttribute('tabindex', '-1');
  node.removeAttribute('href');
};

const render = () => {
  const result = resolveResultData();
  persistResult(result);

  const accuracy = Math.round((result.correct / result.total) * 100);
  const defaults = getDefaultRoutes();

  applyTierBackground(result.level);

  const scoreRing = document.getElementById('score-ring');
  const accuracyText = document.getElementById('accuracy-text');
  const scoreText = document.getElementById('score-text');
  const scoreMaxText = document.getElementById('score-max-text');
  const correctCount = document.getElementById('correct-count');
  const totalCount = document.getElementById('total-count');
  const expText = document.getElementById('exp-text');
  const remainExpText = document.getElementById('remain-exp-text');
  const wrongText = document.getElementById('wrong-text');
  const timeText = document.getElementById('time-text');
  const messageText = document.getElementById('result-message');

  if (scoreRing) scoreRing.style.setProperty('--percent', String(accuracy));
  if (accuracyText) accuracyText.textContent = `${accuracy}%`;
  if (scoreText) scoreText.textContent = String(result.earnedExp);
  if (scoreMaxText) scoreMaxText.textContent = String(result.expMax);
  if (correctCount) correctCount.textContent = String(result.correct);
  if (totalCount) totalCount.textContent = String(result.total);

  if (expText) expText.textContent = `+${result.earnedExp} EXP`;

  if (remainExpText) {
    const nextLevel = Math.min(result.level + 1, GAME_BALANCE.stages);
    const nextStageName = getStageName(nextLevel);

    if (result.requiredExp === 0) {
      remainExpText.textContent = '최종 티어 달성';
    } else if (result.remainingExp === 0) {
      remainExpText.textContent = `${nextStageName}으로 승급 가능`;
    } else {
      remainExpText.textContent = `앞으로 ${result.remainingExp} EXP`;
    }
  }

  if (wrongText) wrongText.textContent = `${result.wrongCount}개`;
  if (timeText) timeText.textContent = result.spentTimeLabel;
  if (messageText) messageText.textContent = messageByAccuracy(accuracy);

  setReviewLinkState(
    result.routes.review,
    defaults.review,
    result.wrongCount > 0,
  );
  setRouteLink('main-link', result.routes.main, defaults.main);
};

render();
