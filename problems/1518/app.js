(() => {
    'use strict';

    // ===== State Management =====
    const state = {
        numBottles: 9,
        numExchange: 3,
        speed: 1,
        steps: [],
        currentStepIndex: 0,
        isPlaying: false,
        animationSpeed: 1000,
        revealedHints: 0
    };

    // ===== DOM Elements =====
    const elements = {
        // Controls
        numBottlesSlider: document.getElementById('numBottlesSlider'),
        numBottlesValue: document.getElementById('numBottlesValue'),
        numExchangeSlider: document.getElementById('numExchangeSlider'),
        numExchangeValue: document.getElementById('numExchangeValue'),
        speedSlider: document.getElementById('speedSlider'),
        speedValue: document.getElementById('speedValue'),
        
        // Buttons
        playBtn: document.getElementById('playBtn'),
        stepBtn: document.getElementById('stepBtn'),
        resetBtn: document.getElementById('resetBtn'),
        example1Btn: document.getElementById('example1Btn'),
        example2Btn: document.getElementById('example2Btn'),
        
        // Visualization
        fullBottles: document.getElementById('fullBottles'),
        emptyBottles: document.getElementById('emptyBottles'),
        fullCount: document.getElementById('fullCount'),
        emptyCount: document.getElementById('emptyCount'),
        currentStep: document.getElementById('currentStep'),
        actionDescription: document.getElementById('actionDescription'),
        resultCard: document.getElementById('resultCard'),
        resultValue: document.getElementById('resultValue'),
        resultBar: document.getElementById('resultBar'),
        
        // Hints
        hints: document.querySelectorAll('.hint'),
        hintsProgress: document.getElementById('hintsProgress'),
        hintsProgressBar: document.getElementById('hintsProgressBar')
    };

    // ===== Algorithm Implementation =====
    function generateSteps(numBottles, numExchange) {
        const steps = [];
        let totalDrunk = numBottles;
        let emptyBottles = numBottles;
        let fullBottles = 0;
        let stepNum = 0;

        // Initial state
        steps.push({
            stepNum: stepNum++,
            action: 'initial',
            description: `Starting with ${numBottles} full bottles`,
            fullBottles: numBottles,
            emptyBottles: 0,
            totalDrunk: 0
        });

        // Drink initial bottles
        steps.push({
            stepNum: stepNum++,
            action: 'drink',
            description: `Drinking ${numBottles} bottles → Total drunk: ${totalDrunk}`,
            fullBottles: 0,
            emptyBottles: emptyBottles,
            totalDrunk: totalDrunk
        });

        // Exchange loop
        while (emptyBottles >= numExchange) {
            const newFullBottles = Math.floor(emptyBottles / numExchange);
            const remainingEmpty = emptyBottles % numExchange;

            // Exchange step
            steps.push({
                stepNum: stepNum++,
                action: 'exchange',
                description: `Exchanging ${newFullBottles * numExchange} empty bottles for ${newFullBottles} full bottles (${remainingEmpty} empty remain)`,
                fullBottles: newFullBottles,
                emptyBottles: remainingEmpty,
                totalDrunk: totalDrunk,
                exchanged: newFullBottles * numExchange
            });

            // Drink new bottles
            totalDrunk += newFullBottles;
            emptyBottles = remainingEmpty + newFullBottles;

            steps.push({
                stepNum: stepNum++,
                action: 'drink',
                description: `Drinking ${newFullBottles} bottles → Total drunk: ${totalDrunk}`,
                fullBottles: 0,
                emptyBottles: emptyBottles,
                totalDrunk: totalDrunk
            });
        }

        // Final state
        steps.push({
            stepNum: stepNum++,
            action: 'complete',
            description: `Complete! Cannot exchange ${emptyBottles} bottles (need ${numExchange}). Total drunk: ${totalDrunk}`,
            fullBottles: 0,
            emptyBottles: emptyBottles,
            totalDrunk: totalDrunk
        });

        return steps;
    }

    // ===== Visualization Rendering =====
    function renderBottles(fullCount, emptyCount) {
        // Clear existing bottles
        elements.fullBottles.innerHTML = '';
        elements.emptyBottles.innerHTML = '';

        // Adjust bottle size based on count
        const totalBottles = Math.max(fullCount, emptyCount);
        elements.fullBottles.className = 'bottles-grid';
        elements.emptyBottles.className = 'bottles-grid';
        
        if (totalBottles > 30) {
            elements.fullBottles.classList.add('tiny');
            elements.emptyBottles.classList.add('tiny');
        } else if (totalBottles > 15) {
            elements.fullBottles.classList.add('small');
            elements.emptyBottles.classList.add('small');
        }

        // Render full bottles
        for (let i = 0; i < fullCount; i++) {
            const bottle = document.createElement('div');
            bottle.className = 'bottle full';
            bottle.innerHTML = '💧';
            bottle.style.animationDelay = `${i * 0.05}s`;
            elements.fullBottles.appendChild(bottle);
        }

        // Render empty bottles
        for (let i = 0; i < emptyCount; i++) {
            const bottle = document.createElement('div');
            bottle.className = 'bottle empty';
            bottle.innerHTML = '💧';
            bottle.style.animationDelay = `${i * 0.05}s`;
            elements.emptyBottles.appendChild(bottle);
        }

        // Update counts
        elements.fullCount.textContent = fullCount;
        elements.emptyCount.textContent = emptyCount;
    }

    function updateVisualization(step) {
        if (!step) return;

        // Update step number
        elements.currentStep.textContent = step.stepNum;

        // Update description
        elements.actionDescription.textContent = step.description;
        elements.actionDescription.classList.add('highlight');
        setTimeout(() => {
            elements.actionDescription.classList.remove('highlight');
        }, 500);

        // Render bottles
        renderBottles(step.fullBottles, step.emptyBottles);

        // Show/update result card when complete
        if (step.action === 'complete') {
            elements.resultCard.style.display = 'block';
            elements.resultValue.textContent = step.totalDrunk;
            
            // Animate progress bar
            const maxPossible = state.numBottles * 2; // Rough estimate
            const percentage = Math.min(100, (step.totalDrunk / maxPossible) * 100);
            elements.resultBar.style.width = `${percentage}%`;
        } else {
            elements.resultCard.style.display = 'none';
        }
    }

    function addDrinkAnimation() {
        const fullBottlesElements = elements.fullBottles.querySelectorAll('.bottle');
        fullBottlesElements.forEach((bottle, index) => {
            setTimeout(() => {
                bottle.classList.add('drinking');
            }, index * 50);
        });
    }

    function addExchangeAnimation() {
        const emptyBottlesElements = elements.emptyBottles.querySelectorAll('.bottle');
        const exchangeCount = state.steps[state.currentStepIndex]?.exchanged || 0;
        
        for (let i = 0; i < Math.min(exchangeCount, emptyBottlesElements.length); i++) {
            setTimeout(() => {
                if (emptyBottlesElements[i]) {
                    emptyBottlesElements[i].classList.add('exchanging');
                }
            }, i * 50);
        }
    }

    // ===== Control Functions =====
    function reset() {
        stopPlaying();
        state.steps = generateSteps(state.numBottles, state.numExchange);
        state.currentStepIndex = 0;
        updateVisualization(state.steps[0]);
        enableControls();
    }

    function stepForward() {
        if (state.currentStepIndex < state.steps.length - 1) {
            state.currentStepIndex++;
            const step = state.steps[state.currentStepIndex];
            
            // Add animations based on action type
            if (step.action === 'drink') {
                addDrinkAnimation();
            } else if (step.action === 'exchange') {
                addExchangeAnimation();
            }
            
            updateVisualization(step);
        }

        if (state.currentStepIndex >= state.steps.length - 1) {
            stopPlaying();
        }
    }

    function play() {
        if (state.isPlaying) {
            stopPlaying();
            return;
        }

        state.isPlaying = true;
        elements.playBtn.classList.add('playing');
        elements.playBtn.innerHTML = '<span class="btn__icon">⏸️</span><span>Pause</span>';
        elements.stepBtn.disabled = true;
        disableInputControls();

        const playInterval = setInterval(() => {
            if (state.currentStepIndex >= state.steps.length - 1) {
                stopPlaying();
                clearInterval(playInterval);
            } else {
                stepForward();
            }
        }, state.animationSpeed / state.speed);

        // Store interval for cleanup
        state.playInterval = playInterval;
    }

    function stopPlaying() {
        state.isPlaying = false;
        elements.playBtn.classList.remove('playing');
        elements.playBtn.innerHTML = '<span class="btn__icon">▶️</span><span>Play</span>';
        elements.stepBtn.disabled = false;
        enableInputControls();
        
        if (state.playInterval) {
            clearInterval(state.playInterval);
            state.playInterval = null;
        }
    }

    function disableInputControls() {
        elements.numBottlesSlider.disabled = true;
        elements.numExchangeSlider.disabled = true;
    }

    function enableInputControls() {
        elements.numBottlesSlider.disabled = false;
        elements.numExchangeSlider.disabled = false;
    }

    function enableControls() {
        elements.playBtn.disabled = false;
        elements.stepBtn.disabled = false;
        elements.resetBtn.disabled = false;
    }

    // ===== Hints System =====
    function setupHints() {
        elements.hints.forEach((hint, index) => {
            hint.addEventListener('click', () => {
                // Check if hint is locked
                if (hint.classList.contains('locked')) {
                    return;
                }

                // Reveal this hint
                if (!hint.classList.contains('revealed')) {
                    hint.classList.add('revealed');
                    state.revealedHints++;
                    updateHintsProgress();

                    // Unlock next hint
                    if (index < elements.hints.length - 1) {
                        elements.hints[index + 1].classList.remove('locked');
                        const blurLabel = elements.hints[index + 1].querySelector('.hint__blur-label');
                        const blurIcon = elements.hints[index + 1].querySelector('.hint__blur-icon');
                        if (blurLabel) blurLabel.textContent = 'Click to reveal';
                        if (blurIcon) blurIcon.textContent = '👁️';
                    }
                }
            });
        });
    }

    function updateHintsProgress() {
        const total = elements.hints.length;
        const percentage = (state.revealedHints / total) * 100;
        
        elements.hintsProgress.textContent = `${state.revealedHints} / ${total} revealed`;
        elements.hintsProgressBar.style.width = `${percentage}%`;
    }

    // ===== Event Listeners =====
    function setupEventListeners() {
        // Slider controls
        elements.numBottlesSlider.addEventListener('input', (e) => {
            state.numBottles = parseInt(e.target.value);
            elements.numBottlesValue.textContent = state.numBottles;
            reset();
        });

        elements.numExchangeSlider.addEventListener('input', (e) => {
            state.numExchange = parseInt(e.target.value);
            elements.numExchangeValue.textContent = state.numExchange;
            reset();
        });

        elements.speedSlider.addEventListener('input', (e) => {
            state.speed = parseInt(e.target.value);
            elements.speedValue.textContent = `${state.speed}×`;
        });

        // Button controls
        elements.playBtn.addEventListener('click', play);
        elements.stepBtn.addEventListener('click', stepForward);
        elements.resetBtn.addEventListener('click', reset);

        // Example buttons
        elements.example1Btn.addEventListener('click', () => {
            state.numBottles = 9;
            state.numExchange = 3;
            elements.numBottlesSlider.value = 9;
            elements.numBottlesValue.textContent = 9;
            elements.numExchangeSlider.value = 3;
            elements.numExchangeValue.textContent = 3;
            reset();
        });

        elements.example2Btn.addEventListener('click', () => {
            state.numBottles = 15;
            state.numExchange = 4;
            elements.numBottlesSlider.value = 15;
            elements.numBottlesValue.textContent = 15;
            elements.numExchangeSlider.value = 4;
            elements.numExchangeValue.textContent = 4;
            reset();
        });
    }

    // ===== Initialization =====
    function init() {
        setupEventListeners();
        setupHints();
        updateHintsProgress();
        reset();
    }

    // Start the app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
