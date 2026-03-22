/**
 * LeetViz — #6 Zigzag Conversion Visualizer
 * Visualizes placing characters into a zigzag grid and reading row-by-row.
 *
 * The string is written in a zigzag pattern on N rows, then concatenated
 * row by row to produce the output.
 */
(() => {
  'use strict';

  // ===== DOM References =====
  const stringInput = document.getElementById('stringInput');
  const rowsSlider = document.getElementById('rowsSlider');
  const rowsValue = document.getElementById('rowsValue');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const btnPlay = document.getElementById('btnPlay');
  const btnStep = document.getElementById('btnStep');
  const btnReset = document.getElementById('btnReset');
  const zigzagGrid = document.getElementById('zigzagGrid');
  const statusBar = document.getElementById('statusBar');
  const readPanel = document.getElementById('readPanel');
  const readRows = document.getElementById('readRows');
  const resultCard = document.getElementById('resultCard');
  const resultValue = document.getElementById('resultValue');
  const hintsRevealed = document.getElementById('hintsRevealed');
  const hintsProgressFill = document.getElementById('hintsProgressFill');

  // ===== State =====
  let str = '';
  let numRows = 3;
  let speed = 1;
  let steps = [];
  let stepIndex = -1;
  let isPlaying = false;
  let playTimer = null;

  // grid[row][col] = { char, originalIndex }
  let grid = [];
  let gridCols = 0;
  let cells = []; // 2D array of DOM cell elements

  // ===== Compute zigzag placement =====
  function computeZigzag() {
    const n = str.length;
    if (n === 0) { gridCols = 0; grid = []; return []; }

    if (numRows <= 1 || numRows >= n) {
      // Trivial cases
      gridCols = n;
      grid = [];
      for (let r = 0; r < Math.min(numRows, n); r++) {
        grid[r] = new Array(gridCols).fill(null);
      }
      // If single row, all chars in row 0
      if (numRows === 1) {
        for (let i = 0; i < n; i++) {
          grid[0][i] = { char: str[i], idx: i };
        }
      } else {
        // More rows than chars, each char on its own row, column 0
        gridCols = 1;
        grid = [];
        for (let r = 0; r < numRows; r++) {
          grid[r] = [null];
        }
        for (let i = 0; i < n; i++) {
          grid[i][0] = { char: str[i], idx: i };
        }
      }
      return;
    }

    // Normal zigzag computation
    const cycleLen = 2 * numRows - 2;
    let col = 0;
    const positions = [];

    for (let i = 0; i < n; i++) {
      const posInCycle = i % cycleLen;
      let row;
      if (posInCycle < numRows) {
        row = posInCycle;
      } else {
        row = cycleLen - posInCycle;
      }

      // Column logic: going down shares a column, going up gets new columns
      if (i > 0) {
        const prevPosInCycle = (i - 1) % cycleLen;
        if (posInCycle === 0) {
          col++; // new cycle starts new column
        } else if (posInCycle >= numRows) {
          col++; // going up, each gets own column
        }
        // going down (posInCycle 1..numRows-1) stays in same column
      }

      positions.push({ row, col, char: str[i], idx: i });
    }

    gridCols = col + 1;
    grid = [];
    for (let r = 0; r < numRows; r++) {
      grid[r] = new Array(gridCols).fill(null);
    }

    for (const p of positions) {
      grid[p.row][p.col] = { char: p.char, idx: p.idx };
    }

    return positions;
  }

  // ===== Build steps =====
  function buildSteps() {
    steps = [];
    const n = str.length;

    if (n === 0) {
      steps.push({ type: 'result', output: '', msg: 'Empty string → empty output' });
      return;
    }

    if (numRows === 1) {
      for (let i = 0; i < n; i++) {
        steps.push({
          type: 'place', charIdx: i, char: str[i], row: 0, col: i,
          msg: `Place '<strong>${str[i]}</strong>' at row 0 — single row mode`
        });
      }
    } else if (numRows >= n) {
      for (let i = 0; i < n; i++) {
        steps.push({
          type: 'place', charIdx: i, char: str[i], row: i, col: 0,
          msg: `Place '<strong>${str[i]}</strong>' at row ${i} — more rows than characters`
        });
      }
    } else {
      const cycleLen = 2 * numRows - 2;
      let col = 0;

      for (let i = 0; i < n; i++) {
        const posInCycle = i % cycleLen;
        let row = posInCycle < numRows ? posInCycle : cycleLen - posInCycle;

        if (i > 0) {
          if (posInCycle === 0) col++;
          else if (posInCycle >= numRows) col++;
        }

        const direction = posInCycle < numRows ? 'down ↓' : 'up ↗';

        steps.push({
          type: 'place', charIdx: i, char: str[i], row, col, direction,
          msg: `Place '<strong>${str[i]}</strong>' at row ${row} (going ${direction}) — index ${i}`
        });
      }
    }

    // Reading phase
    steps.push({ type: 'start-read', msg: 'Now reading the grid <strong>row by row</strong> to form the output…' });

    let output = '';
    for (let r = 0; r < numRows; r++) {
      if (!grid[r]) continue;
      steps.push({ type: 'read-row-start', row: r, msg: `Reading <strong>Row ${r}</strong>…` });
      for (let c = 0; c < gridCols; c++) {
        if (grid[r] && grid[r][c]) {
          output += grid[r][c].char;
          steps.push({
            type: 'read-char', row: r, col: c, char: grid[r][c].char, outputSoFar: output,
            msg: `Read '<strong>${grid[r][c].char}</strong>' from row ${r} → "<code>${output}</code>"`
          });
        }
      }
    }

    steps.push({ type: 'result', output, msg: `Final output: "<strong>${output}</strong>"` });
  }

  // ===== Render grid DOM =====
  function renderGrid() {
    zigzagGrid.innerHTML = '';
    cells = [];

    if (str.length === 0 || gridCols === 0) {
      zigzagGrid.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:2rem;">Enter a string above</div>';
      return;
    }

    const rowCount = Math.min(numRows, str.length);
    zigzagGrid.style.gridTemplateColumns = `repeat(${gridCols}, 32px)`;
    zigzagGrid.style.gridTemplateRows = `repeat(${rowCount}, 32px)`;

    for (let r = 0; r < rowCount; r++) {
      cells[r] = [];
      for (let c = 0; c < gridCols; c++) {
        const cell = document.createElement('div');
        cell.className = 'zigzag-cell empty';
        cell.dataset.row = r;
        cell.dataset.col = c;
        zigzagGrid.appendChild(cell);
        cells[r][c] = cell;
      }
    }
  }

  // ===== Apply step =====
  function applyStep(step) {
    // Clear previous active states
    document.querySelectorAll('.zigzag-cell.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.zigzag-cell.active-read').forEach(el => el.classList.remove('active-read'));

    switch (step.type) {
      case 'place': {
        const cell = cells[step.row]?.[step.col];
        if (cell) {
          cell.textContent = step.char;
          cell.className = 'zigzag-cell placed active';
        }
        break;
      }

      case 'start-read': {
        readPanel.style.display = '';
        renderReadPanel();
        document.querySelectorAll('.zigzag-cell.placed').forEach(el => {
          el.classList.remove('active');
        });
        break;
      }

      case 'read-row-start': {
        document.querySelectorAll('.read-row').forEach(el => el.classList.remove('active-row'));
        const rowEl = document.querySelector(`.read-row[data-row="${step.row}"]`);
        if (rowEl) rowEl.classList.add('active-row');
        break;
      }

      case 'read-char': {
        const cell = cells[step.row]?.[step.col];
        if (cell) {
          cell.classList.add('reading', 'active-read');
        }
        updateReadPanelChar(step.row, step.col);
        break;
      }

      case 'result': {
        resultCard.style.display = '';
        resultValue.textContent = step.output;
        break;
      }
    }

    if (step.msg) {
      statusBar.innerHTML = step.msg;
    }
  }

  // ===== Read Panel =====
  function renderReadPanel() {
    readRows.innerHTML = '';
    const rowCount = Math.min(numRows, str.length);
    for (let r = 0; r < rowCount; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'read-row';
      rowDiv.dataset.row = r;

      const label = document.createElement('span');
      label.className = 'read-row__label';
      label.textContent = `Row ${r}`;

      const chars = document.createElement('span');
      chars.className = 'read-row__chars';
      chars.id = `readRow-${r}`;

      let rowChars = '';
      if (grid[r]) {
        for (let c = 0; c < gridCols; c++) {
          if (grid[r][c]) {
            rowChars += `<span data-rcol="${c}" style="opacity:0.3">${grid[r][c].char}</span>`;
          }
        }
      }
      chars.innerHTML = rowChars;

      rowDiv.appendChild(label);
      rowDiv.appendChild(chars);
      readRows.appendChild(rowDiv);
    }
  }

  function updateReadPanelChar(row, col) {
    const charsEl = document.getElementById(`readRow-${row}`);
    if (!charsEl) return;
    const charSpan = charsEl.querySelector(`[data-rcol="${col}"]`);
    if (charSpan) {
      charSpan.style.opacity = '1';
      charSpan.classList.add('char-highlight');
    }
  }

  // ===== Controls =====
  function getDelay() {
    return 600 / speed;
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
    if (stepIndex >= steps.length - 1) return;

    isPlaying = true;
    btnPlay.querySelector('.btn__icon').textContent = '⏸';

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
    btnPlay.querySelector('.btn__icon').textContent = '▶';
  }

  function reset() {
    stopPlaying();
    stepIndex = -1;
    resultCard.style.display = 'none';
    readPanel.style.display = 'none';

    str = stringInput.value;
    numRows = parseInt(rowsSlider.value, 10);
    rowsValue.textContent = numRows;

    computeZigzag();
    renderGrid();
    buildSteps();

    statusBar.innerHTML = 'Click <strong>Play</strong> or <strong>Step</strong> to begin placing characters';
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
  btnPlay.addEventListener('click', () => {
    if (isPlaying) {
      stopPlaying();
    } else {
      if (stepIndex >= steps.length - 1) {
        reset();
      }
      startPlaying();
    }
  });

  btnStep.addEventListener('click', () => {
    stopPlaying();
    doStep();
  });

  btnReset.addEventListener('click', reset);

  speedSlider.addEventListener('input', () => {
    speed = parseInt(speedSlider.value, 10);
    speedValue.textContent = speed + '×';
  });

  rowsSlider.addEventListener('input', () => {
    rowsValue.textContent = rowsSlider.value;
    reset();
  });

  stringInput.addEventListener('change', reset);

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      stringInput.value = btn.dataset.string;
      rowsSlider.value = btn.dataset.rows;
      rowsValue.textContent = btn.dataset.rows;
      reset();
    });
  });

  // ===== Init =====
  initHints();
  reset();
})();
