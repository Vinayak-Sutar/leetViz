/**
 * LeetViz — #110 Balanced Binary Tree Visualizer
 * Visualizes DFS height computation to check if a binary tree is height-balanced.
 *
 * A height-balanced binary tree is one in which the depth of the two subtrees
 * of every node never differs by more than one.
 */
(() => {
  'use strict';

  // ===== DOM References =====
  const treeInput = document.getElementById('treeInput');
  const btnPlay = document.getElementById('btnPlay');
  const btnStep = document.getElementById('btnStep');
  const btnReset = document.getElementById('btnReset');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const canvas = document.getElementById('treeCanvas');
  const ctx = canvas.getContext('2d');
  const statusBar = document.getElementById('statusBar');
  const resultCard = document.getElementById('resultCard');
  const resultValue = document.getElementById('resultValue');
  const resultDetail = document.getElementById('resultDetail');
  const hintsRevealed = document.getElementById('hintsRevealed');
  const hintsProgressFill = document.getElementById('hintsProgressFill');

  // ===== State =====
  let tree = null;            // Root TreeNode
  let nodes = [];             // Flat array of all nodes for rendering
  let steps = [];             // DFS steps to visualize
  let stepIndex = -1;
  let isPlaying = false;
  let playTimer = null;
  let speed = 1;
  let canvasW = 0;
  let canvasH = 0;

  // ===== Tree Node =====
  class TreeNode {
    constructor(val) {
      this.val = val;
      this.left = null;
      this.right = null;
      // Rendering
      this.x = 0;
      this.y = 0;
      // DFS state
      this.state = 'idle';     // idle | visiting | computing | done | unbalanced
      this.height = null;      // computed height
      this.leftH = null;
      this.rightH = null;
    }
  }

  // ===== Parse level-order input =====
  function parseTree(input) {
    const str = input.trim();
    if (!str) return null;

    const parts = str.split(',').map(s => s.trim());
    if (!parts.length || parts[0] === 'null' || parts[0] === '') return null;

    const root = new TreeNode(parseInt(parts[0], 10));
    const queue = [root];
    let i = 1;

    while (queue.length && i < parts.length) {
      const node = queue.shift();
      if (!node) continue;

      // Left child
      if (i < parts.length) {
        const lv = parts[i++];
        if (lv !== 'null' && lv !== '') {
          node.left = new TreeNode(parseInt(lv, 10));
          queue.push(node.left);
        } else {
          queue.push(null);
        }
      }

      // Right child
      if (i < parts.length) {
        const rv = parts[i++];
        if (rv !== 'null' && rv !== '') {
          node.right = new TreeNode(parseInt(rv, 10));
          queue.push(node.right);
        } else {
          queue.push(null);
        }
      }
    }

    return root;
  }

  // ===== Collect all nodes =====
  function collectNodes(root) {
    const arr = [];
    function traverse(node) {
      if (!node) return;
      arr.push(node);
      traverse(node.left);
      traverse(node.right);
    }
    traverse(root);
    return arr;
  }

  // ===== Compute tree layout positions =====
  function layoutTree(root) {
    if (!root) return;

    const levelHeight = 60;
    const minNodeSpacing = 40;

    // Compute tree depth
    function depth(node) {
      if (!node) return 0;
      return 1 + Math.max(depth(node.left), depth(node.right));
    }

    const d = depth(root);
    const totalWidth = Math.max(canvasW - 40, minNodeSpacing * Math.pow(2, d - 1));

    function assign(node, level, leftBound, rightBound) {
      if (!node) return;
      const midX = (leftBound + rightBound) / 2;
      node.x = midX;
      node.y = 30 + level * levelHeight;
      assign(node.left, level + 1, leftBound, midX);
      assign(node.right, level + 1, midX, rightBound);
    }

    assign(root, 0, 20, totalWidth + 20);

    // Update canvas height to fit
    const neededH = 30 + d * levelHeight + 40;
    if (neededH > canvasH) {
      canvasH = neededH;
      canvas.height = canvasH * window.devicePixelRatio;
      canvas.style.height = canvasH + 'px';
    }
  }

  // ===== Generate DFS steps (post-order) =====
  function generateSteps(root) {
    const s = [];

    function dfs(node) {
      if (!node) return 0;

      s.push({ type: 'visit', node, msg: `Visiting node ${node.val}` });

      // Go left
      s.push({ type: 'go-left', node, msg: `Go to left subtree of ${node.val}` });
      const leftH = dfs(node.left);
      s.push({ type: 'return-left', node, leftH, msg: `Left subtree height of ${node.val} = ${leftH === -1 ? 'UNBALANCED' : leftH}` });

      // Go right
      s.push({ type: 'go-right', node, msg: `Go to right subtree of ${node.val}` });
      const rightH = dfs(node.right);
      s.push({ type: 'return-right', node, rightH, msg: `Right subtree height of ${node.val} = ${rightH === -1 ? 'UNBALANCED' : rightH}` });

      // Compute
      let h;
      if (leftH === -1 || rightH === -1 || Math.abs(leftH - rightH) > 1) {
        h = -1;
        s.push({
          type: 'unbalanced', node, leftH, rightH, h,
          msg: `Node ${node.val}: |${leftH} − ${rightH}| = ${Math.abs(leftH - rightH)} > 1 → UNBALANCED`
        });
      } else {
        h = Math.max(leftH, rightH) + 1;
        s.push({
          type: 'balanced', node, leftH, rightH, h,
          msg: `Node ${node.val}: |${leftH} − ${rightH}| = ${Math.abs(leftH - rightH)} ≤ 1 → height = ${h}`
        });
      }

      return h;
    }

    if (root) {
      const finalH = dfs(root);
      const isBalanced = finalH !== -1;
      s.push({
        type: 'result',
        isBalanced,
        msg: isBalanced ? 'Tree IS height-balanced ✓' : 'Tree is NOT height-balanced ✗'
      });
    } else {
      s.push({ type: 'result', isBalanced: true, msg: 'Empty tree is balanced ✓' });
    }

    return s;
  }

  // ===== Apply a step to the tree state =====
  function applyStep(step) {
    switch (step.type) {
      case 'visit':
        step.node.state = 'visiting';
        break;
      case 'go-left':
      case 'go-right':
        step.node.state = 'computing';
        break;
      case 'return-left':
        step.node.leftH = step.leftH;
        step.node.state = 'computing';
        break;
      case 'return-right':
        step.node.rightH = step.rightH;
        step.node.state = 'computing';
        break;
      case 'balanced':
        step.node.height = step.h;
        step.node.leftH = step.leftH;
        step.node.rightH = step.rightH;
        step.node.state = 'done';
        break;
      case 'unbalanced':
        step.node.height = step.h;
        step.node.leftH = step.leftH;
        step.node.rightH = step.rightH;
        step.node.state = 'unbalanced';
        break;
      case 'result':
        showResult(step.isBalanced);
        break;
    }
    statusBar.innerHTML = step.msg;
  }

  // ===== Show result =====
  function showResult(isBalanced) {
    resultCard.style.display = 'block';
    resultValue.textContent = isBalanced ? 'true' : 'false';
    resultValue.className = 'result-card__value ' + (isBalanced ? 'balanced' : 'unbalanced');
    resultDetail.textContent = isBalanced
      ? 'The tree is height-balanced'
      : 'The tree is NOT height-balanced';
  }

  // ===== Draw =====
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    if (!tree) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Empty tree', canvasW / 2, canvasH / 2);
      ctx.restore();
      return;
    }

    // Draw edges first
    drawEdges(tree);

    // Draw nodes
    for (const node of nodes) {
      drawNode(node);
    }

    ctx.restore();
  }

  function drawEdges(node) {
    if (!node) return;
    ctx.lineWidth = 2;

    if (node.left) {
      ctx.strokeStyle = getEdgeColor(node.left);
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(node.left.x, node.left.y);
      ctx.stroke();
      drawEdges(node.left);
    }

    if (node.right) {
      ctx.strokeStyle = getEdgeColor(node.right);
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(node.right.x, node.right.y);
      ctx.stroke();
      drawEdges(node.right);
    }
  }

  function getEdgeColor(node) {
    switch (node.state) {
      case 'visiting':
      case 'computing':
        return '#fbbf24';
      case 'done':
        return '#34d399';
      case 'unbalanced':
        return '#f87171';
      default:
        return '#4b5563';
    }
  }

  function drawNode(node) {
    const r = 18;

    // Background circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

    switch (node.state) {
      case 'visiting':
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
        ctx.shadowBlur = 15;
        break;
      case 'computing':
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
        ctx.shadowBlur = 12;
        break;
      case 'done':
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
        ctx.shadowBlur = 12;
        break;
      case 'unbalanced':
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        ctx.shadowBlur = 15;
        break;
      default:
        ctx.fillStyle = '#374151';
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = node.state === 'idle' ? '#6b7280' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value text
    ctx.fillStyle = node.state === 'idle' ? '#d1d5db' : '#111827';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.val), node.x, node.y);

    // Height label (when computed)
    if (node.height !== null) {
      const labelY = node.y - r - 10;
      const label = node.height === -1 ? '✗' : `h=${node.height}`;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = node.height === -1 ? '#f87171' : '#34d399';
      ctx.fillText(label, node.x, labelY);
    }

    // Show left/right heights when computing
    if (node.state === 'computing' || node.state === 'done' || node.state === 'unbalanced') {
      ctx.font = '9px "JetBrains Mono", monospace';
      if (node.leftH !== null) {
        ctx.fillStyle = node.leftH === -1 ? '#f87171' : '#93c5fd';
        ctx.textAlign = 'right';
        ctx.fillText(`L:${node.leftH === -1 ? '✗' : node.leftH}`, node.x - r - 4, node.y + 4);
      }
      if (node.rightH !== null) {
        ctx.fillStyle = node.rightH === -1 ? '#f87171' : '#93c5fd';
        ctx.textAlign = 'left';
        ctx.fillText(`R:${node.rightH === -1 ? '✗' : node.rightH}`, node.x + r + 4, node.y + 4);
      }
      ctx.textAlign = 'center';
    }
  }

  // ===== Controls =====
  function getDelay() {
    return 800 / speed;
  }

  function doStep() {
    if (stepIndex >= steps.length - 1) {
      stopPlaying();
      return false;
    }
    stepIndex++;
    applyStep(steps[stepIndex]);
    draw();
    return true;
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

    // Rebuild tree
    tree = parseTree(treeInput.value);
    nodes = tree ? collectNodes(tree) : [];
    resizeCanvas();
    layoutTree(tree);
    steps = generateSteps(tree);

    // Reset node states
    for (const n of nodes) {
      n.state = 'idle';
      n.height = null;
      n.leftH = null;
      n.rightH = null;
    }

    statusBar.innerHTML = 'Click <strong>Play</strong> or <strong>Step</strong> to begin DFS traversal';
    draw();
  }

  // ===== Canvas Resize =====
  function resizeCanvas() {
    const container = document.getElementById('vizContainer');
    const rect = container.getBoundingClientRect();
    canvasW = rect.width;
    canvasH = Math.max(320, rect.height);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
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

        // Unlock next
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

  treeInput.addEventListener('change', reset);

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      treeInput.value = btn.dataset.value;
      reset();
    });
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
    if (tree) layoutTree(tree);
    draw();
  });

  // ===== Init =====
  initHints();
  reset();
})();
