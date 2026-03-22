/**
 * LeetViz — #1519 Number of Nodes in the Sub-Tree With the Same Label
 * Visualizes DFS traversal counting character frequencies in subtrees.
 */
(() => {
  'use strict';

  // ===== Presets =====
  const PRESETS = [
    {
      n: 7,
      edges: [[0,1],[0,2],[1,4],[1,5],[2,3],[2,6]],
      labels: 'abaedcd',
      expected: [2,1,1,1,1,1,1]
    },
    {
      n: 4,
      edges: [[0,1],[1,2],[0,3]],
      labels: 'bbbb',
      expected: [4,2,1,1]
    },
    {
      n: 5,
      edges: [[0,1],[0,2],[1,3],[0,4]],
      labels: 'aabab',
      expected: [3,2,1,1,1]
    }
  ];

  // ===== DOM References =====
  const treeSvg = document.getElementById('treeSvg');
  const statusBar = document.getElementById('statusBar');
  const resultCard = document.getElementById('resultCard');
  const resultValue = document.getElementById('resultValue');
  const btnPlay = document.getElementById('btnPlay');
  const btnStep = document.getElementById('btnStep');
  const btnReset = document.getElementById('btnReset');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const infoNodes = document.getElementById('infoNodes');
  const infoLabels = document.getElementById('infoLabels');
  const hintsRevealed = document.getElementById('hintsRevealed');
  const hintsProgressFill = document.getElementById('hintsProgressFill');

  // ===== State =====
  let currentPreset = 0;
  let speed = 1;
  let steps = [];
  let stepIndex = -1;
  let isPlaying = false;
  let playTimer = null;
  let adj = [];
  let labels = '';
  let n = 0;
  let treeLayout = []; // {x, y} for each node
  let answer = [];

  // ===== Build adjacency list =====
  function buildAdj(edges, nodeCount) {
    const a = Array.from({ length: nodeCount }, () => []);
    for (const [u, v] of edges) {
      a[u].push(v);
      a[v].push(u);
    }
    return a;
  }

  // ===== Compute tree layout (BFS from root 0) =====
  function computeLayout() {
    const children = Array.from({ length: n }, () => []);
    const visited = new Set();
    const parent = new Array(n).fill(-1);
    const depth = new Array(n).fill(0);
    const order = [];

    // BFS to get parent-child relationship
    const queue = [0];
    visited.add(0);
    while (queue.length > 0) {
      const u = queue.shift();
      order.push(u);
      for (const v of adj[u]) {
        if (!visited.has(v)) {
          visited.add(v);
          parent[v] = u;
          depth[v] = depth[u] + 1;
          children[u].push(v);
          queue.push(v);
        }
      }
    }

    // Compute subtree sizes for proportional spacing
    const subtreeSize = new Array(n).fill(1);
    for (let i = order.length - 1; i >= 0; i--) {
      const u = order[i];
      for (const c of children[u]) {
        subtreeSize[u] += subtreeSize[c];
      }
    }

    // Assign x positions using subtree sizes
    const maxDepth = Math.max(...depth) + 1;
    const svgWidth = Math.max(400, n * 60);
    const svgHeight = Math.max(200, maxDepth * 70 + 60);
    treeSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    const positions = new Array(n);
    function assignX(node, left, right) {
      const kids = children[node];
      if (kids.length === 0) {
        positions[node] = { x: (left + right) / 2, y: depth[node] * 70 + 35 };
        return;
      }
      let cursor = left;
      for (const c of kids) {
        const w = (subtreeSize[c] / subtreeSize[node]) * (right - left);
        assignX(c, cursor, cursor + w);
        cursor += w;
      }
      positions[node] = { x: (left + right) / 2, y: depth[node] * 70 + 35 };
    }
    assignX(0, 20, svgWidth - 20);

    treeLayout = positions;
    return { children, parent, depth };
  }

  // ===== Render tree SVG =====
  function renderTree(treeInfo) {
    treeSvg.innerHTML = '';
    const { children } = treeInfo;

    // Draw edges first
    for (let u = 0; u < n; u++) {
      for (const v of children[u]) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', treeLayout[u].x);
        line.setAttribute('y1', treeLayout[u].y);
        line.setAttribute('x2', treeLayout[v].x);
        line.setAttribute('y2', treeLayout[v].y);
        line.classList.add('tree-edge');
        line.id = `edge-${u}-${v}`;
        treeSvg.appendChild(line);
      }
    }

    // Draw nodes
    for (let i = 0; i < n; i++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('tree-node');
      g.id = `node-${i}`;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', treeLayout[i].x);
      circle.setAttribute('cy', treeLayout[i].y);
      circle.setAttribute('r', 18);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.classList.add('node-label');
      label.setAttribute('x', treeLayout[i].x);
      label.setAttribute('y', treeLayout[i].y);
      label.textContent = labels[i];

      const idText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      idText.classList.add('node-id');
      idText.setAttribute('x', treeLayout[i].x);
      idText.setAttribute('y', treeLayout[i].y - 24);
      idText.textContent = i;

      const ansText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      ansText.classList.add('node-answer');
      ansText.id = `ans-${i}`;
      ansText.setAttribute('x', treeLayout[i].x);
      ansText.setAttribute('y', treeLayout[i].y + 30);
      ansText.textContent = '';

      g.appendChild(circle);
      g.appendChild(label);
      g.appendChild(idText);
      g.appendChild(ansText);
      treeSvg.appendChild(g);
    }
  }

  // ===== Build DFS steps =====
  function buildSteps(treeInfo) {
    steps = [];
    answer = new Array(n).fill(0);
    const { children } = treeInfo;

    function dfs(node, parentNode) {
      steps.push({
        type: 'visit',
        node,
        parent: parentNode,
        msg: `Visiting node <strong>${node}</strong> (label '<strong>${labels[node]}</strong>')`
      });

      const count = new Array(26).fill(0);

      for (const child of children[node]) {
        steps.push({
          type: 'go-child',
          node,
          child,
          msg: `Going to child <strong>${child}</strong> from node ${node}`
        });

        const childCount = dfs(child, node);

        // Merge step
        steps.push({
          type: 'merge',
          node,
          child,
          childCount: [...childCount],
          msg: `Merging subtree counts from child <strong>${child}</strong> into node <strong>${node}</strong>`
        });

        for (let i = 0; i < 26; i++) {
          count[i] += childCount[i];
        }
      }

      // Add self
      const labelIdx = labels.charCodeAt(node) - 97;
      count[labelIdx] += 1;
      answer[node] = count[labelIdx];

      steps.push({
        type: 'compute',
        node,
        label: labels[node],
        answer: count[labelIdx],
        count: [...count],
        msg: `Node <strong>${node}</strong> (label '<strong>${labels[node]}</strong>'): subtree has <strong>${count[labelIdx]}</strong> node(s) with label '${labels[node]}'`
      });

      return count;
    }

    dfs(0, -1);

    steps.push({
      type: 'result',
      answer: [...answer],
      msg: `DFS complete! Answer: <strong>[${answer.join(', ')}]</strong>`
    });
  }

  // ===== Apply step =====
  function applyStep(step) {
    // Clear visiting state
    document.querySelectorAll('.tree-node.visiting').forEach(el => el.classList.remove('visiting'));

    switch (step.type) {
      case 'visit': {
        const nodeEl = document.getElementById(`node-${step.node}`);
        if (nodeEl) nodeEl.classList.add('visiting');
        break;
      }

      case 'go-child': {
        const edgeEl = document.getElementById(`edge-${step.node}-${step.child}`);
        if (edgeEl) edgeEl.classList.add('visited');
        const childNode = document.getElementById(`node-${step.child}`);
        if (childNode) childNode.classList.add('visiting');
        break;
      }

      case 'merge': {
        // Highlight parent as active again
        const parentNode = document.getElementById(`node-${step.node}`);
        if (parentNode) parentNode.classList.add('visiting');
        break;
      }

      case 'compute': {
        const nodeEl = document.getElementById(`node-${step.node}`);
        if (nodeEl) {
          nodeEl.classList.remove('visiting');
          nodeEl.classList.add('computed');
        }
        const ansEl = document.getElementById(`ans-${step.node}`);
        if (ansEl) ansEl.textContent = `ans=${step.answer}`;
        break;
      }

      case 'result': {
        resultCard.style.display = '';
        resultValue.textContent = `[${step.answer.join(', ')}]`;
        break;
      }
    }

    if (step.msg) {
      statusBar.innerHTML = step.msg;
    }
  }

  // ===== Controls =====
  function getDelay() {
    return 700 / speed;
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

    const preset = PRESETS[currentPreset];
    n = preset.n;
    labels = preset.labels;
    adj = buildAdj(preset.edges, n);

    infoNodes.textContent = n;
    infoLabels.textContent = `"${labels}"`;

    const treeInfo = computeLayout();
    renderTree(treeInfo);
    buildSteps(treeInfo);

    statusBar.innerHTML = 'Click <strong>Play</strong> or <strong>Step</strong> to begin DFS';
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
      if (stepIndex >= steps.length - 1) reset();
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

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPreset = parseInt(btn.dataset.preset, 10);
      reset();
    });
  });

  // ===== Init =====
  initHints();
  reset();
})();
