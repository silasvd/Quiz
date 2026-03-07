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
    id: 'paw-patrol',
    title: 'Paw Patrol',
    description: 'Teste dein Wissen über die Paw Patrol!',
    icon: '🐾',
    file: 'quizzes/paw-patrol.json'
  },
  {
    id: 'csharp',
    title: 'C#',
    description: 'Grundlagen der Programmiersprache C#',
    icon: '💻',
    file: 'quizzes/csharp.json'
  },
  {
    id: 'mathe-einmaleins',
    title: 'Kleines Einmaleins',
    description: 'Alle Multiplikationsaufgaben 1×1 bis 10×10',
    icon: '✖️',
    file: 'quizzes/mathe-einmaleins.json',
    allowFreeInput: true
  },
  {
    id: 'mathe-teilen',
    title: 'Geteiltaufgaben',
    description: 'Alle Divisionsaufgaben des kleinen Einmaleins',
    icon: '➗',
    file: 'quizzes/mathe-teilen.json',
    allowFreeInput: true
  },
  {
    id: 'mathe-gemischt',
    title: 'Gemischte Matheaufgaben',
    description: 'Multiplikation und Division gemischt',
    icon: '🔢',
    file: 'quizzes/mathe-gemischt.json',
    allowFreeInput: true
  },
  {
    id: 'kinderlieder',
    title: 'Kinderlieder erraten',
    description: 'Erkenne das Kinderlied anhand der Melodie',
    icon: '🎵',
    file: 'quizzes/kinderlieder.json'
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
  answered: false,
  freeInputMode: false       // true = free text input instead of Multiple Choice
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
const inputModeWrap = document.getElementById('input-mode-wrap');

// Quiz screen
const quizTitleBar = document.getElementById('quiz-title-bar');
const quizBackBtn = document.getElementById('quiz-back-btn');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const questionText = document.getElementById('question-text');
const optionsList = document.getElementById('options-list');
const feedbackArea = document.getElementById('feedback-area');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackStrong = document.getElementById('feedback-strong');
const feedbackCorrectAnswer = document.getElementById('feedback-correct-answer');
const nextBtn = document.getElementById('next-btn');
const textInputWrap = document.getElementById('text-input-wrap');
const answerInput = document.getElementById('answer-input');
const submitAnswerBtn = document.getElementById('submit-answer-btn');

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
  if (name !== 'quiz') stopMelodyAudio();
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
// Melody quiz – parsing, rendering, playback
// ──────────────────────────────────────────

/** Parse melody text notation into an array of measures, each containing notes.
 *  Format: "C4/4 D4/4 E4/4 F4/4 | G4/2 G4/2" */
function parseMelody(str) {
  return str.split('|').map(m => {
    return m.trim().split(/\s+/).filter(Boolean).map(token => {
      // Rest
      const restMatch = token.match(/^R\/(\d+\.?)$/);
      if (restMatch) return { rest: true, duration: restMatch[1] };
      // Note: e.g. C4/4, F#4/8, Bb4/2.
      const noteMatch = token.match(/^([A-G][#b]?)(\d)\/(\d+\.?)$/);
      if (!noteMatch) return null;
      return { pitch: noteMatch[1], octave: parseInt(noteMatch[2]), duration: noteMatch[3], rest: false };
    }).filter(Boolean);
  });
}

/** Staff position for a note (0 = E4 on bottom line of treble clef) */
function noteStaffPos(pitch, octave) {
  const m = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  return m[pitch[0]] + (octave - 4) * 7 - 2;
}

/** Duration string to number of beats (quarter note = 1 beat) */
function durationBeats(durStr) {
  const base = parseInt(durStr);
  let beats = 4 / base;
  if (durStr.includes('.')) beats *= 1.5;
  return beats;
}

/** Note frequency in Hz (A4 = 440) */
function noteFrequency(pitch, octave) {
  const offsets = { 'C':-9,'C#':-8,'Db':-8,'D':-7,'D#':-6,'Eb':-6,'E':-5,'F':-4,'F#':-3,'Gb':-3,'G':-2,'G#':-1,'Ab':-1,'A':0,'A#':1,'Bb':1,'B':2 };
  return 440 * Math.pow(2, (offsets[pitch] + (octave - 4) * 12) / 12);
}

/* ---- SVG staff rendering ---- */

const ML = { // Melody Layout constants
  ls: 12,          // line spacing
  top: 40,         // top margin
  bot: 30,         // bottom margin
  left: 50,        // left margin (clef + time sig)
  right: 15,       // right margin
  mw: 160,         // measure width
  noteRx: 6,       // note head horizontal radius
  noteRy: 4.5,     // note head vertical radius
  stem: 32,        // stem length
  staffColor: '#667788',
  noteColor: '#d0d8e8'
};

function createMelodySVG(measures, timeSignature) {
  const ns = 'http://www.w3.org/2000/svg';
  const numMeasures = measures.length;
  const svgW = ML.left + numMeasures * ML.mw + ML.right;
  const bottomY = ML.top + 4 * ML.ls;
  const svgH = ML.top + 4 * ML.ls + ML.bot;

  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Notenblatt mit Melodie');

  // Staff lines
  const staffX1 = ML.left - 8;
  const staffX2 = svgW - ML.right;
  for (let i = 0; i < 5; i++) {
    const y = ML.top + i * ML.ls;
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', staffX1); l.setAttribute('y1', y);
    l.setAttribute('x2', staffX2); l.setAttribute('y2', y);
    l.setAttribute('stroke', ML.staffColor); l.setAttribute('stroke-width', '1');
    svg.appendChild(l);
  }

  // Left bar line
  addLine(svg, staffX1, ML.top, staffX1, bottomY, ML.staffColor, 1.5);

  // Treble clef (Unicode character)
  const clef = document.createElementNS(ns, 'text');
  clef.setAttribute('x', '2');
  clef.setAttribute('y', String(bottomY + 8));
  clef.setAttribute('font-size', '56');
  clef.setAttribute('fill', '#8899aa');
  clef.setAttribute('font-family', 'serif');
  clef.textContent = '\u{1D11E}';
  svg.appendChild(clef);

  // Time signature
  const ts = (timeSignature || '4/4').split('/');
  const tsX = ML.left - 16;
  addText(svg, tsX, ML.top + ML.ls * 1.7, ts[0], '16', '#aabbcc');
  addText(svg, tsX, ML.top + ML.ls * 3.7, ts[1], '16', '#aabbcc');

  // Draw measures
  measures.forEach((notes, mi) => {
    const mStartX = ML.left + mi * ML.mw;
    const totalBeats = notes.reduce((s, n) => s + durationBeats(n.duration), 0);
    const usableW = ML.mw - 20; // padding within measure
    let beatOffset = 0;

    notes.forEach(note => {
      const beats = durationBeats(note.duration);
      const x = mStartX + 12 + (beatOffset / totalBeats) * usableW;
      beatOffset += beats;

      if (note.rest) {
        // Draw quarter rest symbol
        addText(svg, x - 4, ML.top + ML.ls * 2.5, '𝄾', '16', '#8899aa');
        return;
      }

      const pos = noteStaffPos(note.pitch, note.octave);
      const y = bottomY - pos * (ML.ls / 2);
      const dur = parseInt(note.duration);
      const filled = dur >= 4;
      const hasStem = dur >= 2;

      // Ledger lines
      if (pos <= -2) {
        for (let lp = -2; lp >= pos; lp -= 2) {
          const ly = bottomY - lp * (ML.ls / 2);
          addLine(svg, x - ML.noteRx - 4, ly, x + ML.noteRx + 4, ly, ML.staffColor, 1);
        }
      }
      if (pos >= 10) {
        for (let lp = 10; lp <= pos; lp += 2) {
          const ly = bottomY - lp * (ML.ls / 2);
          addLine(svg, x - ML.noteRx - 4, ly, x + ML.noteRx + 4, ly, ML.staffColor, 1);
        }
      }

      // Note head
      const head = document.createElementNS(ns, 'ellipse');
      head.setAttribute('cx', x); head.setAttribute('cy', y);
      head.setAttribute('rx', ML.noteRx); head.setAttribute('ry', ML.noteRy);
      head.setAttribute('transform', `rotate(-12 ${x} ${y})`);
      if (filled) {
        head.setAttribute('fill', ML.noteColor);
      } else {
        head.setAttribute('fill', 'none');
        head.setAttribute('stroke', ML.noteColor);
        head.setAttribute('stroke-width', '1.5');
      }
      svg.appendChild(head);

      // Dot for dotted notes
      if (note.duration.includes('.')) {
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', x + ML.noteRx + 4);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', '1.8');
        dot.setAttribute('fill', ML.noteColor);
        svg.appendChild(dot);
      }

      // Stem
      if (hasStem) {
        const stemUp = pos < 4; // below middle line → stem up
        if (stemUp) {
          addLine(svg, x + ML.noteRx - 1, y, x + ML.noteRx - 1, y - ML.stem, ML.noteColor, 1.5);
          // Flag for eighth notes
          if (dur === 8) drawFlag(svg, x + ML.noteRx - 1, y - ML.stem, true);
          if (dur === 16) { drawFlag(svg, x + ML.noteRx - 1, y - ML.stem, true); drawFlag(svg, x + ML.noteRx - 1, y - ML.stem + 8, true); }
        } else {
          addLine(svg, x - ML.noteRx + 1, y, x - ML.noteRx + 1, y + ML.stem, ML.noteColor, 1.5);
          if (dur === 8) drawFlag(svg, x - ML.noteRx + 1, y + ML.stem, false);
          if (dur === 16) { drawFlag(svg, x - ML.noteRx + 1, y + ML.stem, false); drawFlag(svg, x - ML.noteRx + 1, y + ML.stem - 8, false); }
        }
      }
    });

    // Bar line at end of measure (except last)
    if (mi < numMeasures - 1) {
      const bx = mStartX + ML.mw;
      addLine(svg, bx, ML.top, bx, bottomY, ML.staffColor, 1);
    }
  });

  // Final double bar line
  const endX = svgW - ML.right;
  addLine(svg, endX - 4, ML.top, endX - 4, bottomY, ML.staffColor, 1);
  addLine(svg, endX, ML.top, endX, bottomY, ML.staffColor, 2.5);

  return svg;
}

function addLine(svg, x1, y1, x2, y2, color, width) {
  const ns = 'http://www.w3.org/2000/svg';
  const l = document.createElementNS(ns, 'line');
  l.setAttribute('x1', x1); l.setAttribute('y1', y1);
  l.setAttribute('x2', x2); l.setAttribute('y2', y2);
  l.setAttribute('stroke', color); l.setAttribute('stroke-width', width);
  svg.appendChild(l);
}

function addText(svg, x, y, text, size, color) {
  const ns = 'http://www.w3.org/2000/svg';
  const t = document.createElementNS(ns, 'text');
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('font-size', size);
  t.setAttribute('font-weight', '700');
  t.setAttribute('fill', color);
  t.setAttribute('font-family', 'serif');
  t.setAttribute('text-anchor', 'middle');
  t.textContent = text;
  svg.appendChild(t);
}

function drawFlag(svg, x, y, up) {
  const ns = 'http://www.w3.org/2000/svg';
  const p = document.createElementNS(ns, 'path');
  if (up) {
    p.setAttribute('d', `M${x} ${y} C${x + 2} ${y + 6} ${x + 8} ${y + 10} ${x + 6} ${y + 16}`);
  } else {
    p.setAttribute('d', `M${x} ${y} C${x - 2} ${y - 6} ${x - 8} ${y - 10} ${x - 6} ${y - 16}`);
  }
  p.setAttribute('stroke', ML.noteColor);
  p.setAttribute('stroke-width', '1.5');
  p.setAttribute('fill', 'none');
  svg.appendChild(p);
}

/* ---- Audio playback using Web Audio API ---- */

let melodyAudioCtx = null;
let melodyScheduledNodes = [];
let melodyPlayTimer = null;

function playMelodyAudio(melodyStr, tempo) {
  stopMelodyAudio();
  if (!melodyAudioCtx) {
    melodyAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (melodyAudioCtx.state === 'suspended') melodyAudioCtx.resume();

  const measures = parseMelody(melodyStr);
  const beatDur = 60 / (tempo || 120);
  let time = melodyAudioCtx.currentTime + 0.05;

  for (const measure of measures) {
    for (const note of measure) {
      const dur = durationBeats(note.duration) * beatDur;
      if (!note.rest) {
        const freq = noteFrequency(note.pitch, note.octave);
        scheduleTone(freq, time, dur * 0.85);
      }
      time += dur;
    }
  }

  // Update play button state when melody finishes
  const totalMs = (time - melodyAudioCtx.currentTime) * 1000 + 100;
  melodyPlayTimer = setTimeout(() => {
    const btn = document.getElementById('melody-play-btn');
    if (btn) { btn.textContent = '▶ Melodie abspielen'; btn.classList.remove('playing'); }
  }, totalMs);
}

function scheduleTone(freq, start, dur) {
  const ctx = melodyAudioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(0.28, start + Math.min(0.04, dur * 0.15));
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.02);
  melodyScheduledNodes.push(osc);
}

function stopMelodyAudio() {
  if (melodyPlayTimer) { clearTimeout(melodyPlayTimer); melodyPlayTimer = null; }
  melodyScheduledNodes.forEach(osc => { try { osc.stop(); } catch (_) {} });
  melodyScheduledNodes = [];
  const btn = document.getElementById('melody-play-btn');
  if (btn) { btn.textContent = '▶ Melodie abspielen'; btn.classList.remove('playing'); }
}

/** Build and insert the melody display (staff + play button) into the quiz screen */
function renderMelodyDisplay(q) {
  // Remove previous melody display if any
  const existing = document.getElementById('melody-display');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'melody-display';
  container.className = 'melody-container';

  // SVG staff
  const staffWrap = document.createElement('div');
  staffWrap.className = 'melody-staff';
  const measures = parseMelody(q.melody);
  staffWrap.appendChild(createMelodySVG(measures, q.timeSignature));
  container.appendChild(staffWrap);

  // Play button
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.id = 'melody-play-btn';
  playBtn.className = 'melody-play-btn';
  playBtn.textContent = '▶ Melodie abspielen';
  playBtn.addEventListener('click', () => {
    if (playBtn.classList.contains('playing')) {
      stopMelodyAudio();
    } else {
      playBtn.textContent = '⏹ Stopp';
      playBtn.classList.add('playing');
      playMelodyAudio(q.melody, q.tempo);
    }
  });
  container.appendChild(playBtn);

  // Insert after question text
  questionText.after(container);
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

  const allowFreeInput = !!REPO_QUIZZES[index].allowFreeInput;
  inputModeWrap.style.display = allowFreeInput ? 'block' : 'none';
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

      inputModeWrap.style.display = data.allowFreeInput ? 'block' : 'none';
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
    if (q.answer !== undefined) {
      // Free-input (or hybrid) question: answer must be a string or number
      if (typeof q.answer !== 'string' && typeof q.answer !== 'number') {
        throw new Error(`Frage ${i + 1}: 'answer' muss ein Text oder eine Zahl sein.`);
      }
    }
    if (q.options !== undefined || q.answer === undefined) {
      // Multiple-choice question (pure MC or hybrid with both answer + options)
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Frage ${i + 1}: Genau 4 Antwortmöglichkeiten erforderlich.`);
      }
      if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
        throw new Error(`Frage ${i + 1}: 'correct' muss 0–3 sein.`);
      }
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

    // Determine input mode from the radio buttons (only visible for allowFreeInput quizzes)
    const selectedMode = document.querySelector('input[name="input-mode"]:checked');
    state.freeInputMode = quizData.allowFreeInput
      ? (selectedMode ? selectedMode.value === 'free' : false)
      : false;

    const count = Math.min(state.questionCount, quizData.questions.length);
    let picked = pickRandom(quizData.questions, count);

    state.questions = picked;
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
  stopMelodyAudio();

  const q = state.questions[state.currentIndex];
  const total = state.questions.length;
  const current = state.currentIndex + 1;

  progressText.textContent = `${current} / ${total}`;
  progressBar.style.width = `${((current - 1) / total) * 100}%`;
  questionText.textContent = q.question;

  // Melody display (remove old, add new if applicable)
  const oldMelody = document.getElementById('melody-display');
  if (oldMelody) oldMelody.remove();
  if (q.melody) renderMelodyDisplay(q);

  if (state.freeInputMode) {
    // Free text input mode
    optionsList.style.display = 'none';
    textInputWrap.style.display = 'flex';
    answerInput.value = '';
    answerInput.disabled = false;
    answerInput.classList.remove('correct', 'wrong');
    submitAnswerBtn.disabled = false;
    // Focus the input so the user can type immediately
    answerInput.focus();
  } else {
    // Multiple Choice mode
    textInputWrap.style.display = 'none';
    optionsList.style.display = '';
    optionsList.innerHTML = '';
    q.options.forEach((option, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="option-letter">${OPTION_LETTERS[i]}</span>${escapeHtml(option)}`;
      btn.addEventListener('click', () => handleAnswer(i));
      optionsList.appendChild(btn);
    });
  }
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

function handleTextAnswer(inputValue) {
  if (state.answered) return;
  state.answered = true;

  const q = state.questions[state.currentIndex];
  const trimmed = inputValue.trim();

  // Compare numerically when both sides are valid numbers, otherwise case-insensitive string compare
  const numInput = Number(trimmed);
  const numAnswer = Number(q.answer);
  const isCorrect = (!isNaN(numInput) && !isNaN(numAnswer))
    ? numInput === numAnswer
    : trimmed.toLowerCase() === String(q.answer).toLowerCase();

  if (isCorrect) {
    state.correctCount++;
  } else {
    state.wrongCount++;
  }

  // Disable input
  answerInput.disabled = true;
  submitAnswerBtn.disabled = true;
  answerInput.classList.add(isCorrect ? 'correct' : 'wrong');

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
    feedbackCorrectAnswer.textContent = `Richtige Antwort: ${q.answer}`;
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

submitAnswerBtn.addEventListener('click', () => {
  if (answerInput.value.trim() !== '') handleTextAnswer(answerInput.value);
});

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && answerInput.value.trim() !== '') handleTextAnswer(answerInput.value);
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
  let picked = pickRandom(quizData.questions, count);

  state.questions = picked;
  showScreen('quiz');
  renderQuestion();
});

backBtn.addEventListener('click', () => {
  showScreen('start');
});

quizBackBtn.addEventListener('click', () => {
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

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// ──────────────────────────────────────────
// Initialise
// ──────────────────────────────────────────

buildQuizList();
questionCountInput.value = state.questionCount;
showScreen('start');
