const tabs = document.querySelector("#tabs");
const content = document.querySelector("#content");
const microPrompt = document.querySelector("#microPrompt");

let lessons = [];
let quizQuestions = [];
let activeId = "overview";
let quizIndex = 0;
let score = 0;
let selectedAnswer = "";
let quizComplete = false;

function chips(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function renderPizzaTracker() {
  return `
    <div class="pizza-tracker" aria-label="${score} of ${quizQuestions.length} pizza slices collected">
      <div class="pizza-pie" style="--slices: ${score};">
        ${Array.from(
          { length: quizQuestions.length },
          (_, index) => `<span class="pizza-slice ${index < score ? "earned" : ""}" style="--slice-index: ${index};"></span>`
        ).join("")}
      </div>
      <div class="pizza-status">
        <strong>${score} / ${quizQuestions.length} slices</strong>
        <span>Collect every slice to complete the pizza.</span>
      </div>
    </div>
  `;
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
  if (activeId === "quiz-game") {
    renderQuiz();
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
}

function renderQuiz() {
  if (quizComplete) {
    const message =
      score === quizQuestions.length
        ? "Full pizza completed. You answered like a number-types champion."
        : score >= Math.ceil(quizQuestions.length * 0.7)
          ? "You collected a strong stack of slices. A quick review can help you finish the pizza next time."
          : "You collected some slices. Revisit the explanation tabs, then try to build the full pizza.";

    content.innerHTML = `
      <div class="content-header">
        <div>
          <h2>Quiz Game</h2>
          <p class="definition">Final pizza: ${score} out of ${quizQuestions.length} slices collected.</p>
        </div>
        <div class="badge quiz-badge" aria-hidden="true">${score}/${quizQuestions.length}</div>
      </div>
      <section class="quiz-card result-card">
        ${renderPizzaTracker()}
        <h3>Result</h3>
        <p>${message}</p>
        <button class="action-button" type="button" data-action="restart">Restart Quiz</button>
      </section>
    `;
    return;
  }

  const question = quizQuestions[quizIndex];
  const progress = `${quizIndex + 1} / ${quizQuestions.length}`;
  const answered = Boolean(selectedAnswer);

  content.innerHTML = `
    <div class="content-header">
      <div>
        <h2>Quiz Game</h2>
        <p class="definition">Correct answers add a pizza slice. Wrong answers remove one if you have any.</p>
      </div>
      <div class="badge quiz-badge" aria-label="Current pizza slices">${score}/${quizQuestions.length}</div>
    </div>

    <section class="quiz-card">
      ${renderPizzaTracker()}
      <div class="quiz-meta">
        <span>Question ${progress}</span>
        <span>Pizza slices ${score}</span>
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
          ? `<div class="feedback ${selectedAnswer === question.answer ? "right" : "review"}">
              <strong>${selectedAnswer === question.answer ? "Correct: 1 slice added" : "Not quite: 1 slice lost"}</strong>
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
  quizIndex = 0;
  score = 0;
  selectedAnswer = "";
  quizComplete = false;
  renderQuiz();
}

function chooseAnswer(answer) {
  if (selectedAnswer) return;

  selectedAnswer = answer;
  if (answer === quizQuestions[quizIndex].answer) {
    score = Math.min(score + 1, quizQuestions.length);
  } else {
    score = Math.max(score - 1, 0);
  }
  renderQuiz();
}

function nextQuestion() {
  if (quizIndex === quizQuestions.length - 1) {
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

  activeId = tab.dataset.id;
  renderTabs();
  renderContent();
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
  microPrompt.textContent = data.microPrompt;

  renderTabs();
  renderContent();
}

init();
