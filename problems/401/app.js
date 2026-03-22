/**
 * LeetViz — #401 Binary Watch
 * Iterates through all hour/minute combos, counts set bits,
 * and animates which LED combinations produce valid times.
 */
(() => {
  'use strict';

  // ===== DOM =====
  const turnedOnSlider = document.getElementById('turnedOnSlider');
  const turnedOnValue = document.getElementById('turnedOnValue');
  const btnVisualize = document.getElementById('btnVisualize');
  const btnReset = document.getElementById('btnReset');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const statusBar = document.getElementById('statusBar');
  const watchTime = document.getElementById('watchTime');
  const hourLeds = document.getElementById('hourLeds');
  const minuteLeds = document.getElementById('minuteLeds');
  const timesPanel = document.getElementById('timesPanel');
  const timesGrid = document.getElementById('timesGrid');
  const timesCount = document.getElementById('timesCount');
  const resultCard = document.getElementById('resultCard');
  const resultValue = document.getElementById('resultValue');
  const hintsRevealed = document.getElementById('hintsRevealed');
  const hintsProgressFill = document.getElementById('hintsProgressFill');

  // ===== State =====
  let speed = 2;
  let isPlaying = false;
  let playTimer = null;
  let steps = [];
  let stepIndex = -1;
  let validTimes = [];

  // ===== Helpers =====
  function popcount(x) {
    let count = 0;
    while (x) {
      count += x & 1;
      x >>= 1;
    }
    return count;
  }

  function formatTime(h, m) {
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  function setLeds(h, m) {
    const hLeds = hourLeds.querySelectorAll('.led');
    const mLeds = minuteLeds.querySelectorAll('.led');

    hLeds.forEach(led => {
      const bit = parseInt(led.dataset.bit);
      led.classList.toggle('on', (h >> bit) & 1);
    });

    mLeds.forEach(led => {
      const bit = parseInt(led.dataset.bit);
      led.classList.toggle('on', (m >> bit) & 1);
    });
  }

  function clearLeds() {
    hourLeds.querySelectorAll('.led').forEach(l => {
      l.classList.remove('on', 'checking');
    });
    minuteLeds.querySelectorAll('.led').forEach(l => {
      l.classList.remove('on', 'checking');
    });
  }

  // ===== Build steps =====
  function buildSteps() {
    const turnedOn = parseInt(turnedOnSlider.value, 10);
    steps = [];
    validTimes = [];

    steps.push({
      type: 'start',
      turnedOn,
      msg: `Finding all times where exactly <strong>${turnedOn}</strong> LED(s) are on…`
    });

    for (let h = 0; h < 12; h++) {
      for (let m = 0; m < 60; m++) {
        const hBits = popcount(h);
        const mBits = popcount(m);
        const total = hBits + mBits;

        if (total === turnedOn) {
          const time = formatTime(h, m);
          validTimes.push(time);

          steps.push({
            type: 'found',
            h, m, hBits, mBits,
            time,
            timeIndex: validTimes.length - 1,
            msg: `<strong>${time}</strong> — hour ${h} has ${hBits} bit(s), minute ${m} has ${mBits} bit(s) = <strong>${total}</strong> ✓`
          });
        }
      }
    }

    steps.push({
      type: 'result',
      count: validTimes.length,
      times: [...validTimes],
      msg: validTimes.length > 0
        ? `Found <strong>${validTimes.length}</strong> valid time(s)!`
        : `No valid times for turnedOn = <strong>${turnedOn}</strong>`
    });
  }

  // ===== Prepare times grid =====
  function prepareTimesGrid() {
    timesGrid.innerHTML = '';
    timesPanel.style.display = validTimes.length > 0 ? '' : 'none';
    timesCount.textContent = validTimes.length;

    validTimes.forEach(t => {
      const chip = document.createElement('div');
      chip.className = 'time-chip';
      chip.textContent = t;
      chip.dataset.time = t;
      timesGrid.appendChild(chip);
    });
  }

  // ===== Apply step =====
  function applyStep(step) {
    switch (step.type) {
      case 'start':
        clearLeds();
        prepareTimesGrid();
        watchTime.textContent = '—:——';
        watchTime.className = 'watch__time';
        break;

      case 'found': {
        setLeds(step.h, step.m);
        watchTime.textContent = step.time;
        watchTime.className = 'watch__time valid';

        // Highlight the chip
        const chips = timesGrid.querySelectorAll('.time-chip');
        chips.forEach(c => c.classList.remove('active'));
        if (chips[step.timeIndex]) {
          chips[step.timeIndex].classList.add('show', 'active');
        }
        break;
      }

      case 'result': {
        clearLeds();
        watchTime.textContent = '—:——';
        watchTime.className = 'watch__time';

        // Show all chips
        timesGrid.querySelectorAll('.time-chip').forEach(c => {
          c.classList.add('show');
          c.classList.remove('active');
        });

        resultCard.style.display = '';
        resultValue.textContent = step.count > 0
          ? `${step.count} time(s): [${step.times.map(t => `"${t}"`).join(', ')}]`
          : '[] (empty)';
        break;
      }
    }

    if (step.msg) {
      statusBar.innerHTML = step.msg;
    }
  }

  // ===== Controls =====
  function getDelay() {
    return 400 / speed;
  }

  function doStep() {
    if (stepIndex >= steps.length - 1) {
      stopPlaying();
      return false;
    }
    stepIndex++;
    applyStep(steps[stepIndex]);
    return stepIndex < steps.length - 1;
  }

  function startPlaying() {
    if (isPlaying) return;
    isPlaying = true;
    btnVisualize.querySelector('.btn__icon').textContent = '⏸';

    function tick() {
      if (!isPlaying) return;
      const hasMore = doStep();
      if (hasMore) {
        playTimer = setTimeout(tick, getDelay());
      } else {
        stopPlaying();
      }
    }
    tick();
  }

  function stopPlaying() {
    isPlaying = false;
    clearTimeout(playTimer);
    playTimer = null;
    btnVisualize.querySelector('.btn__icon').textContent = '▶';
  }

  function reset() {
    stopPlaying();
    stepIndex = -1;
    clearLeds();
    watchTime.textContent = '—:——';
    watchTime.className = 'watch__time';
    timesGrid.innerHTML = '';
    timesPanel.style.display = 'none';
    resultCard.style.display = 'none';
    statusBar.innerHTML = 'Adjust <strong>turnedOn</strong> and click <strong>Visualize</strong>';
  }

  // ===== Hints =====
  function initHints() {
    const hints = document.querySelectorAll('.hint');
    let revealedCount = 0;

    hints.forEach((hint) => {
      hint.addEventListener('click', () => {
        if (hint.classList.contains('locked') || hint.classList.contains('revealed')) return;

        hint.classList.add('revealed');
        revealedCount++;
        hintsRevealed.textContent = revealedCount;
        hintsProgressFill.style.width = (revealedCount / hints.length * 100) + '%';

        const nextHintNum = parseInt(hint.dataset.hint) + 1;
        const nextHint = document.querySelector(`.hint[data-hint="${nextHintNum}"]`);
        if (nextHint) {
          nextHint.classList.remove('locked');
        }
      });
    });
  }

  // ===== Event Listeners =====
  turnedOnSlider.addEventListener('input', () => {
    turnedOnValue.textContent = turnedOnSlider.value;
  });

  btnVisualize.addEventListener('click', () => {
    if (isPlaying) {
      stopPlaying();
    } else {
      reset();
      buildSteps();
      startPlaying();
    }
  });

  btnReset.addEventListener('click', reset);

  speedSlider.addEventListener('input', () => {
    speed = parseInt(speedSlider.value, 10);
    speedValue.textContent = speed + '×';
  });

  // ===== Init =====
  initHints();
  reset();
})();
