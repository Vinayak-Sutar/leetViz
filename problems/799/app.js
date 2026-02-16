(() => {
  'use strict';

  // ===== DOM References =====
  const $ = (sel) => document.querySelector(sel);
  const pouredSlider = $('#pouredSlider');
  const pouredNumber = $('#pouredNumber');
  const queryRowInput = $('#queryRow');
  const queryGlassInput = $('#queryGlass');
  const maxRowsInput = $('#maxRows');
  const speedSlider = $('#speedSlider');

  const pouredValueEl = $('#pouredValue');
  const queryRowValueEl = $('#queryRowValue');
  const queryGlassValueEl = $('#queryGlassValue');
  const maxRowsValueEl = $('#maxRowsValue');
  const speedValueEl = $('#speedValue');

  const btnPour = $('#btnPour');
  const btnStep = $('#btnStep');
  const btnReset = $('#btnReset');

  const resRow = $('#resRow');
  const resGlass = $('#resGlass');
  const resValue = $('#resValue');
  const resBar = $('#resBar');

  const pyramidSvg = $('#pyramidSvg');
  const pyramidGroup = $('#pyramidGroup');
  const particlesGroup = $('#particlesGroup');
  const dpTable = $('#dpTable');
  const currentRowDisplay = $('#currentRowDisplay');

  // ===== Hints System =====
  const hintsContainer = $('#hintsContainer');
  const hintsCountEl = $('#hintsCount');
  const hintsProgressFill = $('#hintsProgressFill');
  let revealedHints = 0;
  const totalHints = 5;

  function initHints() {
    revealedHints = 0;
    document.querySelectorAll('.hint').forEach((hint, i) => {
      hint.classList.remove('revealed');
      if (i > 0) hint.classList.add('locked');
      else hint.classList.remove('locked');

      hint.addEventListener('click', () => {
        const idx = parseInt(hint.dataset.hint);
        if (hint.classList.contains('locked') || hint.classList.contains('revealed')) return;

        hint.classList.add('revealed');
        revealedHints++;
        hintsCountEl.textContent = `${revealedHints} / ${totalHints} revealed`;
        hintsProgressFill.style.width = `${(revealedHints / totalHints) * 100}%`;

        // Unlock next hint
        const next = document.querySelector(`.hint[data-hint="${idx + 1}"]`);
        if (next) next.classList.remove('locked');
      });
    });
    hintsCountEl.textContent = `0 / ${totalHints} revealed`;
    hintsProgressFill.style.width = '0%';
  }

  // ===== State =====
  let state = {
    poured: 4,
    queryRow: 2,
    queryGlass: 1,
    maxRows: 7,
    speed: 2,
    dp: [],           // full DP table (flow amounts, not capped)
    displayDp: [],    // what's currently shown
    currentStep: -1,  // -1 = idle, 0..maxRows-1 = processing row
    isPlaying: false,
    animFrameId: null,
    glassElements: [], // SVG element references [row][col]
  };

  // ===== Glass Geometry =====
  const GLASS_TOP_W = 44;
  const GLASS_BOT_W = 28;
  const GLASS_H = 36;
  const GLASS_GAP_X = 8;
  const GLASS_GAP_Y = 14;
  const STEM_H = 10;
  const STEM_W = 4;

  function glassPath(cx, cy) {
    // Trapezoid glass body
    const tl = cx - GLASS_TOP_W / 2;
    const tr = cx + GLASS_TOP_W / 2;
    const bl = cx - GLASS_BOT_W / 2;
    const br = cx + GLASS_BOT_W / 2;
    const top = cy;
    const bot = cy + GLASS_H;
    return `M${tl},${top} L${bl},${bot} L${br},${bot} L${tr},${top} Z`;
  }

  function liquidClipPath(cx, cy, fillPercent) {
    // Liquid fills from bottom
    const pct = Math.max(0, Math.min(1, fillPercent));
    const liquidTop = cy + GLASS_H * (1 - pct);

    // Interpolate width at liquidTop
    const t = 1 - pct; // 0=top, 1=bot
    const widthAtLiquidTop = GLASS_TOP_W + (GLASS_BOT_W - GLASS_TOP_W) * t;
    const widthAtBot = GLASS_BOT_W;

    const ltl = cx - widthAtLiquidTop / 2;
    const ltr = cx + widthAtLiquidTop / 2;
    const lbl = cx - widthAtBot / 2;
    const lbr = cx + widthAtBot / 2;
    const bot = cy + GLASS_H;

    return `M${ltl},${liquidTop} L${lbl},${bot} L${lbr},${bot} L${ltr},${liquidTop} Z`;
  }

  // ===== SVG Rendering =====
  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  function getGlassCenter(row, col, totalRows) {
    const svgWidth = totalRows * (GLASS_TOP_W + GLASS_GAP_X);
    const rowWidth = (row + 1) * (GLASS_TOP_W + GLASS_GAP_X) - GLASS_GAP_X;
    const startX = (svgWidth - rowWidth) / 2 + GLASS_TOP_W / 2;
    const cx = startX + col * (GLASS_TOP_W + GLASS_GAP_X);
    const cy = 40 + row * (GLASS_H + STEM_H + GLASS_GAP_Y);
    return { cx, cy };
  }

  function renderPyramid() {
    pyramidGroup.innerHTML = '';
    particlesGroup.innerHTML = '';
    state.glassElements = [];

    const totalRows = state.maxRows;
    const svgWidth = totalRows * (GLASS_TOP_W + GLASS_GAP_X) + 40;
    const svgHeight = 40 + totalRows * (GLASS_H + STEM_H + GLASS_GAP_Y) + 30;
    pyramidSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    for (let r = 0; r < totalRows; r++) {
      state.glassElements[r] = [];
      for (let c = 0; c <= r; c++) {
        const { cx, cy } = getGlassCenter(r, c, totalRows);
        const group = createSvgEl('g', { class: 'glass-group', 'data-row': r, 'data-col': c });

        // Stem
        const stem = createSvgEl('line', {
          x1: cx, y1: cy + GLASS_H,
          x2: cx, y2: cy + GLASS_H + STEM_H,
          stroke: 'rgba(255,255,255,0.08)', 'stroke-width': STEM_W
        });

        // Base
        const base = createSvgEl('ellipse', {
          cx: cx, cy: cy + GLASS_H + STEM_H,
          rx: 10, ry: 3,
          fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 1
        });

        // Glass outline
        const outline = createSvgEl('path', {
          d: glassPath(cx, cy), class: 'glass-outline'
        });

        // Liquid fill (initially empty)
        const liquid = createSvgEl('path', {
          d: liquidClipPath(cx, cy, 0), class: 'glass-liquid'
        });

        // Label
        const label = createSvgEl('text', {
          x: cx, y: cy + GLASS_H / 2 + 2,
          class: 'glass-label'
        });
        label.textContent = '';

        group.appendChild(stem);
        group.appendChild(base);
        group.appendChild(liquid);
        group.appendChild(outline);
        group.appendChild(label);
        pyramidGroup.appendChild(group);

        state.glassElements[r][c] = { group, liquid, label, cx, cy };

        // Mark query glass
        if (r === state.queryRow && c === state.queryGlass) {
          group.classList.add('query');
        }
      }
    }
  }

  function updateGlassFill(row, col, amount) {
    const el = state.glassElements[row]?.[col];
    if (!el) return;

    const fillPct = Math.min(1, amount);
    const { cx, cy, liquid, label } = el;

    liquid.setAttribute('d', liquidClipPath(cx, cy, fillPct));
    if (fillPct > 0) {
      liquid.classList.add('filled');
      // Brighter when full
      if (fillPct >= 1) {
        liquid.setAttribute('fill', 'url(#champagneGradDark)');
      } else {
        liquid.setAttribute('fill', 'url(#champagneGrad)');
      }
    } else {
      liquid.classList.remove('filled');
    }

    // Show amount text
    if (amount > 0) {
      const display = Math.min(1, amount);
      label.textContent = display >= 1 ? '1.00' : display.toFixed(2);
      label.classList.add('has-value');
    } else {
      label.textContent = '';
      label.classList.remove('has-value');
    }
  }

  function highlightRow(row) {
    // Clear previous highlights
    for (let r = 0; r < state.maxRows; r++) {
      for (let c = 0; c <= r; c++) {
        state.glassElements[r]?.[c]?.group.classList.remove('active-row');
      }
    }
    if (row >= 0 && row < state.maxRows) {
      for (let c = 0; c <= row; c++) {
        state.glassElements[row]?.[c]?.group.classList.add('active-row');
      }
    }
  }

  // ===== DP Simulation =====
  function simulateFull() {
    const n = state.maxRows;
    const dp = Array.from({ length: n }, (_, i) => new Float64Array(i + 1));
    dp[0][0] = state.poured;

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j <= i; j++) {
        if (dp[i][j] > 1) {
          const overflow = (dp[i][j] - 1) / 2;
          dp[i + 1][j] += overflow;
          dp[i + 1][j + 1] += overflow;
        }
      }
    }
    state.dp = dp;
    return dp;
  }

  // ===== Overflow Particles =====
  function spawnOverflowParticles(fromRow, fromCol) {
    const el = state.glassElements[fromRow]?.[fromCol];
    if (!el) return;

    const { cx, cy } = el;
    const startY = cy + GLASS_H;

    // Left child
    const leftChild = state.glassElements[fromRow + 1]?.[fromCol];
    // Right child
    const rightChild = state.glassElements[fromRow + 1]?.[fromCol + 1];

    [leftChild, rightChild].forEach(child => {
      if (!child) return;
      const numParticles = 3;
      for (let i = 0; i < numParticles; i++) {
        setTimeout(() => {
          createDripParticle(cx, startY, child.cx, child.cy);
        }, i * 60);
      }
    });
  }

  function createDripParticle(x1, y1, x2, y2) {
    const particle = createSvgEl('circle', {
      cx: x1, cy: y1, r: 2.5,
      class: 'overflow-particle'
    });
    particlesGroup.appendChild(particle);

    const duration = 400 / state.speed;
    const startTime = performance.now();

    function animate(now) {
      const t = Math.min(1, (now - startTime) / duration);
      // Ease out cubic
      const e = 1 - Math.pow(1 - t, 3);
      const px = x1 + (x2 - x1) * e;
      const py = y1 + (y2 - y1) * e;
      particle.setAttribute('cx', px);
      particle.setAttribute('cy', py);
      particle.setAttribute('opacity', 1 - t * 0.6);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    }
    requestAnimationFrame(animate);
  }

  // ===== Pouring Stream =====
  function showPouringStream(show) {
    const existing = pyramidGroup.querySelector('.pour-stream');
    if (existing) existing.remove();

    if (show && state.glassElements[0]?.[0]) {
      const { cx, cy } = state.glassElements[0][0];
      const stream = createSvgEl('line', {
        x1: cx, y1: 0, x2: cx, y2: cy,
        class: 'pouring-stream pour-stream'
      });
      pyramidGroup.appendChild(stream);
    }
  }

  // ===== DP Table Display =====
  function renderDpTable() {
    dpTable.innerHTML = '';
    const n = state.maxRows;

    for (let r = 0; r < n; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'dp-row';

      for (let c = 0; c <= r; c++) {
        const cell = document.createElement('div');
        cell.className = 'dp-cell';
        cell.id = `dp-${r}-${c}`;

        const val = state.displayDp[r]?.[c] ?? 0;
        if (val > 0) {
          cell.textContent = val >= 10 ? val.toFixed(1) : val.toFixed(2);
          cell.classList.add('has-value');
          if (val > 1) cell.classList.add('overflow');
          if (val >= 1 && val <= 1.001) cell.classList.add('full');
        } else {
          cell.textContent = '0';
        }

        if (r === state.queryRow && c === state.queryGlass) {
          cell.classList.add('query');
        }

        rowDiv.appendChild(cell);
      }
      dpTable.appendChild(rowDiv);
    }
  }

  function updateDpCell(row, col, value) {
    const cell = document.getElementById(`dp-${row}-${col}`);
    if (!cell) return;
    cell.textContent = value >= 10 ? value.toFixed(1) : value.toFixed(2);
    cell.classList.add('has-value');
    if (value > 1) cell.classList.add('overflow');
    if (value >= 1 && value <= 1.001) cell.classList.add('full');
  }



  // ===== Result Display =====
  function updateResult() {
    const row = state.queryRow;
    const col = state.queryGlass;
    resRow.textContent = row;
    resGlass.textContent = col;

    if (state.dp[row]?.[col] !== undefined && state.currentStep >= row) {
      const raw = state.dp[row][col];
      const val = Math.min(1, raw);
      resValue.textContent = val.toFixed(4);
      resBar.style.width = (val * 100) + '%';
    } else {
      resValue.textContent = '—';
      resBar.style.width = '0%';
    }
  }

  // ===== Step-by-Step Execution =====
  function resetState() {
    cancelAnimationFrame(state.animFrameId);
    state.isPlaying = false;
    state.currentStep = -1;
    state.dp = [];
    state.displayDp = Array.from({ length: state.maxRows }, (_, i) => new Float64Array(i + 1));

    renderPyramid();
    renderDpTable();
    updateResult();
    currentRowDisplay.textContent = '—';
    showPouringStream(false);

    btnPour.disabled = false;
    btnStep.disabled = false;
    btnPour.querySelector('.btn__icon').textContent = '▶';
  }

  function executeStep() {
    if (state.currentStep >= state.maxRows - 1) {
      // Done
      state.isPlaying = false;
      btnPour.querySelector('.btn__icon').textContent = '▶';
      showPouringStream(false);
      updateResult();
      return false;
    }

    state.currentStep++;
    const row = state.currentStep;

    if (row === 0) {
      // Initialize
      simulateFull();
      state.displayDp[0][0] = state.poured;
      showPouringStream(true);
      updateGlassFill(0, 0, Math.min(1, state.poured));
      updateDpCell(0, 0, state.poured);
      currentRowDisplay.textContent = `Row 0`;
      highlightRow(0);
      updateResult();
      return true;
    }

    // Process overflow from previous row
    currentRowDisplay.textContent = `Row ${row}`;
    highlightRow(row);

    const prevRow = row - 1;
    for (let j = 0; j <= prevRow; j++) {
      const val = state.displayDp[prevRow][j];
      if (val > 1) {
        const overflow = (val - 1) / 2;
        state.displayDp[row][j] += overflow;
        state.displayDp[row][j + 1] += overflow;

        // Spawn particles
        spawnOverflowParticles(prevRow, j);
      }
    }

    // Update all glasses in current row
    for (let c = 0; c <= row; c++) {
      const v = state.displayDp[row][c];
      updateGlassFill(row, c, v);
      updateDpCell(row, c, v);
    }

    // Also cap display for previous row (visual only)
    for (let c = 0; c <= prevRow; c++) {
      updateGlassFill(prevRow, c, Math.min(1, state.displayDp[prevRow][c]));
    }

    updateResult();

    return state.currentStep < state.maxRows - 1;
  }

  // ===== Auto-play =====
  function startAutoPlay() {
    state.isPlaying = true;
    btnPour.querySelector('.btn__icon').textContent = '⏸';

    function tick() {
      if (!state.isPlaying) return;
      const hasMore = executeStep();
      if (hasMore) {
        const delay = 800 / state.speed;
        state.animFrameId = setTimeout(tick, delay);
      } else {
        state.isPlaying = false;
        btnPour.querySelector('.btn__icon').textContent = '▶';
      }
    }
    tick();
  }

  function stopAutoPlay() {
    state.isPlaying = false;
    clearTimeout(state.animFrameId);
    btnPour.querySelector('.btn__icon').textContent = '▶';
  }

  // ===== Event Handlers =====
  function syncControls() {
    state.poured = parseFloat(pouredNumber.value) || 0;
    pouredSlider.value = Math.min(50, state.poured);
    pouredValueEl.textContent = state.poured;

    state.queryRow = parseInt(queryRowInput.value);
    queryRowValueEl.textContent = state.queryRow;

    // Clamp queryGlass to valid range
    const maxGlass = state.queryRow;
    queryGlassInput.max = maxGlass;
    if (state.queryGlass > maxGlass) {
      state.queryGlass = maxGlass;
      queryGlassInput.value = maxGlass;
    } else {
      state.queryGlass = parseInt(queryGlassInput.value);
    }
    queryGlassValueEl.textContent = state.queryGlass;

    state.maxRows = parseInt(maxRowsInput.value);
    maxRowsValueEl.textContent = state.maxRows;

    // Clamp queryRow
    const maxRow = state.maxRows - 1;
    queryRowInput.max = maxRow;
    if (state.queryRow > maxRow) {
      state.queryRow = maxRow;
      queryRowInput.value = maxRow;
      queryRowValueEl.textContent = maxRow;
    }

    state.speed = parseInt(speedSlider.value);
    speedValueEl.textContent = state.speed + '×';

    resRow.textContent = state.queryRow;
    resGlass.textContent = state.queryGlass;
  }

  pouredSlider.addEventListener('input', () => {
    pouredNumber.value = pouredSlider.value;
    syncControls();
    resetState();
  });

  pouredNumber.addEventListener('input', () => {
    syncControls();
    resetState();
  });

  queryRowInput.addEventListener('input', () => {
    syncControls();
    resetState();
  });

  queryGlassInput.addEventListener('input', () => {
    syncControls();
    resetState();
  });

  maxRowsInput.addEventListener('input', () => {
    syncControls();
    resetState();
  });

  speedSlider.addEventListener('input', () => {
    syncControls();
  });

  btnPour.addEventListener('click', () => {
    if (state.isPlaying) {
      stopAutoPlay();
    } else {
      if (state.currentStep >= state.maxRows - 1) {
        resetState();
      }
      startAutoPlay();
    }
  });

  btnStep.addEventListener('click', () => {
    if (state.isPlaying) stopAutoPlay();
    if (state.currentStep >= state.maxRows - 1) {
      resetState();
      return;
    }
    executeStep();
  });

  btnReset.addEventListener('click', () => {
    stopAutoPlay();
    resetState();
  });

  // ===== Instant computation for slider changes =====
  // Show the answer immediately in the result card even before pouring
  function showInstantResult() {
    const n = state.maxRows;
    const dp = Array.from({ length: n }, (_, i) => new Float64Array(i + 1));
    dp[0][0] = state.poured;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j <= i; j++) {
        if (dp[i][j] > 1) {
          const overflow = (dp[i][j] - 1) / 2;
          dp[i + 1][j] += overflow;
          dp[i + 1][j + 1] += overflow;
        }
      }
    }
  }

  // ===== Init =====
  syncControls();
  initHints();
  resetState();
})();
