/**
 * Help Center / FAQ Modal Component
 */

const FAQ_DATA = [
  {
    question: "How to edit personal informations?",
    slides: [
      "assets/help-center/q1-slide-1.png",
      "assets/help-center/q1-slide-2.png",
    ],
  },
  {
    question: "How to add the goals and set the timer?",
    slides: [
      "assets/help-center/q2-slide-1.png",
      "assets/help-center/q2-slide-2.png",
    ],
  },
  {
    question: "How to track statistics?",
    slides: [
      "assets/help-center/q3-slide-1.png",
      "assets/help-center/q3-slide-2.png",
    ],
  },
  {
    question: "How to change settings?",
    slides: [
      "assets/help-center/q4-slide-1.png",
      "assets/help-center/q4-slide-2.png",
      "assets/help-center/q4-slide-3.png",
    ],
  },
  {
    question: "How to track completed projects?",
    slides: [
      "assets/help-center/q5-slide-1.png",
      "assets/help-center/q5-slide-2.png",
      "assets/help-center/q5-slide-3.png",
    ],
  },
  {
    question: "How to track projects lists?",
    slides: [
      "assets/help-center/q6-slide-1.png",
      "assets/help-center/q6-slide-2.png",
      "assets/help-center/q6-slide-3.png",
      "assets/help-center/q6-slide-4.png",
      "assets/help-center/q6-slide-5.png",
      "assets/help-center/q6-slide-6.png",
      "assets/help-center/q6-slide-7.png",
      "assets/help-center/q6-slide-8.png",
      "assets/help-center/q6-slide-9.png",
      "assets/help-center/q6-slide-10.png",
      "assets/help-center/q6-slide-11.png",
      "assets/help-center/q6-slide-12.png",
    ],
  },
];

// State
let _currentQuestion = null;
let _currentSlide = 0;

function renderHelpList() {
  const items = FAQ_DATA.map(
    (faq, i) => `
    <button class="hc-list-item" onclick="helpCenterOpenQuestion(${i})">
      <span class="hc-list-text">${faq.question}</span>
      <span class="hc-list-arrow">&#8250;</span>
    </button>
  `
  ).join("");

  return `
    <div class="hc-modal-inner">
      <div class="hc-header">
        <h2 class="hc-title">FAQ / Help Center</h2>
        <button class="hc-close-btn" onclick="closeHelpCenter()" aria-label="Close">&#x2715;</button>
      </div>
      <div class="hc-list">
        ${items}
      </div>
    </div>
  `;
}

function renderHelpSlide(questionIndex, slideIndex) {
  const faq = FAQ_DATA[questionIndex];
  const total = faq.slides.length;
  const imgSrc = faq.slides[slideIndex];

  const hasPrev = slideIndex > 0;
  const hasNext = slideIndex < total - 1;

  return `
    <div class="hc-modal-inner hc-modal-inner--slide">
      <div class="hc-header">
        <button class="hc-back-btn" onclick="helpCenterBackToList()" aria-label="Back">&#8592; Back</button>
        <button class="hc-close-btn" onclick="closeHelpCenter()" aria-label="Close">&#x2715;</button>
      </div>
      <div class="hc-slide-container">
        ${hasPrev ? `<button class="hc-nav-btn hc-nav-btn--prev" onclick="helpCenterGoSlide(${questionIndex}, ${slideIndex - 1})" aria-label="Previous">&#171;</button>` : `<div class="hc-nav-btn hc-nav-btn--placeholder"></div>`}
        <div class="hc-slide-content">
          <img src="${imgSrc}" alt="Step ${slideIndex + 1}" class="hc-slide-img" />
        </div>
        ${hasNext ? `<button class="hc-nav-btn hc-nav-btn--next" onclick="helpCenterGoSlide(${questionIndex}, ${slideIndex + 1})" aria-label="Next">&#187;</button>` : `<div class="hc-nav-btn hc-nav-btn--placeholder"></div>`}
      </div>
      <div class="hc-slide-dots">
        ${faq.slides.map((_, i) => `<span class="hc-dot ${i === slideIndex ? "hc-dot--active" : ""}" onclick="helpCenterGoSlide(${questionIndex}, ${i})"></span>`).join("")}
      </div>
    </div>
  `;
}

function openHelpCenter() {
  _currentQuestion = null;
  _currentSlide = 0;

  let overlay = document.getElementById("hc-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "hc-overlay";
    overlay.className = "hc-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeHelpCenter();
    });
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = renderHelpList();
  overlay.classList.add("hc-overlay--visible");
  document.body.classList.add("hc-no-scroll");
}

window.helpCenterOpenQuestion = function (index) {
  _currentQuestion = index;
  _currentSlide = 0;
  const overlay = document.getElementById("hc-overlay");
  if (overlay) overlay.innerHTML = renderHelpSlide(index, 0);
};

window.helpCenterGoSlide = function (questionIndex, slideIndex) {
  _currentSlide = slideIndex;
  const overlay = document.getElementById("hc-overlay");
  if (overlay) overlay.innerHTML = renderHelpSlide(questionIndex, slideIndex);
};

window.helpCenterBackToList = function () {
  _currentQuestion = null;
  const overlay = document.getElementById("hc-overlay");
  if (overlay) overlay.innerHTML = renderHelpList();
};

window.closeHelpCenter = function () {
  const overlay = document.getElementById("hc-overlay");
  if (overlay) {
    overlay.classList.remove("hc-overlay--visible");
    document.body.classList.remove("hc-no-scroll");
  }
};

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeHelpCenter();
});

window.openHelpCenter = openHelpCenter;
