/* =========================================================
   Typing Test – script.js
   Vanilla JavaScript, no dependencies.
   ========================================================= */

(function () {
  "use strict";

  // ---------- Sample paragraphs ----------
  const PARAGRAPHS = [
    "The quick brown fox jumps over the lazy dog while the morning sun rises slowly above the quiet hills, painting the sky in soft shades of orange and gold.",
    "Learning to type quickly is a valuable skill that saves time every day. With regular practice, your fingers will remember the position of each key without you looking down.",
    "Technology has changed the way we work, learn and communicate. A simple message can now travel across the world in a fraction of a second.",
    "A journey of a thousand miles begins with a single step. Keep practicing every day, stay patient with yourself, and you will notice steady improvement over time.",
    "Good code is like a good story: clear, simple and easy to follow. Take the time to name things well and write comments that explain why, not just what.",
    "The library was silent except for the soft turning of pages. Outside, rain tapped gently against the windows as readers lost themselves in faraway worlds.",
    "Healthy habits are built one day at a time. Drink enough water, get plenty of sleep, take short breaks from your screen and move your body whenever you can.",
    "Mountains, rivers and forests shape the character of a country. Travelers often say the best memories come from unplanned detours and friendly conversations along the way."
  ];

  const STORAGE_KEY = "typingTest.bestWpm";
  const CHARS_PER_WORD = 5; // standard WPM convention

  // ---------- DOM elements ----------
  const $ = (id) => document.getElementById(id);
  const textDisplay = $("text-display");
  const input = $("typing-input");
  const timeEl = $("time");
  const wpmEl = $("wpm");
  const accuracyEl = $("accuracy");
  const errorsEl = $("errors");
  const bestEl = $("best");
  const progressBar = $("progress-bar");
  const startBtn = $("start-btn");
  const restartBtn = $("restart-btn");
  const resetBtn = $("reset-btn");
  const durationButtons = document.querySelectorAll(".chip");
  const resultsOverlay = $("results");
  const finalWpmEl = $("final-wpm");
  const finalAccuracyEl = $("final-accuracy");
  const finalErrorsEl = $("final-errors");
  const finalCharsEl = $("final-chars");
  const newBestEl = $("new-best");
  const tryAgainBtn = $("try-again-btn");
  const closeBtn = $("close-btn");

  // ---------- State ----------
  let duration = 60;          // selected test length in seconds
  let timeLeft = duration;    // seconds remaining
  let timerId = null;         // setInterval id
  let startTime = 0;          // timestamp when the test began
  let isRunning = false;
  let isFinished = false;
  let targetText = "";        // text the user must type
  let lastParagraphIndex = -1;

  // ---------- localStorage helpers (safe in private mode) ----------
  function getBestWpm() {
    try {
      const value = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBestWpm(value) {
    try { localStorage.setItem(STORAGE_KEY, String(value)); } catch (e) { /* ignore */ }
  }

  function clearBestWpm() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  // ---------- Paragraph handling ----------
  // Pick a random paragraph, avoiding an immediate repeat.
  function pickParagraph() {
    let index;
    do {
      index = Math.floor(Math.random() * PARAGRAPHS.length);
    } while (PARAGRAPHS.length > 1 && index === lastParagraphIndex);
    lastParagraphIndex = index;
    return PARAGRAPHS[index];
  }

  // Render the target text as one <span> per character.
  function renderText() {
    const typed = input.value;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < targetText.length; i++) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = targetText[i];

      if (i < typed.length) {
        span.classList.add(typed[i] === targetText[i] ? "correct" : "incorrect");
      } else if (i === typed.length && !isFinished) {
        span.classList.add("current");
      }
      fragment.appendChild(span);
    }

    textDisplay.replaceChildren(fragment);

    // Keep the current character visible inside the scrolling box.
    const current = textDisplay.querySelector(".current");
    if (current) {
      const offset = current.offsetTop - textDisplay.clientHeight / 2;
      textDisplay.scrollTop = Math.max(0, offset);
    }
  }

  // ---------- Statistics ----------
  // Compare typed text with the target and count correct / incorrect characters.
  function getCounts() {
    const typed = input.value;
    let correct = 0;
    let errors = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === targetText[i]) correct++;
      else errors++;
    }
    return { typed: typed.length, correct, errors };
  }

  function calcAccuracy(typed, correct) {
    if (typed === 0) return 100; // empty input handled safely
    return Math.max(0, Math.min(100, Math.round((correct / typed) * 100)));
  }

  // Standard WPM: (correct characters / 5) / minutes elapsed.
  function calcWpm(correct, elapsedSeconds) {
    if (elapsedSeconds <= 0 || correct <= 0) return 0;
    const minutes = Math.max(elapsedSeconds, 1) / 60; // avoid huge values in first second
    return Math.max(0, Math.round(correct / CHARS_PER_WORD / minutes));
  }

  function getElapsedSeconds() {
    if (!startTime) return 0;
    return Math.min((Date.now() - startTime) / 1000, duration);
  }

  function updateStats() {
    const { typed, correct, errors } = getCounts();
    wpmEl.textContent = calcWpm(correct, getElapsedSeconds());
    accuracyEl.textContent = calcAccuracy(typed, correct) + "%";
    errorsEl.textContent = errors;
  }

  function updateTimerDisplay() {
    timeEl.textContent = timeLeft;
    timeEl.classList.toggle("warning", isRunning && timeLeft <= 5 && timeLeft > 0);
    const percent = Math.max(0, Math.min(100, (timeLeft / duration) * 100));
    progressBar.style.width = percent + "%";
  }

  // ---------- Timer ----------
  function startTimer() {
    if (isRunning || isFinished) return;
    isRunning = true;
    startTime = Date.now();
    setDurationButtonsDisabled(true);

    // Use timestamps instead of counting ticks to avoid drift.
    timerId = setInterval(() => {
      const remaining = duration - (Date.now() - startTime) / 1000;
      timeLeft = Math.max(0, Math.ceil(remaining)); // never negative
      updateTimerDisplay();
      updateStats();
      if (remaining <= 0) endTest();
    }, 200);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  // ---------- Test lifecycle ----------
  function setDurationButtonsDisabled(disabled) {
    durationButtons.forEach((btn) => { btn.disabled = disabled; });
  }

  // Prepare a fresh test. newParagraph=false keeps the same text.
  function prepareTest(newParagraph) {
    stopTimer();
    isRunning = false;
    isFinished = false;
    startTime = 0;
    timeLeft = duration;

    if (newParagraph || !targetText) targetText = pickParagraph();

    input.value = "";
    input.disabled = false;
    resultsOverlay.classList.add("hidden");
    setDurationButtonsDisabled(false);

    wpmEl.textContent = "0";
    accuracyEl.textContent = "100%";
    errorsEl.textContent = "0";
    bestEl.textContent = getBestWpm();

    updateTimerDisplay();
    renderText();
    textDisplay.scrollTop = 0;
  }

  function endTest() {
    if (isFinished) return;
    stopTimer();
    isRunning = false;
    isFinished = true;
    timeLeft = 0;
    input.disabled = true; // disable typing after the timer ends

    const { typed, correct, errors } = getCounts();
    const finalWpm = calcWpm(correct, duration);
    const finalAccuracy = calcAccuracy(typed, correct);

    // Update live display with final values
    updateTimerDisplay();
    wpmEl.textContent = finalWpm;
    accuracyEl.textContent = finalAccuracy + "%";
    errorsEl.textContent = errors;
    renderText();

    // Best score
    const previousBest = getBestWpm();
    const isNewBest = finalWpm > previousBest;
    if (isNewBest) saveBestWpm(finalWpm);
    bestEl.textContent = Math.max(previousBest, finalWpm);

    // Results screen
    finalWpmEl.textContent = finalWpm;
    finalAccuracyEl.textContent = finalAccuracy + "%";
    finalErrorsEl.textContent = errors;
    finalCharsEl.textContent = typed;
    newBestEl.classList.toggle("hidden", !(isNewBest && finalWpm > 0));
    resultsOverlay.classList.remove("hidden");
    tryAgainBtn.focus();
  }

  // ---------- Event handlers ----------
  // Typing begins the test automatically.
  input.addEventListener("input", () => {
    if (isFinished) return;
    if (!isRunning) startTimer();

    // If the user finishes the paragraph early, add another one.
    if (input.value.length >= targetText.length) {
      targetText += " " + pickParagraph();
    }

    renderText();
    updateStats();
  });

  // Block pasting so results stay honest.
  input.addEventListener("paste", (e) => e.preventDefault());
  input.addEventListener("drop", (e) => e.preventDefault());

  // Start: begin the countdown right away and focus the input.
  startBtn.addEventListener("click", () => {
    if (isFinished) prepareTest(true);
    input.focus();
    startTimer();
  });

  // Restart: new random paragraph, same duration.
  restartBtn.addEventListener("click", () => {
    prepareTest(true);
    input.focus();
  });

  // Reset: back to defaults (60s, new paragraph) and clear best score.
  resetBtn.addEventListener("click", () => {
    if (!window.confirm("Reset settings and clear your best score?")) return;
    clearBestWpm();
    setDuration(60);
    prepareTest(true);
  });

  // Duration buttons
  function setDuration(seconds) {
    duration = seconds;
    durationButtons.forEach((btn) => {
      const active = Number(btn.dataset.duration) === seconds;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  durationButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isRunning) return; // can't change mid-test
      setDuration(Number(btn.dataset.duration));
      prepareTest(false);
      input.focus();
    });
  });

  // Results modal buttons
  tryAgainBtn.addEventListener("click", () => {
    prepareTest(true);
    input.focus();
  });

  closeBtn.addEventListener("click", () => {
    resultsOverlay.classList.add("hidden");
    restartBtn.focus();
  });

  // Escape closes the results screen.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !resultsOverlay.classList.contains("hidden")) {
      resultsOverlay.classList.add("hidden");
    }
  });

  // Clicking the text box focuses the input.
  textDisplay.addEventListener("click", () => { if (!isFinished) input.focus(); });

  // ---------- Init ----------
  prepareTest(true);
})();