/**
 * LeetViz — #2906 Construct Product Matrix
 * Visualizes the prefix and suffix arrays technique mapped to a 2D matrix.
 */
(() => {
    'use strict';

    // ===== Presets =====
    const PRESETS = [
        {
            grid: [[1, 2], [3, 4]]
        },
        {
            grid: [[12345], [2], [1]]
        },
        {
            grid: [[2, 3, 4], [5, 6, 7]]
        }
    ];

    const MOD = 12345;

    // ===== DOM Elements =====
    const btnPlay = document.getElementById('btnPlay');
    const btnStep = document.getElementById('btnStep');
    const btnReset = document.getElementById('btnReset');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    const matrixInput = document.getElementById('matrixInput');
    const matrixOutput = document.getElementById('matrixOutput');

    const statusBar = document.getElementById('statusBar');
    
    const hintsRevealed = document.getElementById('hintsRevealed');
    const hintsProgressFill = document.getElementById('hintsProgressFill');

    // ===== State =====
    let speed = 3;
    let isPlaying = false;
    let playTimer = null;
    let steps = [];
    let stepIndex = -1;
    let currentPreset = 0;

    let grid = [];
    let M = 0;
    let N = 0;
    let totalLen = 0;

    // ===== Handlers =====
    speedSlider.addEventListener('input', () => {
        speed = parseInt(speedSlider.value, 10);
        speedValue.textContent = speed + '×';
    });

    presetBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPreset = idx;
            loadPreset();
        });
    });

    btnPlay.addEventListener('click', () => {
        if (isPlaying) {
            stopPlaying();
        } else {
            if (stepIndex >= steps.length - 1 || steps.length === 0) {
                resetUI();
                buildSteps();
            }
            startPlaying();
        }
    });

    btnStep.addEventListener('click', () => {
        stopPlaying();
        if (steps.length === 0) buildSteps();
        doStep();
    });

    btnReset.addEventListener('click', () => {
        stopPlaying();
        loadPreset();
    });

    // ===== Initialization =====
    function loadPreset() {
        const p = PRESETS[currentPreset];
        // deep copy
        grid = p.grid.map(row => [...row]);
        M = grid.length;
        N = grid[0].length;
        totalLen = M * N;
        resetUI();
    }

    function resetUI() {
        stepIndex = -1;
        steps = [];
        stopPlaying();
        
        renderGridsAndArrays();
        statusBar.innerHTML = `Loaded example. Click <strong>Visualize</strong> to compute products.`;
    }

    function renderGridsAndArrays() {
        matrixInput.innerHTML = '';
        matrixOutput.innerHTML = '';

        matrixInput.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
        matrixOutput.style.gridTemplateColumns = `repeat(${N}, 1fr)`;

        // Render Input Matrix
        for (let i = 0; i < M; i++) {
            for (let j = 0; j < N; j++) {
                const val = grid[i][j];
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.id = `mi-${i}-${j}`;
                cell.innerHTML = `<span>${val}</span>`;
                matrixInput.appendChild(cell);

                const outCell = document.createElement('div');
                outCell.className = 'cell empty';
                outCell.id = `mo-${i}-${j}`;
                outCell.innerHTML = `<span>?</span>`;
                matrixOutput.appendChild(outCell);
            }
        }
    }

    // ===== Algorithm Simulation & Step Generation =====
    function buildSteps() {
        steps = [];
        
        steps.push({
            type: 'start',
            msg: `Calculating product matrix for a ${M}×${N} grid modulo 12345.`
        });

        for (let i = 0; i < M; i++) {
            for (let j = 0; j < N; j++) {
                steps.push({
                    type: 'target_cell',
                    r: i,
                    c: j,
                    msg: `Computing p[${i}][${j}]. We must multiply all elements EXCEPT grid[${i}][${j}] (${grid[i][j]}).`
                });

                let prod = 1;

                // Animate taking the product of all OTHER cells
                for (let r = 0; r < M; r++) {
                    for (let c = 0; c < N; c++) {
                        if (r === i && c === j) continue;
                        
                        const nextProd = Number((BigInt(prod) * BigInt(grid[r][c])) % BigInt(MOD));
                        steps.push({
                            type: 'multiply_cell',
                            rTarget: i,
                            cTarget: j,
                            rCur: r,
                            cCur: c,
                            val: grid[r][c],
                            prevProd: prod,
                            newProd: nextProd,
                            msg: `Multiply by grid[${r}][${c}] (${grid[r][c]}). Current product = (${prod} * ${grid[r][c]}) % ${MOD} = <strong>${nextProd}</strong>`
                        });
                        prod = nextProd;
                    }
                }

                steps.push({
                    type: 'store_result',
                    r: i,
                    c: j,
                    ans: prod,
                    msg: `Finished computing p[${i}][${j}]. Final answer is <strong>${prod}</strong>.`
                });
            }
        }

        steps.push({
            type: 'finish',
            msg: `Finished! The product matrix is constructed.`
        });
    }

    // ===== UI Updates =====
    function resetAllHighlights() {
        document.querySelectorAll('.cell.active, .cell.math').forEach(c => {
            c.classList.remove('active', 'math');
        });
    }

    function applyStep(step) {
        if (step.msg) {
            statusBar.innerHTML = step.msg;
        }
        resetAllHighlights();

        switch (step.type) {
            case 'start':
                renderGridsAndArrays();
                break;
                
            case 'target_cell':
                document.getElementById(`mi-${step.r}-${step.c}`).classList.add('output'); // highlight target to exclude
                document.getElementById(`mo-${step.r}-${step.c}`).classList.add('active'); // highlight where result goes
                break;

            case 'multiply_cell':
                // highlight target
                document.getElementById(`mi-${step.rTarget}-${step.cTarget}`).classList.add('output');
                document.getElementById(`mo-${step.rTarget}-${step.cTarget}`).classList.add('active');
                
                // highlight current multiplier
                document.getElementById(`mi-${step.rCur}-${step.cCur}`).classList.add('math');
                break;

            case 'store_result':
                const outC = document.getElementById(`mo-${step.r}-${step.c}`);
                const inC = document.getElementById(`mi-${step.r}-${step.c}`);
                
                if (inC) inC.classList.remove('output');
                
                if (outC) {
                    outC.classList.remove('empty', 'active');
                    outC.classList.add('output');
                    outC.innerHTML = `<span>${step.ans}</span>`;
                }
                break;

            case 'finish':
                // Everything is output class
                for (let i = 0; i < M; i++) {
                    for (let j = 0; j < N; j++) {
                        document.getElementById(`mo-${i}-${j}`).classList.add('output');
                    }
                }
                break;
        }
    }

    // ===== Playback Controls =====
    function getDelay() {
        const base = 800;
        return base / speed;
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
        if (isPlaying || stepIndex >= steps.length - 1) return;
        isPlaying = true;
        btnPlay.querySelector('.btn__icon').textContent = '⏸';

        function tick() {
            if (!isPlaying) return;
            doStep();
            if (stepIndex < steps.length - 1) {
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

    // Initialize
    initHints();
    loadPreset();

})();
