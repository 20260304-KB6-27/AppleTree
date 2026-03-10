// Centralized game balance config. Change only this block to rebalance.
const GAME_BALANCE = {
  // Number of character stages
  stages: 3,
  // Display name by stage
  stageNames: {
    1: '학생',
    2: '직원',
    3: '지점장',
  },
  // Required exp to move from current stage to next stage.
  // ex) 1: 300 means stage 1 -> 2 needs 300 exp.
  expToNextStage: {
    1: 300,
    2: 500,
  },

  // Background image by stage.
  // TODO: 2레벨, 3레벨 배경으로 수정
  tierBackgroundFiles: {
    1: 'assets/image/bg-level1.png',
    2: 'assets/image/bg-level1.png',
    3: 'assets/image/bg-level1.png',
  },
  quiz: {
    // One round quiz settings.
    questionsPerRound: 10,
    scorePerCorrect: 10,
    timeLimitSeconds: 60,
  },
};

const MAX_GAIN_PER_ROUND =
  GAME_BALANCE.quiz.questionsPerRound * GAME_BALANCE.quiz.scorePerCorrect;
const QUIZ_TIME_LIMIT_SECONDS = GAME_BALANCE.quiz.timeLimitSeconds;
const DEFAULT_CORRECT = Math.min(8, GAME_BALANCE.quiz.questionsPerRound);

// Fallback values used when localStorage payload is missing.
const DEFAULT_RESULT = {
  correct: DEFAULT_CORRECT,
  total: GAME_BALANCE.quiz.questionsPerRound,
  duration: QUIZ_TIME_LIMIT_SECONDS,
  earnedExp: DEFAULT_CORRECT * GAME_BALANCE.quiz.scorePerCorrect,
  exp: DEFAULT_CORRECT * GAME_BALANCE.quiz.scorePerCorrect,
  level: 1,
  currentExp: DEFAULT_CORRECT * GAME_BALANCE.quiz.scorePerCorrect,
};

const GAME_RESULT_STORAGE_KEY = 'gameResult';
const GAME_RESULT_SCHEMA_VERSION = 1;

const LEGACY_STORAGE_KEYS = {
  correct: ['quizCorrect', 'correctCount', 'correct'],
  total: ['quizTotal', 'totalQuestions', 'total'],
  wrongQuestionNumbers: [
    'wrongQuestionNumbers',
    'wrongQuestion',
    'wrongQuestionList',
    'incorrectQuestionNumbers',
    'wrongIndexes',
  ],
  spentTime: ['spentTime'],
  duration: ['quizDuration', 'elapsedTime', 'duration'],
  earnedExp: ['earnedExp', 'gainedExp'],
  level: ['level', 'stage', 'currentLevel'],
  currentExp: ['currentExp', 'levelExp', 'totalExp', 'playerExp', 'exp'],
  requiredExp: ['requiredExp', 'levelGoal', 'nextLevelExp'],
  reviewUrl: ['reviewUrl', 'wrongNoteUrl'],
  mainUrl: ['mainUrl', 'homeUrl'],
};

const getDefaultRoutes = () => {
  const isInsideHtmlDir = window.location.pathname.includes('/html/');
  const prefix = isInsideHtmlDir ? './' : './html/';
  return {
    review: `${prefix}ReviewPage.html`,
    main: `${prefix}MainPage.html`,
  };
};

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

const parseDurationToSeconds = (value, fallback = DEFAULT_RESULT.duration) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const matched = trimmed.match(/^(\d+):([0-5]\d)$/);
    if (matched) {
      const mm = Number(matched[1]);
      const ss = Number(matched[2]);
      return mm * 60 + ss;
    }
  }
  return toNumber(value, fallback);
};

const parseWrongQuestionNumbers = (value) => {
  if (value === undefined || value === null) return null;
  let source = value;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return null;
    try {
      source = JSON.parse(trimmed);
    } catch {
      source = trimmed.split(',');
    }
  }
  if (!Array.isArray(source)) return null;
  const normalized = source
    .map((item) => Number(item))
    .filter((num) => Number.isFinite(num))
    .map((num) => Math.trunc(num))
    .filter((num) => num >= 1);
  return [...new Set(normalized)];
};

const getStageName = (stage) =>
  GAME_BALANCE.stageNames[stage] ?? `${stage}단계`;

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

// Standard game result shape used across screens and localStorage.
const normalizeGameResult = (
  rawResult = {},
  defaultRoutes = getDefaultRoutes(),
) => {
  const level = clamp(
    toNumber(rawResult.level ?? rawResult.stage, DEFAULT_RESULT.level),
    1,
    GAME_BALANCE.stages,
  );
  const total = clamp(
    toNumber(rawResult.total, DEFAULT_RESULT.total),
    1,
    GAME_BALANCE.quiz.questionsPerRound,
  );
  const wrongQuestionNumbers = parseWrongQuestionNumbers(
    rawResult.wrongQuestionNumbers ??
      rawResult.wrongQuestion ??
      rawResult.wrongQuestionList ??
      rawResult.incorrectQuestionNumbers,
  );
  const wrongCountFromList =
    wrongQuestionNumbers !== null
      ? clamp(wrongQuestionNumbers.length, 0, total)
      : null;
  const correct = clamp(
    wrongCountFromList !== null
      ? total - wrongCountFromList
      : toNumber(rawResult.correct, DEFAULT_RESULT.correct),
    0,
    total,
  );
  // Earned exp is deterministic per round: correct answers * exp per correct answer.
  const earnedExp = clamp(
    correct * GAME_BALANCE.quiz.scorePerCorrect,
    0,
    MAX_GAIN_PER_ROUND,
  );
  const requiredExp = clamp(
    toNumber(
      rawResult.requiredExp ?? rawResult.levelGoal,
      GAME_BALANCE.expToNextStage[level] ?? 0,
    ),
    0,
    9999,
  );
  const currentExp = clamp(
    toNumber(
      rawResult.currentExp ??
        rawResult.levelExp ??
        rawResult.totalExp ??
        rawResult.exp,
      earnedExp,
    ),
    0,
    requiredExp > 0 ? requiredExp : 9999,
  );
  const remainingExp =
    requiredExp > 0 ? clamp(requiredExp - currentExp, 0, requiredExp) : 0;
  const wrongCount =
    wrongCountFromList !== null ? wrongCountFromList : total - correct;
  const duration = clamp(
    parseDurationToSeconds(
      rawResult.spentTime ?? rawResult.duration,
      DEFAULT_RESULT.duration,
    ),
    0,
    QUIZ_TIME_LIMIT_SECONDS,
  );

  return {
    schemaVersion: GAME_RESULT_SCHEMA_VERSION,
    level,
    currentExp,
    requiredExp,
    remainingExp,
    earnedExp,
    // Keep exp for backward compatibility with existing consumers.
    exp: earnedExp,
    correct,
    wrongQuestionNumbers,
    wrongCount,
    total,
    duration,
    spentTime: formatTime(duration),
    expMax: MAX_GAIN_PER_ROUND,
    routes: {
      review:
        rawResult.routes?.review ??
        rawResult.routes?.reviewUrl ??
        rawResult.reviewUrl ??
        defaultRoutes.review,
      main:
        rawResult.routes?.main ??
        rawResult.routes?.mainUrl ??
        rawResult.mainUrl ??
        defaultRoutes.main,
    },
  };
};

const saveGameResult = (rawResult, defaultRoutes = getDefaultRoutes()) => {
  const normalized = normalizeGameResult(rawResult, defaultRoutes);
  try {
    localStorage.setItem(GAME_RESULT_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage write errors (private mode, quota, etc).
  }
  return normalized;
};

const readResultFromStorage = () => {
  try {
    const raw = localStorage.getItem(GAME_RESULT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

// Compatibility layer: absorb legacy per-screen keys into the unified schema.
const readLegacyResultFromStorage = () => {
  const readFirst = (keys) => {
    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) return value;
      } catch {
        return null;
      }
    }
    return null;
  };

  return {
    correct: readFirst(LEGACY_STORAGE_KEYS.correct),
    total: readFirst(LEGACY_STORAGE_KEYS.total),
    wrongQuestionNumbers: readFirst(LEGACY_STORAGE_KEYS.wrongQuestionNumbers),
    spentTime: readFirst(LEGACY_STORAGE_KEYS.spentTime),
    duration: readFirst(LEGACY_STORAGE_KEYS.duration),
    earnedExp: readFirst(LEGACY_STORAGE_KEYS.earnedExp),
    level: readFirst(LEGACY_STORAGE_KEYS.level),
    currentExp: readFirst(LEGACY_STORAGE_KEYS.currentExp),
    requiredExp: readFirst(LEGACY_STORAGE_KEYS.requiredExp),
    routes: {
      review: readFirst(LEGACY_STORAGE_KEYS.reviewUrl),
      main: readFirst(LEGACY_STORAGE_KEYS.mainUrl),
    },
  };
};

// External setter for other pages: window.setGameResult({ currentExp, spentTime, wrongQuestionNumbers, ... })
const setGameResult = (partialResult = {}) => {
  const fromStorage = readResultFromStorage();
  const merged = {
    ...fromStorage,
    ...partialResult,
    routes: {
      ...(fromStorage.routes || {}),
      ...(partialResult.routes || {}),
    },
  };
  return saveGameResult(merged);
};

window.setGameResult = setGameResult;

const resolveResultData = () => {
  const fromStorage = readResultFromStorage();
  const fromLegacy = readLegacyResultFromStorage();
  const source = {
    ...fromLegacy,
    ...fromStorage,
    routes: {
      ...(fromLegacy.routes || {}),
      ...(fromStorage.routes || {}),
    },
  };
  const defaultRoutes = getDefaultRoutes();
  // Priority: localStorage > defaults.

  const total = clamp(
    toNumber(source.total, DEFAULT_RESULT.total),
    1,
    GAME_BALANCE.quiz.questionsPerRound,
  );
  const wrongQuestionNumbers = parseWrongQuestionNumbers(
    source.wrongQuestionNumbers ??
      source.wrongQuestions ??
      source.wrongQuestionList ??
      source.incorrectQuestionNumbers,
  );
  const wrongCountFromList =
    wrongQuestionNumbers !== null
      ? clamp(wrongQuestionNumbers.length, 0, total)
      : null;
  const correctFromLegacyEarnedExp = (() => {
    const parsed = Number(source.earnedExp);
    if (!Number.isFinite(parsed)) return null;
    return clamp(
      Math.round(parsed / GAME_BALANCE.quiz.scorePerCorrect),
      0,
      total,
    );
  })();
  const correct = clamp(
    wrongCountFromList !== null
      ? total - wrongCountFromList
      : toNumber(
          source.correct,
          correctFromLegacyEarnedExp ?? DEFAULT_RESULT.correct,
        ),
    0,
    total,
  );

  const duration = clamp(
    parseDurationToSeconds(
      source.spentTime ?? source.duration,
      DEFAULT_RESULT.duration,
    ),
    0,
    QUIZ_TIME_LIMIT_SECONDS,
  );
  const earnedExp = clamp(
    correct * GAME_BALANCE.quiz.scorePerCorrect,
    0,
    MAX_GAIN_PER_ROUND,
  );
  const level = clamp(
    toNumber(source.level ?? source.stage, DEFAULT_RESULT.level),
    1,
    GAME_BALANCE.stages,
  );
  const defaultRequiredExp = GAME_BALANCE.expToNextStage[level] ?? 0;
  const requiredExp = clamp(
    toNumber(source.requiredExp ?? source.levelGoal, defaultRequiredExp),
    0,
    9999,
  );
  // If cumulative exp is provided, prefer it for "exp to next level".
  const currentExp = clamp(
    toNumber(
      source.currentExp ?? source.levelExp ?? source.totalExp ?? source.exp,
      earnedExp,
    ),
    0,
    requiredExp > 0 ? requiredExp : 9999,
  );
  const remainingExp =
    requiredExp > 0 ? clamp(requiredExp - currentExp, 0, requiredExp) : 0;
  const wrongCount =
    wrongCountFromList !== null ? wrongCountFromList : total - correct;

  const pickRoute = (key) => {
    const storageValue = source.routes?.[key];
    return storageValue || defaultRoutes[key];
  };

  return {
    total,
    correct,
    duration,
    earnedExp,
    // Keep exp for backward compatibility with existing consumers.
    exp: earnedExp,
    level,
    currentExp,
    requiredExp,
    remainingExp,
    wrongQuestionNumbers,
    wrongCount,
    spentTime: formatTime(duration),
    expMax: MAX_GAIN_PER_ROUND,
    routes: {
      review: pickRoute('review'),
      main: pickRoute('main'),
    },
  };
};

const messageByAccuracy = (accuracy) => {
  if (accuracy === 100) return '완벽해요. 지점장 승진 준비 완료!';
  if (accuracy >= 80) return '훌륭해요. 안정적으로 개념을 잡았어요.';
  if (accuracy >= 60) return '좋아요. 오답노트를 보면 더 빨리 올라가요.';
  return '시작이 좋아요. 다시 도전하면 바로 성장합니다.';
};

const setRouteLink = (id, href) => {
  const node = document.getElementById(id);
  if (!node) return;
  node.href = href;
};

const render = () => {
  // Persist normalized result so every screen can read a single stable format.
  const result = saveGameResult(resolveResultData());
  const wrong = clamp(
    toNumber(result.wrongCount, result.total - result.correct),
    0,
    result.total,
  );
  const accuracy = Math.round((result.correct / result.total) * 100);
  applyTierBackground(result.level);

  const scoreRing = document.getElementById('score-ring');
  const accuracyText = document.getElementById('accuracy-text');
  const scoreText = document.getElementById('score-text');
  const scoreMaxText = document.getElementById('score-max-text');
  const correctText = document.getElementById('correct-text');
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
  // Backward compatibility for older markup that only has #correct-text.
  if (correctText && !correctCount) {
    correctText.textContent = `${result.correct} / ${result.total} 정답`;
  }
  if (expText) expText.textContent = `+${result.earnedExp} EXP`;
  if (remainExpText) {
    const nextLevel = Math.min(result.level + 1, GAME_BALANCE.stages);
    const nextStageName = getStageName(nextLevel);
    if (result.requiredExp === 0) {
      remainExpText.textContent = '최종 티어 달성';
    } else if (result.remainingExp === 0) {
      remainExpText.textContent = `${nextStageName}으로 승급 가능`;
    } else {
      remainExpText.textContent = `다음 단계까지 앞으로 ${result.remainingExp} EXP`;
    }
  }
  if (wrongText) wrongText.textContent = `${wrong}개`;
  if (timeText) timeText.textContent = result.spentTime;
  if (messageText) messageText.textContent = messageByAccuracy(accuracy);

  setRouteLink('review-link', result.routes.review);
  setRouteLink('main-link', result.routes.main);
};

render();
