/**
 * LeetViz — Side Panel Controller
 * Queries the background for current problem info,
 * checks the registry, and loads the visualizer iframe.
 */
(() => {
  'use strict';

  const GITHUB_PAGES_BASE = 'https://vinayak-sutar.github.io/leetViz';
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

  // ===== Show specific state =====
  function showState(id) {
    [stateLoading, stateViz, stateNotFound, stateError, stateNoProblem].forEach(el => {
      el.style.display = 'none';
    });
    id.style.display = 'flex';
  }

  // ===== Fetch registry directly (fallback if background is unavailable) =====
  async function fetchRegistry() {
    try {
      const res = await fetch(REGISTRY_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[LeetViz SP] Registry fetch failed:', err);
      return null;
    }
  }

  // ===== Get current problem from storage (set by content script → background) =====
  function getCurrentProblem() {
    return new Promise((resolve) => {
      chrome.storage.local.get('currentProblem', (data) => {
        resolve(data.currentProblem || null);
      });
    });
  }

  // ===== Main init =====
  async function init() {
    showState(stateLoading);

    // Get current problem
    const problem = await getCurrentProblem();

    if (!problem || !problem.number) {
      // Try waiting a moment for the content script to report
      await new Promise(r => setTimeout(r, 2000));
      const retry = await getCurrentProblem();
      if (!retry || !retry.number) {
        showState(stateNoProblem);
        return;
      }
      return loadProblem(retry);
    }

    return loadProblem(problem);
  }

  async function loadProblem(problem) {
    const num = problem.number;
    const slug = problem.slug || '—';

    problemBadge.textContent = `#${num} ${slug.replace(/-/g, ' ')}`;

    // Check registry
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
      vizFrame.src = vizUrl;
      showState(stateViz);
      problemBadge.textContent = `#${num} ${info.title}`;
    } else {
      // Not found
      notfoundNumber.textContent = `#${num}`;
      showState(stateNotFound);
    }
  }

  // ===== Retry =====
  retryBtn.addEventListener('click', init);

  // ===== Listen for updates from background (SPA navigation) =====
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.currentProblem) {
      const newVal = changes.currentProblem.newValue;
      if (newVal && newVal.number) {
        loadProblem(newVal);
      }
    }
  });

  // ===== Init =====
  init();
})();
