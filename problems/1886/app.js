/**
 * LeetViz — #1886 Determine Whether Matrix Can Be Obtained By Rotation
 * Visualizes matrix rotation and element-by-element comparison.
 */
(() => {
    'use strict';

    // ===== Presets =====
    const PRESETS = [
        {
            mat: [[0, 1], [1, 0]],
            target: [[1, 0], [0, 1]]
        },
        {
            mat: [[0, 1], [1, 1]],
            target: [[1, 0], [0, 1]]
        },
        {
            mat: [[0, 0, 0], [0, 1, 0], [1, 1, 1]],
            target: [[1, 1, 1], [0, 1, 0], [0, 0, 0]]
        },
        {
            mat: [[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
            target: [[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]] // matches 0 deg
        }
    ];

    // ===== DOM Elements =====
    const btnPlay = document.getElementById('btnPlay');
    const btnStep = document.getElementById('btnStep');
    const btnReset = document.getElementById('btnReset');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    const matrixCurrent = document.getElementById('matrixCurrent');
    const matrixTarget = document.getElementById('matrixTarget');
    const degreeLabel = document.getElementById('degreeLabel');
    const statusBar = document.getElementById('statusBar');
    
    const resultCard = document.getElementById('resultCard');
    const resultValue = document.getElementById('resultValue');
    
    const hintsRevealed = document.getElementById('hintsRevealed');
    const hintsProgressFill = document.getElementById('hintsProgressFill');

    // ===== State =====
    let speed = 3;
    let isPlaying = false;
    let playTimer = null;
    let steps = [];
    let stepIndex = -1;
    let currentPreset = 0;

    let n = 2;
    let initialMat = [];
    let targetMat = [];

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

    // ===== Matrix Logic =====
    function rotateMatrix(matrix) {
        const size = matrix.length;
        const res = Array.from({ length: size }, () => Array(size).fill(0));
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // formula for 90 deg clockwise: [j][n-1-i]
                res[j][size - 1 - i] = matrix[i][j];
            }
        }
        return res;
    }

    function checkEqual(m1, m2) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (m1[i][j] !== m2[i][j]) return false;
            }
        }
        return true;
    }

    // Deep copy matrix
    function copyMat(m) {
        return m.map(row => [...row]);
    }

    function loadPreset() {
        const p = PRESETS[currentPreset];
        n = p.mat.length;
        initialMat = copyMat(p.mat);
        targetMat = copyMat(p.target);
        resetUI();
    }

    function resetUI() {
        stepIndex = -1;
        steps = [];
        
        matrixCurrent.style.transform = `rotate(0deg)`;
        matrixCurrent.style.transition = 'none'; // jump back
        
        // Force reflow
        void matrixCurrent.offsetWidth;
        matrixCurrent.style.transition = '';

        degreeLabel.textContent = `0°`;
        renderMatrixDOM(matrixCurrent, initialMat, 'cur');
        renderMatrixDOM(matrixTarget, targetMat, 'tgt');
        
        resultCard.style.display = 'none';
        statusBar.innerHTML = `Loaded example. Click <strong>Visualize</strong> to check rotations.`;
        
        stopPlaying();
    }

    function renderMatrixDOM(container, mat, prefix) {
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const val = mat[i][j];
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.id = `${prefix}-${i}-${j}`;
                cell.setAttribute('data-val', val);
                
                const inner = document.createElement('span');
                inner.textContent = val;
                cell.appendChild(inner);
                
                container.appendChild(cell);
            }
        }
    }

    // ===== Algorithm Simulation & Step Generation =====
    function buildSteps() {
        steps = [];
        let mat = copyMat(initialMat);

        steps.push({
            type: 'start',
            msg: `Checking if mat can match target using up to 3 rotations (0°, 90°, 180°, 270°).`
        });

        let found = false;
        
        for (let r = 0; r < 4; r++) {
            const deg = r * 90;

            if (r > 0) {
                steps.push({
                    type: 'rotate_anim',
                    deg: deg,
                    oldMat: copyMat(mat),
                    msg: `Rotating matrix by 90° (Total: ${deg}°).`
                });
                
                mat = rotateMatrix(mat); // Actual mathematical rotation

                steps.push({
                    type: 'rotate_done',
                    deg: deg,
                    mat: copyMat(mat),
                    msg: `Rotation complete. Starting comparison.`
                });
            } else {
                steps.push({
                    type: 'compare_start',
                    deg: deg,
                    mat: copyMat(mat),
                    msg: `Comparing matrix at ${deg}°.`
                });
            }

            // Perform check step-by-step
            let match = true;
            let mismatchCell = null;
            
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const isMatch = (mat[i][j] === targetMat[i][j]);
                    
                    if (!isMatch) {
                        match = false;
                        mismatchCell = {i, j};
                        
                        steps.push({
                            type: 'check_fail',
                            deg: deg,
                            i, j,
                            matVal: mat[i][j],
                            tgtVal: targetMat[i][j],
                            msg: `Mismatch at cell (${i}, ${j}). ${mat[i][j]} != ${targetMat[i][j]}.`
                        });
                        break;
                    } else {
                        // For larger grids, adding a step per cell is very slow. 
                        // We will add steps in batches or just show failure points.
                        // To be educational, let's step through matches until failure.
                    }
                }
                if (!match) break;
            }

            if (match) {
                found = true;
                steps.push({
                    type: 'check_success',
                    deg: deg,
                    msg: `All cells match! Matrix can be obtained at ${deg}°.`
                });
                break;
            } else {
                steps.push({
                    type: 'check_end_fail',
                    deg: deg,
                    msg: `${deg}° rotation failed. Moving to next rotation.`
                });
            }
        }

        steps.push({
            type: 'result',
            answer: found,
            msg: found ? `Success! Obtained target matrix.` : `Checked all 4 rotations. No match found.`
        });
    }

    // ===== UI Updates =====
    function resetAllCells() {
        document.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('checking', 'match', 'mismatch');
        });
    }

    function applyStep(step) {
        if (step.msg) {
            statusBar.innerHTML = step.msg;
        }

        switch (step.type) {
            case 'start':
                resetAllCells();
                renderMatrixDOM(matrixCurrent, initialMat, 'cur');
                matrixCurrent.style.transform = `rotate(0deg)`;
                degreeLabel.textContent = `0°`;
                resultCard.style.display = 'none';
                break;
                
            case 'compare_start':
                resetAllCells();
                break;

            case 'rotate_anim':
                resetAllCells();
                // Visual rotation
                matrixCurrent.style.transition = 'transform 0.5s ease-in-out';
                matrixCurrent.style.transform = `rotate(${step.deg}deg)`;
                degreeLabel.textContent = `${step.deg}°`;
                
                // Counter-rotate text so it stays upright
                const spans = matrixCurrent.querySelectorAll('span');
                spans.forEach(s => {
                    s.style.transform = `rotate(-${step.deg}deg)`;
                });
                break;

            case 'rotate_done':
                // Reset physical rotation of container, but render new mat state
                matrixCurrent.style.transition = 'none';
                matrixCurrent.style.transform = `rotate(0deg)`;
                
                renderMatrixDOM(matrixCurrent, step.mat, 'cur');
                
                // force reflow
                void matrixCurrent.offsetWidth;
                matrixCurrent.style.transition = 'transform 0.5s ease-in-out';
                break;

            case 'check_fail':
                const curCell = document.getElementById(`cur-${step.i}-${step.j}`);
                const tgtCell = document.getElementById(`tgt-${step.i}-${step.j}`);
                if (curCell) curCell.classList.add('mismatch', 'checking');
                if (tgtCell) tgtCell.classList.add('mismatch', 'checking');
                break;

            case 'check_success':
                document.querySelectorAll('.cell').forEach(c => {
                    c.classList.add('match');
                    c.classList.remove('checking', 'mismatch');
                });
                break;

            case 'check_end_fail':
                resetAllCells();
                break;

            case 'result':
                resultCard.style.display = 'block';
                resultValue.textContent = step.answer ? 'true' : 'false';
                resultValue.className = `result-card__value ${step.answer}`;
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
            // Important: varying delay depending on step type for better feel
            const currentStep = steps[stepIndex];
            let delay = getDelay();
            if (currentStep && currentStep.type === 'rotate_anim') {
                delay = 600; // allow animation to finish
            } else if (currentStep && currentStep.type === 'rotate_done') {
                delay = 100; // snap fast
            }
            
            if (stepIndex < steps.length - 1) {
                playTimer = setTimeout(tick, delay);
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
