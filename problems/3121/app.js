(() => {
  "use strict";

  const ALPHA = 26;
  const A_CODE = "a".charCodeAt(0);
  const TOTAL_SPECIAL_POSSIBLE = 26;

  const $ = (selector) => document.querySelector(selector);

  const wordInput = $("#wordInput");
  const wordLength = $("#wordLength");
  const speedSlider = $("#speedSlider");
  const speedValue = $("#speedValue");
  const btnPlay = $("#btnPlay");
  const btnStep = $("#btnStep");
  const btnReset = $("#btnReset");
  const presetButtons = document.querySelectorAll(".preset-btn");

  const wordStrip = $("#wordStrip");
  const lettersGrid = $("#lettersGrid");
  const statusLine = $("#statusLine");
  const stepValue = $("#stepValue");
  const specialCount = $("#specialCount");
  const specialCountBar = $("#specialCountBar");

  const hintsContainer = $("#hintsContainer");
  const hintsCount = $("#hintsCount");
  const hintsProgressFill = $("#hintsProgressFill");

  const state = {
    word: "",
    chars: [],
    currentIndex: -1,
    playing: false,
    speed: 2,
    rafId: 0,
    lastTickTs: 0,
    lastLower: new Array(ALPHA).fill(-1),
    firstUpper: new Array(ALPHA).fill(-1),
    revealedHints: 0,
    encountered: new Set(),
  };

  function sanitizeWord(raw) {
    return (raw || "").replace(/[^a-zA-Z]/g, "").slice(0, 80);
  }

  function letterIndex(ch) {
    return ch.toLowerCase().charCodeAt(0) - A_CODE;
  }

  function isLower(ch) {
    return ch >= "a" && ch <= "z";
  }

  function getLetterStatus(index) {
    const low = state.lastLower[index];
    const up = state.firstUpper[index];

    if (low !== -1 && up !== -1 && low < up) return "special";
    if (low !== -1 && up !== -1 && low > up) return "blocked";
    if (low !== -1 && up === -1) return "waiting-upper";
    if (low === -1 && up !== -1) return "waiting-lower";
    return "unseen";
  }

  function computeSpecialCount() {
    let count = 0;
    for (let i = 0; i < ALPHA; i++) {
      if (
        state.lastLower[i] !== -1 &&
        state.firstUpper[i] !== -1 &&
        state.lastLower[i] < state.firstUpper[i]
      ) {
        count++;
      }
    }
    return count;
  }

  function statusLabel(status) {
    if (status === "special") return "special";
    if (status === "blocked") return "invalid";
    if (status === "waiting-upper") return "need uppercase";
    if (status === "waiting-lower") return "need lowercase";
    return "unseen";
  }

  function posText(pos) {
    return pos === -1 ? "-" : String(pos);
  }

  function intervalMs() {
    return 950 / state.speed;
  }

  function updateCounters() {
    const currentCount = computeSpecialCount();
    specialCount.textContent = String(currentCount);
    specialCountBar.style.width = `${(currentCount / TOTAL_SPECIAL_POSSIBLE) * 100}%`;

    const total = state.chars.length;
    const done = Math.max(0, state.currentIndex + 1);
    stepValue.textContent = `${done} / ${total}`;

    speedValue.textContent = `${state.speed}x`;
    wordLength.textContent = `${total} chars`;
  }

  function renderWordStrip() {
    wordStrip.innerHTML = "";

    state.chars.forEach((ch, index) => {
      const box = document.createElement("div");
      box.className = "char-box";
      if (index < state.currentIndex) box.classList.add("done");
      if (index === state.currentIndex) box.classList.add("active");

      const chNode = document.createElement("div");
      chNode.className = "char-box__ch";
      chNode.textContent = ch;

      const idxNode = document.createElement("div");
      idxNode.className = "char-box__idx";
      idxNode.textContent = String(index);

      box.appendChild(chNode);
      box.appendChild(idxNode);
      wordStrip.appendChild(box);
    });
  }

  function encounteredLettersSorted() {
    return Array.from(state.encountered).sort((a, b) => a - b);
  }

  function renderLetters() {
    lettersGrid.innerHTML = "";

    const letters = encounteredLettersSorted();
    if (letters.length === 0) {
      const empty = document.createElement("div");
      empty.className = "status-line";
      empty.textContent =
        "No letters processed yet. The tracker cards appear as soon as a letter is scanned.";
      lettersGrid.appendChild(empty);
      return;
    }

    letters.forEach((idx) => {
      const lower = String.fromCharCode(A_CODE + idx);
      const upper = lower.toUpperCase();
      const status = getLetterStatus(idx);

      const card = document.createElement("article");
      card.className = "letter-card";
      if (status === "special") card.classList.add("special");
      if (status === "blocked") card.classList.add("blocked");

      const activeChar =
        state.currentIndex >= 0 ? state.chars[state.currentIndex] : "";
      if (activeChar && letterIndex(activeChar) === idx) {
        card.classList.add("active");
      }

      card.innerHTML = `
        <div class="letter-card__head">
          <div class="letter-card__title">${lower} / ${upper}</div>
          <div class="letter-card__badge">${statusLabel(status)}</div>
        </div>
        <div class="letter-card__meta">
          <span>lastLower: ${posText(state.lastLower[idx])}</span>
          <span>firstUpper: ${posText(state.firstUpper[idx])}</span>
        </div>
      `;

      lettersGrid.appendChild(card);
    });
  }

  function setStatus(message) {
    statusLine.textContent = message;
  }

  function processCurrentChar() {
    const ch = state.chars[state.currentIndex];
    const idx = letterIndex(ch);
    const beforeLower = state.lastLower[idx];
    const beforeUpper = state.firstUpper[idx];

    state.encountered.add(idx);

    if (isLower(ch)) {
      state.lastLower[idx] = state.currentIndex;
      if (state.firstUpper[idx] === -1) {
        setStatus(
          `Index ${state.currentIndex}: '${ch}' is lowercase. Update lastLower(${ch}) to ${state.currentIndex}.`,
        );
      } else {
        setStatus(
          `Index ${state.currentIndex}: '${ch}' appears after first uppercase at ${state.firstUpper[idx]}, so '${ch}' can no longer be special.`,
        );
      }
    } else if (beforeUpper === -1) {
      state.firstUpper[idx] = state.currentIndex;
      setStatus(
        `Index ${state.currentIndex}: '${ch}' is first uppercase for '${ch.toLowerCase()}'. Set firstUpper to ${state.currentIndex}.`,
      );
    } else {
      setStatus(
        `Index ${state.currentIndex}: '${ch}' uppercase repeats. firstUpper remains ${beforeUpper}.`,
      );
    }

    if (beforeLower === -1 && isLower(ch)) {
      const lower = ch;
      setStatus(
        `${statusLine.textContent} This is the first lowercase for '${lower}'.`,
      );
    }
  }

  function stepForward() {
    if (state.currentIndex >= state.chars.length - 1) {
      stopPlay();
      const finalCount = computeSpecialCount();
      setStatus(`Finished scan. Final special letters count: ${finalCount}.`);
      updateCounters();
      renderWordStrip();
      renderLetters();
      return false;
    }

    state.currentIndex += 1;
    processCurrentChar();
    updateCounters();
    renderWordStrip();
    renderLetters();
    return true;
  }

  function stopPlay() {
    state.playing = false;
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
    btnPlay.querySelector(".btn__icon").textContent = "▶";
  }

  function playTick(timestamp) {
    if (!state.playing) return;

    if (!state.lastTickTs) {
      state.lastTickTs = timestamp;
    }

    const elapsed = timestamp - state.lastTickTs;
    if (elapsed >= intervalMs()) {
      state.lastTickTs = timestamp;
      const hasMore = stepForward();
      if (!hasMore) return;
    }

    state.rafId = requestAnimationFrame(playTick);
  }

  function startPlay() {
    if (state.playing) return;
    if (state.chars.length === 0) return;

    if (state.currentIndex >= state.chars.length - 1) {
      resetSimulation();
    }

    state.playing = true;
    state.lastTickTs = 0;
    btnPlay.querySelector(".btn__icon").textContent = "⏸";
    state.rafId = requestAnimationFrame(playTick);
  }

  function resetSimulation() {
    stopPlay();
    state.currentIndex = -1;
    state.lastLower = new Array(ALPHA).fill(-1);
    state.firstUpper = new Array(ALPHA).fill(-1);
    state.encountered.clear();

    setStatus("Press Play or Step to begin scanning.");
    updateCounters();
    renderWordStrip();
    renderLetters();
  }

  function applyWordAndReset(word) {
    const clean = sanitizeWord(word);
    state.word = clean;
    state.chars = clean.split("");
    wordInput.value = clean;
    resetSimulation();
  }

  function initHints() {
    state.revealedHints = 0;
    const hintEls = hintsContainer.querySelectorAll(".hint");

    hintEls.forEach((hint, index) => {
      hint.classList.remove("revealed");
      if (index === 0) {
        hint.classList.remove("locked");
      } else {
        hint.classList.add("locked");
      }

      hint.addEventListener("click", () => {
        if (
          hint.classList.contains("locked") ||
          hint.classList.contains("revealed")
        ) {
          return;
        }

        hint.classList.add("revealed");
        state.revealedHints += 1;

        const next = hintsContainer.querySelector(
          `.hint[data-hint="${index + 1}"]`,
        );
        if (next) next.classList.remove("locked");

        hintsCount.textContent = `${state.revealedHints} / 5 revealed`;
        hintsProgressFill.style.width = `${(state.revealedHints / 5) * 100}%`;
      });
    });

    hintsCount.textContent = "0 / 5 revealed";
    hintsProgressFill.style.width = "0%";
  }

  function bindEvents() {
    btnPlay.addEventListener("click", () => {
      if (state.playing) {
        stopPlay();
      } else {
        startPlay();
      }
    });

    btnStep.addEventListener("click", () => {
      if (state.playing) stopPlay();
      if (state.chars.length === 0) return;
      stepForward();
    });

    btnReset.addEventListener("click", () => {
      resetSimulation();
    });

    speedSlider.addEventListener("input", () => {
      state.speed = parseInt(speedSlider.value, 10);
      updateCounters();
    });

    wordInput.addEventListener("input", () => {
      applyWordAndReset(wordInput.value);
    });

    presetButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        applyWordAndReset(btn.dataset.word || "");
      });
    });
  }

  function init() {
    state.speed = parseInt(speedSlider.value, 10);
    bindEvents();
    initHints();
    applyWordAndReset(wordInput.value);
  }

  init();
})();
