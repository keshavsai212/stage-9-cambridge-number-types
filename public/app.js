const tabs = document.querySelector("#tabs");
const content = document.querySelector("#content");
const microPrompt = document.querySelector("#microPrompt");
const themeToggle = document.querySelector("#themeToggle");
const themeLabel = document.querySelector(".theme-label");

let lessons = [];
let quizQuestions = [];
let activeQuizQuestions = [];
let activeId = "overview";
let quizIndex = 0;
let score = 0;
let streak = 0;
let bestStreak = 0;
let selectedAnswer = "";
let lastAnswerCorrect = false;
let quizComplete = false;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("stage9-theme", theme);
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
}

function initTheme() {
  const savedTheme = localStorage.getItem("stage9-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));
}

function chips(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function shuffleQuestions(questions) {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function getQuestionCount() {
  return activeQuizQuestions.length || quizQuestions.length;
}

function renderPizzaTracker() {
  const levelName = getLevelName(score);
  const questionCount = getQuestionCount();

  return `
    <div class="pizza-tracker" aria-label="${score} of ${questionCount} pizza slices collected">
      <div class="pizza-pie" style="--slices: ${score};">
        ${Array.from(
          { length: questionCount },
          (_, index) => `<span class="pizza-slice ${index < score ? "earned" : ""}" style="--slice-index: ${index};"></span>`
        ).join("")}
      </div>
      <div class="pizza-status">
        <strong>${score} / ${questionCount} slices</strong>
        <span>${levelName}</span>
        <small>Collect every slice to complete the pizza.</small>
      </div>
    </div>
  `;
}

function getLevelName(sliceCount) {
  if (sliceCount === getQuestionCount()) return "Level: Full Pizza Master";
  if (sliceCount >= 6) return "Level: Topping Tactician";
  if (sliceCount >= 4) return "Level: Fraction Chef";
  if (sliceCount >= 2) return "Level: Number Ninja";
  return "Level: Dough Starter";
}

function getEncouragement(isCorrect) {
  if (isCorrect && streak >= 3) return "Hot streak. Your pizza is cooking fast.";
  if (isCorrect) return "Nice slice. That number type is yours.";
  if (score === 0) return "No slices to lose yet. Shake it off and grab the next one.";
  return "A slice slipped away, but the next question can win it back.";
}

function renderTabs() {
  const lessonTabs = lessons
    .map(
      (lesson) => `
        <button class="tab" type="button" aria-selected="${lesson.id === activeId}" data-id="${lesson.id}">
          ${lesson.label}
        </button>
      `
    )
    .join("");

  tabs.innerHTML = `${lessonTabs}
    <button class="tab quiz-tab" type="button" aria-selected="${activeId === "quiz-game"}" data-id="quiz-game">
      Quiz Game
    </button>
  `;
}

function renderContent() {
  content.classList.remove("content-enter");

  if (activeId === "quiz-game") {
    renderQuiz();
    animateContent();
    return;
  }

  const lesson = lessons.find((item) => item.id === activeId) || lessons[0];

  content.innerHTML = `
    <div class="content-header">
      <div>
        <h2>${lesson.title}</h2>
        <p class="definition">${lesson.definition}</p>
      </div>
      <div class="badge" aria-hidden="true">#</div>
    </div>

    <div class="grid">
      <section class="box">
        <h3>Examples</h3>
        <ul class="chips">${chips(lesson.examples)}</ul>
      </section>
      <section class="box">
        <h3>Non-examples</h3>
        <ul class="chips">${chips(lesson.nonExamples)}</ul>
      </section>
      <section class="box wide">
        <h3>Detailed Explanation</h3>
        <p>${lesson.detail}</p>
      </section>
      <section class="box wide tip">
        <h3>Exam Tip</h3>
        <p>${lesson.examTip}</p>
      </section>
    </div>
  `;
  animateContent();
}

function animateContent() {
  requestAnimationFrame(() => {
    content.classList.add("content-enter");
  });
}

function renderQuiz() {
  const questionCount = getQuestionCount();

  if (quizComplete) {
    const message =
      score === questionCount
        ? "Full pizza completed. You answered like a number-types champion and cleared the challenge."
        : score >= Math.ceil(questionCount * 0.7)
          ? "You collected a strong stack of slices. One quick review run can help you finish the full pizza."
          : "You collected some slices. Revisit the explanation tabs, then jump back in for a stronger run.";

    content.innerHTML = `
      <div class="content-header">
        <div>
          <h2>Pizza Slice Challenge</h2>
          <p class="definition">Final pizza: ${score} out of ${questionCount} slices collected. Restart for a new question order.</p>
        </div>
        <div class="badge quiz-badge" aria-hidden="true">${score}/${questionCount}</div>
      </div>
      <section class="quiz-card result-card ${score === questionCount ? "perfect-run" : ""}">
        ${renderPizzaTracker()}
        <h3>Result</h3>
        <p>${message}</p>
        <div class="result-stats">
          <span>Best streak: ${bestStreak}</span>
          <span>${getLevelName(score)}</span>
        </div>
        <button class="action-button" type="button" data-action="restart">Restart Quiz</button>
      </section>
    `;
    return;
  }

  const question = activeQuizQuestions[quizIndex];
  const progress = `${quizIndex + 1} / ${questionCount}`;
  const answered = Boolean(selectedAnswer);

  content.innerHTML = `
    <div class="content-header">
      <div>
        <h2>Pizza Slice Challenge</h2>
        <p class="definition">Win slices with correct answers, protect your pizza from wrong ones, and chase a perfect 8-slice finish.</p>
      </div>
      <div class="badge quiz-badge" aria-label="Current pizza slices">${score}/${questionCount}</div>
    </div>

    <section class="quiz-card">
      ${renderPizzaTracker()}
      <div class="quiz-meta">
        <span>Question ${progress}</span>
        <span>Streak ${streak}</span>
        <span>Pizza slices ${score}</span>
      </div>
      <div class="challenge-strip">
        <strong>${getLevelName(score)}</strong>
        <span>Best streak: ${bestStreak}</span>
      </div>
      <h3>${question.question}</h3>
      <div class="answers">
        ${question.options
          .map((option) => {
            const isSelected = option === selectedAnswer;
            const isCorrect = option === question.answer;
            const stateClass = answered && isCorrect ? "correct" : answered && isSelected ? "wrong" : "";
            return `
              <button class="answer ${stateClass}" type="button" data-answer="${option}" ${answered ? "disabled" : ""}>
                ${option}
              </button>
            `;
          })
          .join("")}
      </div>
      ${
        answered
          ? `<div class="feedback ${lastAnswerCorrect ? "right" : "review"}">
              <strong>${lastAnswerCorrect ? "Correct: 1 slice added" : "Not quite: 1 slice lost"}</strong>
              <span>${getEncouragement(lastAnswerCorrect)}</span>
              <p>${question.feedback}</p>
            </div>
            <button class="action-button" type="button" data-action="next">
              ${quizIndex === quizQuestions.length - 1 ? "See Result" : "Next Question"}
            </button>`
          : ""
      }
    </section>
  `;
}

function restartQuiz() {
  activeQuizQuestions = shuffleQuestions(quizQuestions);
  quizIndex = 0;
  score = 0;
  streak = 0;
  bestStreak = 0;
  selectedAnswer = "";
  lastAnswerCorrect = false;
  quizComplete = false;
  renderQuiz();
}

function chooseAnswer(answer) {
  if (selectedAnswer) return;

  selectedAnswer = answer;
  if (answer === activeQuizQuestions[quizIndex].answer) {
    score = Math.min(score + 1, getQuestionCount());
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    lastAnswerCorrect = true;
  } else {
    score = Math.max(score - 1, 0);
    streak = 0;
    lastAnswerCorrect = false;
  }
  renderQuiz();
}

function nextQuestion() {
  if (quizIndex === getQuestionCount() - 1) {
    quizComplete = true;
  } else {
    quizIndex += 1;
    selectedAnswer = "";
  }
  renderQuiz();
}

tabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  if (activeId === tab.dataset.id) return;

  activeId = tab.dataset.id;
  renderTabs();
  renderContent();
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

content.addEventListener("click", (event) => {
  const answerButton = event.target.closest(".answer");
  const actionButton = event.target.closest("[data-action]");

  if (answerButton) {
    chooseAnswer(answerButton.dataset.answer);
    return;
  }

  if (actionButton?.dataset.action === "next") {
    nextQuestion();
  }

  if (actionButton?.dataset.action === "restart") {
    restartQuiz();
  }
});

async function init() {
  const response = await fetch("/api/content");
  const data = await response.json();

  lessons = data.numberTypes;
  quizQuestions = data.quizQuestions;
  activeQuizQuestions = [...quizQuestions];
  microPrompt.textContent = data.microPrompt;

  renderTabs();
  renderContent();
}

initTheme();
init();
