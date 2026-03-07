/**
 * Quiz PWA – app.js
 * Handles quiz selection, question display, answer feedback, and result statistics.
 */

// ──────────────────────────────────────────
// Available quizzes in the repository
// ──────────────────────────────────────────
const REPO_QUIZZES = [
  {
    id: 'general-knowledge',
    title: 'Allgemeinwissen',
    description: 'Teste dein Allgemeinwissen',
    icon: '🌍',
    file: 'quizzes/general-knowledge.json'
  },
  {
    id: 'science',
    title: 'Naturwissenschaften',
    description: 'Physik, Chemie und Biologie',
    icon: '🔬',
    file: 'quizzes/science.json'
  },
  {
    id: 'history',
    title: 'Geschichte',
    description: 'Fragen über die Weltgeschichte',
    icon: '🏛️',
    file: 'quizzes/history.json'
  },
  {
    id: 'csharp',
    title: 'C#',
    description: 'Grundlagen der Programmiersprache C#',
    icon: '💻',
    file: 'quizzes/csharp.json'
  }
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// ──────────────────────────────────────────
// Application state
// ──────────────────────────────────────────
let state = {
  selectedQuizIndex: null,   // index in REPO_QUIZZES, or null when using file upload
  uploadedQuizData: null,    // parsed JSON from uploaded file
  uploadedFileName: '',
  questionCount: 10,
  questions: [],             // selected questions for this run
  currentIndex: 0,
  correctCount: 0,
  wrongCount: 0,
  answered: false
};

// ──────────────────────────────────────────
// DOM references
// ──────────────────────────────────────────
const screens = {
  start: document.getElementById('screen-start'),
  quiz: document.getElementById('screen-quiz'),
  result: document.getElementById('screen-result')
};

// Start screen
const quizListEl = document.getElementById('quiz-list');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const uploadFilename = document.getElementById('upload-filename');
const questionCountInput = document.getElementById('question-count');
const countHint = document.getElementById('count-hint');
const startBtn = document.getElementById('start-btn');
const errorBanner = document.getElementById('error-banner');

// Quiz screen
const quizTitleBar = document.getElementById('quiz-title-bar');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const questionText = document.getElementById('question-text');
const optionsList = document.getElementById('options-list');
const feedbackArea = document.getElementById('feedback-area');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackStrong = document.getElementById('feedback-strong');
const feedbackCorrectAnswer = document.getElementById('feedback-correct-answer');
const nextBtn = document.getElementById('next-btn');

// Result screen
const resultEmoji = document.getElementById('result-emoji');
const resultHeading = document.getElementById('result-heading');
const resultSubtitle = document.getElementById('result-subtitle');
const scoreCircle = document.getElementById('score-circle');
const scoreNum = document.getElementById('score-num');
const statCorrect = document.getElementById('stat-correct');
const statWrong = document.getElementById('stat-wrong');
const statTotal = document.getElementById('stat-total');
const restartBtn = document.getElementById('restart-btn');
const backBtn = document.getElementById('back-btn');

// ──────────────────────────────────────────
// Utility helpers
// ──────────────────────────────────────────

/** Fisher-Yates shuffle – returns a new shuffled array */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick `n` random items from `arr` (without replacement) */
function pickRandom(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.add('visible');
}

function hideError() {
  errorBanner.classList.remove('visible');
}

// ──────────────────────────────────────────
// Start screen – build quiz list
// ──────────────────────────────────────────

function buildQuizList() {
  quizListEl.innerHTML = '';
  REPO_QUIZZES.forEach((quiz, index) => {
    const item = document.createElement('button');
    item.className = 'quiz-item';
    item.setAttribute('aria-pressed', 'false');
    item.innerHTML = `
      <span class="quiz-icon" aria-hidden="true">${quiz.icon}</span>
      <span class="quiz-info">
        <span class="quiz-title">${quiz.title}</span>
        <span class="quiz-desc">${quiz.description}</span>
      </span>
    `;
    item.addEventListener('click', () => selectRepoQuiz(index));
    quizListEl.appendChild(item);
  });
}

function selectRepoQuiz(index) {
  state.selectedQuizIndex = index;
  state.uploadedQuizData = null;
  state.uploadedFileName = '';
  uploadFilename.textContent = '';
  uploadArea.classList.remove('selected');

  document.querySelectorAll('.quiz-item').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
    el.setAttribute('aria-pressed', String(i === index));
  });

  hideError();
  updateCountHint();
  startBtn.disabled = false;
}

// ──────────────────────────────────────────
// File upload
// ──────────────────────────────────────────

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFileLoad(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFileLoad(fileInput.files[0]);
  fileInput.value = '';
});

function handleFileLoad(file) {
  if (!file.name.endsWith('.json')) {
    showError('Bitte eine JSON-Datei auswählen.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      validateQuizData(data);
      state.uploadedQuizData = data;
      state.uploadedFileName = file.name;
      state.selectedQuizIndex = null;

      // Deselect repo quizzes
      document.querySelectorAll('.quiz-item').forEach((el) => {
        el.classList.remove('selected');
        el.setAttribute('aria-pressed', 'false');
      });

      uploadFilename.textContent = `✓ ${file.name} (${data.questions.length} Fragen)`;
      uploadArea.classList.add('selected');
      hideError();
      updateCountHint();
      startBtn.disabled = false;
    } catch (err) {
      showError(`Fehler beim Laden der Datei: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function validateQuizData(data) {
  if (!data || typeof data !== 'object') throw new Error('Ungültiges JSON-Format.');
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('Die Datei enthält keine Fragen.');
  }
  data.questions.forEach((q, i) => {
    if (typeof q.question !== 'string') throw new Error(`Frage ${i + 1}: Kein Fragetext.`);
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Frage ${i + 1}: Genau 4 Antwortmöglichkeiten erforderlich.`);
    }
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
      throw new Error(`Frage ${i + 1}: 'correct' muss 0–3 sein.`);
    }
  });
}

// ──────────────────────────────────────────
// Question count selector
// ──────────────────────────────────────────

document.getElementById('count-minus').addEventListener('click', () => changeCount(-1));
document.getElementById('count-plus').addEventListener('click', () => changeCount(+1));

questionCountInput.addEventListener('change', () => {
  let val = parseInt(questionCountInput.value, 10);
  if (isNaN(val) || val < 1) val = 1;
  state.questionCount = val;
  questionCountInput.value = val;
  updateCountHint();
});

function changeCount(delta) {
  let val = state.questionCount + delta;
  if (val < 1) val = 1;
  state.questionCount = val;
  questionCountInput.value = val;
  updateCountHint();
}

function updateCountHint() {
  const total = getAvailableQuestionCount();
  if (total === null) {
    countHint.textContent = '';
    return;
  }
  if (state.questionCount > total) {
    state.questionCount = total;
    questionCountInput.value = total;
  }
  countHint.textContent = `(${total} verfügbar)`;
}

function getAvailableQuestionCount() {
  if (state.uploadedQuizData) return state.uploadedQuizData.questions.length;
  if (state.selectedQuizIndex !== null) return null; // unknown until loaded
  return null;
}

// ──────────────────────────────────────────
// Start quiz
// ──────────────────────────────────────────

startBtn.addEventListener('click', startQuiz);

async function startQuiz() {
  hideError();
  startBtn.disabled = true;
  startBtn.textContent = 'Lade…';

  try {
    let quizData;
    let quizTitle;

    if (state.uploadedQuizData) {
      quizData = state.uploadedQuizData;
      quizTitle = quizData.title || state.uploadedFileName;
    } else if (state.selectedQuizIndex !== null) {
      const meta = REPO_QUIZZES[state.selectedQuizIndex];
      const response = await fetch(meta.file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      quizData = await response.json();
      quizTitle = quizData.title || meta.title;
    } else {
      throw new Error('Bitte ein Quiz auswählen oder eine Datei laden.');
    }

    validateQuizData(quizData);

    const count = Math.min(state.questionCount, quizData.questions.length);
    state.questions = pickRandom(quizData.questions, count);
    state.currentIndex = 0;
    state.correctCount = 0;
    state.wrongCount = 0;
    state.answered = false;

    quizTitleBar.textContent = quizTitle;
    showScreen('quiz');
    renderQuestion();
  } catch (err) {
    showError(`Fehler: ${err.message}`);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Quiz starten';
  }
}

// ──────────────────────────────────────────
// Quiz screen
// ──────────────────────────────────────────

function renderQuestion() {
  state.answered = false;
  feedbackArea.style.display = 'none';
  document.getElementById('next-btn-wrap').style.display = 'none';

  const q = state.questions[state.currentIndex];
  const total = state.questions.length;
  const current = state.currentIndex + 1;

  progressText.textContent = `${current} / ${total}`;
  progressBar.style.width = `${((current - 1) / total) * 100}%`;
  questionText.textContent = q.question;

  optionsList.innerHTML = '';
  q.options.forEach((option, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="option-letter">${OPTION_LETTERS[i]}</span>${escapeHtml(option)}`;
    btn.addEventListener('click', () => handleAnswer(i));
    optionsList.appendChild(btn);
  });
}

function handleAnswer(selectedIndex) {
  if (state.answered) return;
  state.answered = true;

  const q = state.questions[state.currentIndex];
  const isCorrect = selectedIndex === q.correct;

  if (isCorrect) {
    state.correctCount++;
  } else {
    state.wrongCount++;
  }

  // Style the options
  const buttons = optionsList.querySelectorAll('.option-btn');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) {
      btn.classList.add('correct');
    } else if (i === selectedIndex && !isCorrect) {
      btn.classList.add('wrong');
    }
  });

  // Show feedback
  feedbackArea.style.display = 'flex';
  if (isCorrect) {
    feedbackArea.className = 'feedback-area correct-feedback';
    feedbackIcon.textContent = '✅';
    feedbackStrong.textContent = 'Richtig! Gut gemacht!';
    feedbackCorrectAnswer.textContent = '';
  } else {
    feedbackArea.className = 'feedback-area wrong-feedback';
    feedbackIcon.textContent = '❌';
    feedbackStrong.textContent = 'Falsch!';
    feedbackCorrectAnswer.textContent = `Richtige Antwort: ${OPTION_LETTERS[q.correct]}) ${q.options[q.correct]}`;
  }

  // Show next button
  const nextBtnWrap = document.getElementById('next-btn-wrap');
  nextBtnWrap.style.display = 'block';
  const isLast = state.currentIndex === state.questions.length - 1;
  nextBtn.textContent = isLast ? 'Auswertung ansehen →' : 'Nächste Frage →';
}

nextBtn.addEventListener('click', () => {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
  } else {
    showResults();
  }
});

// ──────────────────────────────────────────
// Result screen
// ──────────────────────────────────────────

function showResults() {
  const total = state.questions.length;
  const correct = state.correctCount;
  const pct = Math.round((correct / total) * 100);

  // Set result emoji and heading based on score
  let emoji, heading, subtitle;
  if (pct >= 90) {
    emoji = '🏆'; heading = 'Hervorragend!'; subtitle = 'Du bist ein echtes Quiz-Ass!';
  } else if (pct >= 70) {
    emoji = '🎉'; heading = 'Super gemacht!'; subtitle = 'Du kennst dich wirklich gut aus.';
  } else if (pct >= 50) {
    emoji = '👍'; heading = 'Gut gemacht!'; subtitle = 'Weiter üben und du wirst noch besser.';
  } else if (pct >= 30) {
    emoji = '📚'; heading = 'Noch Luft nach oben'; subtitle = 'Nicht aufgeben – beim nächsten Mal klappt es!';
  } else {
    emoji = '💪'; heading = 'Übung macht den Meister'; subtitle = 'Versuche es noch einmal!';
  }

  resultEmoji.textContent = emoji;
  resultHeading.textContent = heading;
  resultSubtitle.textContent = subtitle;
  scoreNum.textContent = `${pct}%`;
  scoreCircle.style.setProperty('--pct', pct);

  statCorrect.textContent = correct;
  statWrong.textContent = state.wrongCount;
  statTotal.textContent = total;

  // Animate the progress bar fill
  progressBar.style.width = '100%';

  showScreen('result');
}

restartBtn.addEventListener('click', () => {
  // Restart with the same quiz
  state.currentIndex = 0;
  state.correctCount = 0;
  state.wrongCount = 0;
  state.answered = false;

  let quizData = state.uploadedQuizData;
  if (!quizData && state.selectedQuizIndex !== null) {
    // Re-start asynchronously (repo quiz must be re-fetched)
    startQuiz();
    return;
  }

  if (!quizData) {
    // No quiz data available – return to start screen
    showScreen('start');
    return;
  }

  const count = Math.min(state.questionCount, quizData.questions.length);
  state.questions = pickRandom(quizData.questions, count);
  showScreen('quiz');
  renderQuestion();
});

backBtn.addEventListener('click', () => {
  showScreen('start');
});

// ──────────────────────────────────────────
// Utility
// ──────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ──────────────────────────────────────────
// Service worker registration
// ──────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch((err) => console.warn('Service Worker registration failed:', err));
  });
}

// ──────────────────────────────────────────
// Initialise
// ──────────────────────────────────────────

buildQuizList();
questionCountInput.value = state.questionCount;
showScreen('start');
