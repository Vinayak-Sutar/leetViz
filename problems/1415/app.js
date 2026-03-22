/**
 * LeetViz — #1415 The k-th Lexicographical String of All Happy Strings of Length n
 * Visualizes the backtracking process for generating happy strings.
 */
(() => {
    'use strict';

    // ===== Presets =====
    const PRESETS = [
        { n: 1, k: 3 },
        { n: 1, k: 4 },
        { n: 3, k: 9 }
    ];

    // ===== DOM Elements =====
    const btnPlay = document.getElementById('btnPlay');
    const btnStep = document.getElementById('btnStep');
    const btnReset = document.getElementById('btnReset');
    const inputN = document.getElementById('inputN');
    const valN = document.getElementById('valN');
    const inputK = document.getElementById('inputK');
    const valK = document.getElementById('valK');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const slotsContainer = document.getElementById('slotsContainer');
    const statusBar = document.getElementById('statusBar');
    const stringsList = document.getElementById('stringsList');
    const foundCount = document.getElementById('foundCount');
    const targetCount = document.getElementById('targetCount');
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
    let n = 3;
    let k = 9;

    // ===== Handlers =====
    inputN.addEventListener('input', () => {
        valN.textContent = inputN.value;
        setPresetCustom();
        reset();
    });

    inputK.addEventListener('input', () => {
        valK.textContent = inputK.value;
        setPresetCustom();
        reset();
    });

    speedSlider.addEventListener('input', () => {
        speed = parseInt(speedSlider.value, 10);
        speedValue.textContent = speed + '×';
    });

    function setPresetCustom() {
        presetBtns.forEach(b => b.classList.remove('active'));
        presetBtns[3].classList.add('active'); // Custom is index 3
    }

    presetBtns.forEach((btn, idx) => {
        if (idx === 3) return; // Custom button ignores click preset loading
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            n = PRESETS[idx].n;
            k = PRESETS[idx].k;
            inputN.value = n;
            valN.textContent = n;
            inputK.value = k;
            valK.textContent = k;
            reset();
        });
    });

    btnPlay.addEventListener('click', () => {
        if (isPlaying) {
            stopPlaying();
        } else {
            if (stepIndex >= steps.length - 1 || steps.length === 0) {
                reset();
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

    btnReset.addEventListener('click', reset);

    function reset() {
        stopPlaying();
        n = parseInt(inputN.value, 10);
        k = parseInt(inputK.value, 10);
        targetCount.textContent = k;
        foundCount.textContent = '0';

        // Clear UI
        renderEmptySlots();
        stringsList.innerHTML = '';
        resultCard.style.display = 'none';
        statusBar.innerHTML = `Adjust <strong>n</strong> and <strong>k</strong>, then click <strong>Visualize</strong>`;

        steps = [];
        stepIndex = -1;
    }

    function renderEmptySlots() {
        slotsContainer.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.id = `slot-${i}`;
            const label = document.createElement('span');
            label.className = 'slot-index';
            label.textContent = `i=${i}`;
            slot.appendChild(label);
            slotsContainer.appendChild(slot);
        }
    }

    // ===== Algorithm Simulation & Step Generation =====
    function buildSteps() {
        steps = [];
        let happyStrings = [];
        let currentString = [];
        let done = false;

        steps.push({
            type: 'start',
            msg: `Generating exactly ${n} characters. Alphabet = 'a', 'b', 'c'. We need to stop at the ${k}-th happy string.`
        });

        // The backtrack function simulates the DFS
        function backtrack(index) {
            // Found kth string, stop early
            if (done) return;

            // Base case: length reached n
            if (index === n) {
                const happyStr = currentString.join('');
                happyStrings.push(happyStr);
                
                steps.push({
                    type: 'found',
                    str: happyStr,
                    totalFound: happyStrings.length,
                    msg: `Found happy string: <strong>"${happyStr}"</strong> (${happyStrings.length} / ${k})`
                });

                if (happyStrings.length === k) {
                    done = true;
                }
                return;
            }

            for (const char of ['a', 'b', 'c']) {
                if (done) return;

                const prevChar = index > 0 ? currentString[index - 1] : null;

                // Try char
                steps.push({
                    type: 'try',
                    index,
                    char,
                    prevChar,
                    currentString: [...currentString],
                    msg: `Trying '<strong>${char}</strong>' at index ${index} (prev: '${prevChar || '-'}')`
                });

                if (char === prevChar) {
                    steps.push({
                        type: 'invalid',
                        index,
                        char,
                        msg: `Cannot use '<strong>${char}</strong>', same as previous character!`
                    });
                } else {
                    steps.push({
                        type: 'valid',
                        index,
                        char,
                        currentString: [...currentString, char],
                        msg: `'<strong>${char}</strong>' is valid. Recursing to next index.`
                    });

                    currentString.push(char);
                    backtrack(index + 1);
                    currentString.pop();

                    if (!done) {
                        steps.push({
                            type: 'backtrack',
                            index,
                            currentString: [...currentString],
                            msg: `Backtracking from index ${index}. Removing '<strong>${char}</strong>'.`
                        });
                    }
                }
            }
        }

        backtrack(0);

        if (happyStrings.length >= k) {
            steps.push({
                type: 'result',
                answer: happyStrings[k - 1],
                msg: `Target reached! The ${k}-th happy string is <strong>"${happyStrings[k - 1]}"</strong>.`
            });
        } else {
            steps.push({
                type: 'result',
                answer: "",
                msg: `Exhausted all possibilities. Only found ${happyStrings.length} happy string(s). Returning empty string.`
            });
        }
    }

    // ===== UI Updates =====
    function updateSlots(stateArr, activeIndex, charToTry = null, status = null) {
        for (let i = 0; i < n; i++) {
            const slot = document.getElementById(`slot-${i}`);
            if (!slot) continue;
            
            slot.className = 'slot'; // reset

            if (i < stateArr.length) {
                // Keep the label safely
                const label = `<span class="slot-index">i=${i}</span>`;
                slot.innerHTML = `${stateArr[i]} ${label}`;
            } else if (i === activeIndex && charToTry) {
                const label = `<span class="slot-index">i=${i}</span>`;
                slot.innerHTML = `${charToTry} ${label}`;
                slot.classList.add('active');
                if (status === 'invalid') slot.classList.add('invalid');
                if (status === 'valid') slot.classList.add('valid');
            } else {
                const label = `<span class="slot-index">i=${i}</span>`;
                slot.innerHTML = ` ${label}`;
            }
        }
    }

    function applyStep(step) {
        if (step.msg) {
            statusBar.innerHTML = step.msg;
        }

        switch (step.type) {
            case 'start':
                stringsList.innerHTML = '';
                foundCount.textContent = '0';
                updateSlots([], -1);
                break;
            case 'try':
                updateSlots(step.currentString, step.index, step.char);
                break;
            case 'invalid':
                updateSlots(step.currentString, step.index, step.char, 'invalid');
                break;
            case 'valid':
                updateSlots(step.currentString, step.index-1, null); // remove active highlight
                updateSlots(step.currentString, -1);
                break;
            case 'backtrack':
                updateSlots(step.currentString, -1);
                break;
            case 'found':
                updateSlots(step.str.split(''), -1);
                foundCount.textContent = step.totalFound;
                
                const chip = document.createElement('div');
                chip.className = 'string-chip';
                chip.textContent = step.str;
                stringsList.appendChild(chip);
                stringsList.scrollTop = stringsList.scrollHeight;

                if (step.totalFound === k) {
                    chip.classList.add('target');
                }
                break;
            case 'result':
                resultCard.style.display = 'block';
                resultValue.textContent = `"${step.answer}"`;
                updateSlots(step.answer ? step.answer.split('') : [], -1);
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
    reset();

})();
