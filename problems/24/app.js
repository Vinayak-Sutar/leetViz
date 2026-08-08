/**
 * LeetViz — #24 Swap Nodes in Pairs Visualizer
 */
(() => {
  'use strict';

  // ===== DOM References =====
  const listInput = document.getElementById('listInput');
  const btnPlay = document.getElementById('btnPlay');
  const btnStep = document.getElementById('btnStep');
  const btnReset = document.getElementById('btnReset');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const canvas = document.getElementById('listCanvas');
  const ctx = canvas.getContext('2d');
  const statusBar = document.getElementById('statusBar');
  const resultCard = document.getElementById('resultCard');
  const resultValue = document.getElementById('resultValue');
  const hintsRevealed = document.getElementById('hintsRevealed');
  const hintsProgressFill = document.getElementById('hintsProgressFill');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // ===== State =====
  let head = null;
  let nodes = [];
  let steps = [];
  let stepIndex = -1;
  let isPlaying = false;
  let playTimer = null;
  let speed = 1;
  let canvasW = 0;
  let canvasH = 0;
  
  // Animation state
  let lastTime = 0;

  class ListNode {
    constructor(val, id, isDummy = false) {
      this.val = val;
      this.id = id;
      this.isDummy = isDummy;
      this.next = null;
      // Rendering
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.state = 'idle'; // idle | prev | first | second
    }
  }

  // ===== Parse input =====
  function parseList(input) {
    const str = input.trim();
    if (!str) return null;
    const parts = str.split(',').map(s => s.trim()).filter(s => s !== '');
    if (parts.length === 0) return null;
    
    let dummy = new ListNode('dummy', -1, true);
    let curr = dummy;
    for (let i = 0; i < parts.length; i++) {
      curr.next = new ListNode(parts[i], i);
      curr = curr.next;
    }
    return dummy.next;
  }

  // ===== Initial Build =====
  function buildNodes() {
    nodes = [];
    let dummy = new ListNode('D', -1, true);
    dummy.next = head;
    
    let curr = dummy;
    while(curr) {
      nodes.push(curr);
      curr = curr.next;
    }
    
    let nullNode = new ListNode('null', -2, true);
    nodes.push(nullNode);
  }


  // ===== Generate Steps =====
  function generateSteps() {
    steps = [];
    if (!head || !head.next) return;

    let dummy = new ListNode('D', -1, true);
    dummy.next = head;
    let nullNode = new ListNode('null', -2, true);
    
    // Track all nodes for easy link state collection
    let allSimNodes = [];
    let temp = dummy;
    while(temp) { allSimNodes.push(temp); temp = temp.next; }
    allSimNodes.push(nullNode);
    
    // Explicitly maintain the visual order of nodes
    let visualOrder = allSimNodes.map(n => n.id);
    
    let simPrev = dummy;
    
    const takeSnapshot = (msg, stateMap = {}) => {
      let links = {};
      allSimNodes.forEach(n => {
        if (n.id === -2) {
          links[n.id] = null;
        } else {
          links[n.id] = n.next ? n.next.id : -2;
        }
      });
      steps.push({ msg, states: stateMap, order: [...visualOrder], links });
    };

    takeSnapshot("Initial state: prev points to dummy", { [simPrev.id]: 'prev' });

    while (simPrev.next !== null && simPrev.next.next !== null) {
      let first = simPrev.next;
      let second = simPrev.next.next;
      
      takeSnapshot(`Identify pair: nodes '${first.val}' and '${second.val}'`, {
        [simPrev.id]: 'prev', [first.id]: 'first', [second.id]: 'second'
      });

      // Break down the swap into 3 individual steps
      first.next = second.next;
      takeSnapshot(`Step 1: Point first.next to second.next`, {
        [simPrev.id]: 'prev', [first.id]: 'first', [second.id]: 'second'
      });

      second.next = first;
      takeSnapshot(`Step 2: Point second.next to first`, {
        [simPrev.id]: 'prev', [first.id]: 'first', [second.id]: 'second'
      });
      
      simPrev.next = second;
      // Update visual order so they physically swap on screen
      let idx1 = visualOrder.indexOf(first.id);
      let idx2 = visualOrder.indexOf(second.id);
      visualOrder[idx1] = second.id;
      visualOrder[idx2] = first.id;
      
      takeSnapshot(`Step 3: Point prev.next to second (Nodes swap positions)`, {
        [simPrev.id]: 'prev', [first.id]: 'first', [second.id]: 'second'
      });
      
      simPrev = first;
      takeSnapshot(`Advance prev to node '${simPrev.val}'`, {
        [simPrev.id]: 'prev'
      });
    }
    
    takeSnapshot("Finished swapping nodes.");
  }
  
  // ===== Apply Step =====
  function applyStep(index) {
    if (index < 0) {
      // Reset
      nodes.forEach(n => { n.state = 'idle'; });
      for(let i=0; i<nodes.length-1; i++) {
        nodes[i].next = nodes[i+1];
      }
      nodes[nodes.length-1].next = null;
      
      const nodeSpacing = 80;
      const totalWidth = (nodes.length - 1) * nodeSpacing;
      const startX = Math.max(50, (canvasW - totalWidth) / 2);
      
      nodes.forEach((n, i) => {
        n.targetX = startX + i * nodeSpacing;
        n.targetY = canvasH / 2;
      });
      
      statusBar.innerHTML = "Click <strong>Play</strong> or <strong>Step</strong> to begin swapping nodes";
      resultCard.style.display = 'none';
      return;
    }
    
    const step = steps[index];
    statusBar.innerHTML = step.msg;
    
    nodes.forEach(n => n.state = 'idle');
    Object.keys(step.states).forEach(id => {
      let n = nodes.find(x => x.id == id);
      if (n) n.state = step.states[id];
    });
    
    nodes.forEach(n => {
      let nextId = step.links[n.id];
      n.next = nextId !== null ? nodes.find(x => x.id == nextId) : null;
    });
    
    const nodeSpacing = 80;
    const totalWidth = (step.order.length - 1) * nodeSpacing;
    const startX = Math.max(50, (canvasW - totalWidth) / 2);
    
    step.order.forEach((id, i) => {
      let n = nodes.find(x => x.id == id);
      if (n) {
        n.targetX = startX + i * nodeSpacing;
      }
    });
    
    if (index === steps.length - 1) {
      showResult(step.order.slice(1).filter(id => id !== -2).map(id => nodes.find(x => x.id == id).val).join(', '));
    } else {
      resultCard.style.display = 'none';
    }
  }

  function showResult(res) {
    resultValue.textContent = res || "[]";
    resultCard.style.display = 'block';
  }

  // ===== Render =====
  function draw() {
    ctx.clearRect(0, 0, canvasW, canvasH);
    
    nodes.forEach(n => {
      if (n.next) {
        drawArrow(n.x, n.y, n.next.x, n.next.y);
      }
    });
    
    nodes.forEach(n => {
      drawNode(n);
    });
  }
  
  function drawNode(n) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 20, 0, 2 * Math.PI);
    
    if (n.isDummy) {
      ctx.fillStyle = '#333';
      ctx.strokeStyle = '#666';
    } else {
      ctx.fillStyle = '#1e1e24';
      ctx.strokeStyle = '#555';
      
      if (n.state === 'prev') {
        ctx.strokeStyle = '#ffd700';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      } else if (n.state === 'first') {
        ctx.strokeStyle = '#ff6b6b';
        ctx.fillStyle = 'rgba(255, 107, 107, 0.1)';
      } else if (n.state === 'second') {
        ctx.strokeStyle = '#4ecdc4';
        ctx.fillStyle = 'rgba(78, 205, 196, 0.1)';
      }
    }
    
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = n.isDummy ? '#999' : '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.val, n.x, n.y);
    
    if (n.state !== 'idle' && !n.isDummy) {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '12px sans-serif';
      ctx.fillText(n.state, n.x, n.y - 30);
    } else if (n.state === 'prev') {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '12px sans-serif';
      ctx.fillText(n.state, n.x, n.y - 30);
    }
  }
  
  function drawArrow(x1, y1, x2, y2) {
    const headlen = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const radius = 20;
    
    const startX = x1 + radius * Math.cos(angle);
    const startY = y1 + radius * Math.sin(angle);
    let endX = x2 - radius * Math.cos(angle);
    let endY = y2 - radius * Math.sin(angle);
    
    let isCurve = Math.abs(x2 - x1) > 90; 
    
    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    
    if (isCurve) {
      const cpX = (x1 + x2) / 2;
      const cpY = y1 - 40;
      
      const endAngle = Math.atan2(y2 - cpY, x2 - cpX);
      endX = x2 - radius * Math.cos(endAngle);
      endY = y2 - radius * Math.sin(endAngle);
      
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      
      ctx.stroke();
      
      ctx.beginPath();
      ctx.fillStyle = '#666';
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headlen * Math.cos(endAngle - Math.PI / 6), endY - headlen * Math.sin(endAngle - Math.PI / 6));
      ctx.lineTo(endX - headlen * Math.cos(endAngle + Math.PI / 6), endY - headlen * Math.sin(endAngle + Math.PI / 6));
      ctx.fill();
    } else {
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.fillStyle = '#666';
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
      ctx.fill();
    }
  }

  // ===== Animation Loop =====
  function animate(time) {
    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    
    nodes.forEach(n => {
      const dx = n.targetX - n.x;
      const dy = n.targetY - n.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        n.x += dx * 5 * speed * dt;
        n.y += dy * 5 * speed * dt;
      } else {
        n.x = n.targetX;
        n.y = n.targetY;
      }
    });
    
    draw();
    requestAnimationFrame(animate);
  }

  // ===== Resize & Init =====
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvasW = rect.width;
    canvasH = rect.height;
    canvas.width = canvasW * window.devicePixelRatio;
    canvas.height = canvasH * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    if (nodes.length > 0) {
      applyStep(stepIndex);
      // Snap immediately to avoid sliding from previous canvas width
      nodes.forEach(n => { n.x = n.targetX; n.y = n.targetY; });
    }
  }

  function init() {
    head = parseList(listInput.value);
    buildNodes();
    stepIndex = -1;
    generateSteps();
    resize();
  }

  // ===== Event Listeners =====
  window.addEventListener('resize', resize);
  
  listInput.addEventListener('change', () => {
    stopPlay();
    init();
  });
  
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      listInput.value = btn.dataset.value;
      stopPlay();
      init();
    });
  });

  speedSlider.addEventListener('input', (e) => {
    speed = parseInt(e.target.value, 10);
    speedValue.textContent = speed + '×';
  });

  btnPlay.addEventListener('click', () => {
    if (isPlaying) {
      stopPlay();
    } else {
      if (stepIndex >= steps.length - 1) {
        stepIndex = -1;
        applyStep(-1);
      }
      isPlaying = true;
      btnPlay.innerHTML = '<span class="btn__icon">⏸</span> Pause';
      nextStepLoop();
    }
  });

  btnStep.addEventListener('click', () => {
    stopPlay();
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      applyStep(stepIndex);
    }
  });

  btnReset.addEventListener('click', () => {
    stopPlay();
    stepIndex = -1;
    applyStep(-1);
  });

  function nextStepLoop() {
    if (!isPlaying) return;
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      applyStep(stepIndex);
      playTimer = setTimeout(nextStepLoop, 1500 / speed);
    } else {
      stopPlay();
    }
  }

  function stopPlay() {
    isPlaying = false;
    clearTimeout(playTimer);
    btnPlay.innerHTML = '<span class="btn__icon">▶</span> Play';
  }

  // ===== Hints Logic =====
  const hints = document.querySelectorAll('.hint');
  let revealedCount = 0;
  
  hints.forEach((hintEl, idx) => {
    hintEl.addEventListener('click', () => {
      if (!hintEl.classList.contains('locked')) {
        hintEl.classList.add('revealed');
        if (idx + 1 < hints.length) {
          hints[idx + 1].classList.remove('locked');
        }
        
        revealedCount = document.querySelectorAll('.hint.revealed').length;
        hintsRevealed.textContent = revealedCount;
        hintsProgressFill.style.width = (revealedCount / hints.length) * 100 + '%';
      }
    });
  });

  // ===== Boot =====
  requestAnimationFrame((time) => {
    lastTime = time;
    init();
    animate(time);
  });

})();
