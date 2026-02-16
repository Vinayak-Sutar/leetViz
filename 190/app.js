(() => {
  'use strict';

  // ===== DOM =====
  const $ = (sel) => document.querySelector(sel);
  const decimalInput = $('#decimalInput');
  const binaryInput = $('#binaryInput');
  const btnPlay = $('#btnPlay');
  const btnStep = $('#btnStep');
  const btnReset = $('#btnReset');
  const speedSlider = $('#speedSlider');
  const speedValueEl = $('#speedValue');
  const inputBitsEl = $('#inputBits');
  const resultBitsEl = $('#resultBits');
  const inputIndicesEl = $('#inputIndices');
  const resultIndicesEl = $('#resultIndices');
  const inputDecLabel = $('#inputDecLabel');
  const resultDecLabel = $('#resultDecLabel');
  const stepNumEl = $('#stepNum');
  const stepDetailEl = $('#stepDetail');
  const arrowPath = $('#arrowPath');
  const opsExtractCode = $('#opsExtractCode');
  const opsShiftResultCode = $('#opsShiftResultCode');
  const opsOrCode = $('#opsOrCode');
  const opsShiftNCode = $('#opsShiftNCode');
  const opsExtract = $('#opsExtract');
  const opsShiftResult = $('#opsShiftResult');
  const opsOr = $('#opsOr');
  const opsShiftN = $('#opsShiftN');
  const finalDec = $('#finalDec');
  const finalHex = $('#finalHex');
  const finalBin = $('#finalBin');

  const algoSteps = [0, 1, 2, 3, 4, 5].map(i => $(`#algoStep${i}`));

  // ===== State =====
  let state = {
    originalN: 43261596,
    currentN: 43261596,
    result: 0,
    step: 0,       // 0 = idle, 1..32 = processing bit
    speed: 2,
    isPlaying: false,
    timerId: null,
  };

  // ===== Helpers =====
  function toBin32(n) {
    return (n >>> 0).toString(2).padStart(32, '0');
  }

  function toHex(n) {
    return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  // ===== Render Bit Strips =====
  function createBitCells(container, binaryStr, prefix) {
    container.innerHTML = '';
    const bits = binaryStr.split('');
    bits.forEach((bit, i) => {
      const cell = document.createElement('div');
      cell.className = 'bit-cell';
      cell.id = `${prefix}-${i}`;
      cell.dataset.val = bit;
      cell.dataset.idx = i;
      cell.textContent = bit;
      container.appendChild(cell);
    });
  }

  function createIndices(container, count) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const idx = document.createElement('div');
      idx.className = 'bit-index';
      idx.textContent = i;
      container.appendChild(idx);
    }
  }

  function renderInputBits() {
    const bin = toBin32(state.originalN);
    createBitCells(inputBitsEl, bin, 'in');
    createIndices(inputIndicesEl, 32);
    inputDecLabel.textContent = (state.originalN >>> 0).toString();
  }

  function renderResultBits() {
    createBitCells(resultBitsEl, '________________________________', 'out');
    // Mark all result cells as empty initially
    for (let i = 0; i < 32; i++) {
      const cell = document.getElementById(`out-${i}`);
      cell.dataset.val = '_';
      cell.textContent = '·';
      cell.classList.add('empty');
    }
    createIndices(resultIndicesEl, 32);
    resultDecLabel.textContent = '—';
  }

  // ===== Mark consumed / placed bits =====
  function markInputConsumed(upToStep) {
    // Bits are consumed from LSB (index 31) leftward
    for (let i = 0; i < 32; i++) {
      const cell = document.getElementById(`in-${i}`);
      if (!cell) continue;
      const bitPos = 31 - i; // position from LSB
      cell.classList.remove('active', 'consumed');
      if (bitPos < upToStep) {
        cell.classList.add('consumed');
      }
      if (bitPos === upToStep && upToStep < 32) {
        cell.classList.add('active');
      }
    }
  }

  function placeResultBit(step, bitValue) {
    // Result is built from MSB: bit extracted at step i goes to result position (31-i) in MSB display
    // Actually in the visual: result[0] is MSB (bit 31), result[31] is LSB (bit 0)
    // The first extracted bit (LSB of input) becomes MSB of result = index 0 in display
    const displayIdx = step; // step 0 → result display index 0 (MSB)
    const cell = document.getElementById(`out-${displayIdx}`);
    if (!cell) return;
    cell.textContent = bitValue;
    cell.dataset.val = String(bitValue);
    cell.classList.remove('empty');
    cell.classList.add('placed');

    // Update result decimal label
    const currentResult = state.result >>> 0;
    resultDecLabel.textContent = currentResult.toString();
  }

  function markResultTarget(step) {
    // Clear previous targets
    for (let i = 0; i < 32; i++) {
      const cell = document.getElementById(`out-${i}`);
      if (cell) cell.classList.remove('target');
    }
    if (step < 32) {
      const cell = document.getElementById(`out-${step}`);
      if (cell) cell.classList.add('target');
    }
  }

  // ===== Arrow Drawing =====
  function drawArrow(fromStep, toStep) {
    // fromStep: index in input bit strip (from LSB) → display index = 31 - fromStep
    // toStep: index in result bit strip → display index = toStep
    const fromDisplayIdx = 31 - fromStep;
    const toDisplayIdx = toStep;

    const fromCell = document.getElementById(`in-${fromDisplayIdx}`);
    const toCell = document.getElementById(`out-${toDisplayIdx}`);
    const svgEl = document.querySelector('.arrow-svg');

    if (!fromCell || !toCell || !svgEl) {
      arrowPath.setAttribute('d', '');
      return;
    }

    const svgRect = svgEl.getBoundingClientRect();
    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();

    // Compute positions relative to SVG viewBox
    const svgW = svgRect.width;
    const svgH = svgRect.height;

    const x1 = ((fromRect.left + fromRect.width / 2 - svgRect.left) / svgW) * 100;
    const y1 = 0;
    const x2 = ((toRect.left + toRect.width / 2 - svgRect.left) / svgW) * 100;
    const y2 = 75;

    // Curved path
    const midY = 40;
    const d = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
    arrowPath.setAttribute('d', d);
  }

  function clearArrow() {
    arrowPath.setAttribute('d', '');
  }

  // ===== Algo Step Highlighting =====
  function setAlgoStep(idx) {
    algoSteps.forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i < idx) el.classList.add('done');
      if (i === idx) el.classList.add('active');
    });
  }

  // ===== Operations Panel =====
  function clearOps() {
    [opsExtract, opsShiftResult, opsOr, opsShiftN].forEach(el => el.classList.remove('active'));
    opsExtractCode.textContent = '—';
    opsShiftResultCode.textContent = '—';
    opsOrCode.textContent = '—';
    opsShiftNCode.textContent = '—';
  }

  function updateOps(step, bit, prevResult, newResult, prevN, newN) {
    opsExtract.classList.add('active');
    opsExtractCode.textContent = `n & 1 = ${bit}`;

    opsShiftResult.classList.add('active');
    opsShiftResultCode.textContent = `${(prevResult >>> 0)} << 1 = ${((prevResult << 1) >>> 0)}`;

    opsOr.classList.add('active');
    opsOrCode.textContent = `${((prevResult << 1) >>> 0)} | ${bit} = ${(newResult >>> 0)}`;

    opsShiftN.classList.add('active');
    opsShiftNCode.textContent = `${(prevN >>> 0)} >>> 1 = ${(newN >>> 0)}`;
  }

  // ===== Result Card =====
  function updateResultCard() {
    if (state.step > 0) {
      const r = state.result >>> 0;
      finalDec.textContent = r.toString();
      finalHex.textContent = toHex(r);
      finalBin.textContent = toBin32(r);
    } else {
      finalDec.textContent = '—';
      finalHex.textContent = '—';
      finalBin.textContent = '—';
    }
  }

  // ===== Execute Single Step =====
  function executeStep() {
    if (state.step >= 32) {
      state.isPlaying = false;
      btnPlay.querySelector('.btn__icon').textContent = '▶';
      setAlgoStep(5); // Return result
      stepDetailEl.textContent = 'Done! Result is ready.';
      clearArrow();
      // Clear active highlights
      for (let i = 0; i < 32; i++) {
        const cell = document.getElementById(`in-${i}`);
        if (cell) cell.classList.remove('active');
      }
      markResultTarget(32); // clear target
      updateResultCard();
      return false;
    }

    const curStep = state.step;
    const prevResult = state.result;
    const prevN = state.currentN;

    // Extract LSB
    const bit = prevN & 1;

    // Left-shift result, OR in the bit
    state.result = ((prevResult << 1) | bit) >>> 0;

    // Right-shift n
    state.currentN = prevN >>> 1;

    state.step++;

    // === Visual updates ===
    const stepAlgo = curStep === 0 ? 2 : 2; // always show step 2a/2b/2c
    setAlgoStep(2); // highlight the loop body

    // Step info
    stepNumEl.textContent = state.step;
    const fromBitPos = curStep; // LSB position in original
    const toBitPos = 31 - curStep; // where it goes in result
    stepDetailEl.textContent = `Bit ${fromBitPos} → position ${toBitPos} (value: ${bit})`;

    // Mark consumed bits on input
    markInputConsumed(curStep);

    // Mark target on result
    markResultTarget(curStep);

    // Place the bit in result
    placeResultBit(curStep, bit);

    // Draw arrow
    drawArrow(curStep, curStep);

    // Update operations panel
    updateOps(curStep, bit, prevResult, state.result, prevN, state.currentN);

    // Update result card
    updateResultCard();

    return state.step < 32;
  }

  // ===== Reset =====
  function resetState() {
    clearTimeout(state.timerId);
    state.isPlaying = false;
    state.currentN = state.originalN;
    state.result = 0;
    state.step = 0;

    renderInputBits();
    renderResultBits();
    clearArrow();
    clearOps();
    setAlgoStep(0);
    updateResultCard();

    stepNumEl.textContent = '—';
    stepDetailEl.textContent = 'Press Play or Step to begin';
    resultDecLabel.textContent = '—';
    btnPlay.querySelector('.btn__icon').textContent = '▶';
    btnPlay.disabled = false;
    btnStep.disabled = false;
  }

  // ===== Auto-play =====
  function startAutoPlay() {
    state.isPlaying = true;
    btnPlay.querySelector('.btn__icon').textContent = '⏸';

    function tick() {
      if (!state.isPlaying) return;
      const hasMore = executeStep();
      if (hasMore) {
        const delay = 600 / state.speed;
        state.timerId = setTimeout(tick, delay);
      } else {
        state.isPlaying = false;
        btnPlay.querySelector('.btn__icon').textContent = '▶';
      }
    }
    tick();
  }

  function stopAutoPlay() {
    state.isPlaying = false;
    clearTimeout(state.timerId);
    btnPlay.querySelector('.btn__icon').textContent = '▶';
  }

  // ===== Input Sync =====
  function setFromDecimal(val) {
    const n = (parseInt(val, 10) || 0) >>> 0;
    state.originalN = n;
    decimalInput.value = n;
    binaryInput.value = toBin32(n);
    resetState();
  }

  function setFromBinary(binStr) {
    // Clean: allow only 0/1, pad/truncate to 32
    const clean = binStr.replace(/[^01]/g, '').padStart(32, '0').slice(-32);
    const n = parseInt(clean, 2) >>> 0;
    state.originalN = n;
    decimalInput.value = n;
    binaryInput.value = clean;
    resetState();
  }

  decimalInput.addEventListener('input', () => setFromDecimal(decimalInput.value));
  binaryInput.addEventListener('input', () => setFromBinary(binaryInput.value));

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => setFromDecimal(btn.dataset.value));
  });

  speedSlider.addEventListener('input', () => {
    state.speed = parseInt(speedSlider.value);
    speedValueEl.textContent = state.speed + '×';
  });

  btnPlay.addEventListener('click', () => {
    if (state.isPlaying) {
      stopAutoPlay();
    } else {
      if (state.step >= 32) resetState();
      startAutoPlay();
    }
  });

  btnStep.addEventListener('click', () => {
    if (state.isPlaying) stopAutoPlay();
    if (state.step >= 32) {
      resetState();
      return;
    }
    executeStep();
  });

  btnReset.addEventListener('click', () => {
    stopAutoPlay();
    resetState();
  });

  // ===== Handle window resize for arrow =====
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (state.step > 0 && state.step <= 32) {
        drawArrow(state.step - 1, state.step - 1);
      }
    }, 100);
  });

  // ===== Init =====
  resetState();
})();
