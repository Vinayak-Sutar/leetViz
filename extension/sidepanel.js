/**
 * LeetViz — Side Panel Controller
 * Fetches problem info, checks registry, and loads the visualizer iframe.
 * Reacts to navigation changes via chrome.storage and direct messaging.
 */
(() => {
  'use strict';

  const GITHUB_PAGES_BASE = 'https://vinayak-sutar.github.io/leetViz'; // PRODUCTION
  // const GITHUB_PAGES_BASE = 'http://localhost:8190'; // LOCAL DEV
  const REGISTRY_URL = `${GITHUB_PAGES_BASE}/problems/registry.json`;

  // DOM
  const stateLoading = document.getElementById('stateLoading');
  const stateViz = document.getElementById('stateViz');
  const stateNotFound = document.getElementById('stateNotFound');
  const stateError = document.getElementById('stateError');
  const stateNoProblem = document.getElementById('stateNoProblem');
  const problemBadge = document.getElementById('problemBadge');
  const vizFrame = document.getElementById('vizFrame');
  const notfoundNumber = document.getElementById('notfoundNumber');
  const errorMsg = document.getElementById('errorMsg');
  const retryBtn = document.getElementById('retryBtn');

  // ===== State =====
  let currentLoadedNumber = null; // Track what's currently displayed
  let registryCache = null;
  let myTabId = null; // Track this side-panel's associated tab

  // ===== Show specific state =====
  function showState(el) {
    [stateLoading, stateViz, stateNotFound, stateError, stateNoProblem].forEach(s => {
      s.style.display = 'none';
    });
    el.style.display = 'flex';

    // Populate available visualizers when showing notfound or noproblem states
    if (el === stateNotFound || el === stateNoProblem || el === stateViz) {
      renderAvailableList();
    }
  }

  // ===== Render available visualizers list =====
  async function renderAvailableList() {
    const registry = await fetchRegistry();
    const containers = [
      document.getElementById('availableListNotFound'),
      document.getElementById('availableListNoProblem'),
      document.getElementById('availableListViz')
    ];

    containers.forEach(container => {
      if (!container) return;

      if (!registry || !registry.problems) {
        container.textContent = 'Could not load list.';
        return;
      }

      const entries = Object.entries(registry.problems)
        .map(([num, info]) => ({ num, ...info }))
        .sort((a, b) => parseInt(a.num) - parseInt(b.num));

      if (entries.length === 0) {
        container.textContent = 'No visualizers available yet.';
        return;
      }

      container.innerHTML = entries.map(e => {
        const diffClass = `sp-diff--${e.difficulty}`;
        const url = e.url || `https://leetcode.com/problems/`;
        return `
          <a href="${url}" target="_blank" class="sp-available__item">
            <span class="sp-available__num">#${e.num}</span>
            <span class="sp-available__name">${e.title}</span>
            <span class="sp-available__diff ${diffClass}">${e.difficulty}</span>
          </a>`;
      }).join('');
    });
  }

  // ===== Drawer toggle =====
  const drawerToggle = document.getElementById('drawerToggle');
  const drawerContent = document.getElementById('drawerContent');
  const drawerArrow = drawerToggle?.querySelector('.sp-viz-drawer__arrow');

  if (drawerToggle) {
    drawerToggle.addEventListener('click', () => {
      const isOpen = drawerContent.style.display !== 'none';
      drawerContent.style.display = isOpen ? 'none' : 'block';
      drawerArrow.textContent = isOpen ? '▲' : '▼';
    });
  }

  // ===== Fetch registry =====
  async function fetchRegistry() {
    if (registryCache) return registryCache;

    try {
      const res = await fetch(REGISTRY_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      registryCache = await res.json();
      return registryCache;
    } catch (err) {
      console.error('[LeetViz SP] Registry fetch failed:', err);
      return null;
    }
  }

  // ===== Ask background for current problem =====
  function askBackgroundForProblem() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_CURRENT_PROBLEM' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[LeetViz SP] Background unavailable:', chrome.runtime.lastError);
          resolve(null);
        } else {
          myTabId = response?.tabId || null;
          resolve(response?.problem || null);
        }
      });
    });
  }

  // ===== Get from storage =====
  function getFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get('currentProblem', (data) => {
        resolve(data.currentProblem || null);
      });
    });
  }

  // ===== Load a problem's visualizer =====
  async function loadProblem(problem) {
    if (!problem || !problem.number) {
      showState(stateNoProblem);
      return;
    }

    const num = problem.number;
    const slug = problem.slug || '—';

    // Skip if we're already showing this exact problem
    if (num === currentLoadedNumber) {
      console.log('[LeetViz SP] Already showing problem #' + num);
      return;
    }

    showState(stateLoading);
    problemBadge.textContent = `#${num} ${slug.replace(/-/g, ' ')}`;

    // Fetch registry
    const registry = await fetchRegistry();
    if (!registry) {
      showState(stateError);
      errorMsg.textContent = 'Could not reach the LeetViz registry. Check your connection.';
      return;
    }

    const info = registry.problems?.[num];
    if (info) {
      // Load the visualizer
      const vizUrl = `${GITHUB_PAGES_BASE}/problems/${num}/index.html`;
      console.log('[LeetViz SP] Loading visualizer:', vizUrl);

      vizFrame.src = vizUrl;
      showState(stateViz);
      problemBadge.textContent = `#${num} ${info.title}`;
      currentLoadedNumber = num;
    } else {
      // Not found
      notfoundNumber.textContent = `#${num}`;
      problemBadge.textContent = `#${num} ${slug.replace(/-/g, ' ')}`;
      showState(stateNotFound);
      currentLoadedNumber = num;
    }
  }

  // ===== Force reload (e.g. when navigating to same problem number) =====
  function forceReload(problem) {
    currentLoadedNumber = null; // Reset so loadProblem runs
    loadProblem(problem);
  }

  // ===== Main init =====
  async function init() {
    showState(stateLoading);

    // Try getting problem from background first (more reliable)
    let problem = await askBackgroundForProblem();

    if (!problem || !problem.number) {
      // Fallback to storage
      problem = await getFromStorage();
    }

    if (!problem || !problem.number) {
      // Wait a moment for the content script to report
      await new Promise(r => setTimeout(r, 2500));
      problem = await askBackgroundForProblem() || await getFromStorage();
    }

    if (problem && problem.number) {
      loadProblem(problem);
    } else {
      showState(stateNoProblem);
    }
  }

  // ===== React to storage changes (content script detected a new problem) =====
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.currentProblem) {
      const newVal = changes.currentProblem.newValue;
      console.log('[LeetViz SP] Storage changed:', newVal);

      // Ignore storage changes meant for other tabs
      if (myTabId && newVal && newVal.tabId && newVal.tabId !== myTabId) {
        return;
      }

      if (newVal && newVal.number) {
        if (newVal.number !== currentLoadedNumber) {
          registryCache = null; // Force fresh registry lookup
          loadProblem(newVal);
        }
      } else {
        // No problem — switched to non-LeetCode tab
        currentLoadedNumber = null;
        showState(stateNoProblem);
      }
    }
  });

  // ===== Backup: direct message from background (more reliable than storage) =====
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PROBLEM_CHANGED') {
      console.log('[LeetViz SP] Direct message received:', msg.problem);

      if (myTabId && msg.problem && msg.problem.tabId && msg.problem.tabId !== myTabId) {
        return;
      }

      if (msg.problem && msg.problem.number && msg.problem.number !== currentLoadedNumber) {
        registryCache = null; // Force fresh registry lookup
        loadProblem(msg.problem);
      } else if (!msg.problem) {
        // Switched to non-LeetCode tab
        currentLoadedNumber = null;
        showState(stateNoProblem);
      }
    }
  });

  // ===== Retry button =====
  retryBtn.addEventListener('click', () => {
    registryCache = null;
    currentLoadedNumber = null;
    init();
  });

  // ===== Init =====
  init();
})();
