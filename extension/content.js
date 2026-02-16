/**
 * LeetViz — Content Script
 * Runs on leetcode.com/problems/* pages.
 * Detects the problem slug/number, injects a floating button,
 * and communicates with the background service worker.
 */
(() => {
  'use strict';

  // Prevent duplicate injection
  if (window.__leetviz_injected) return;
  window.__leetviz_injected = true;

  // ===== Extract problem info from URL =====
  function getProblemSlug() {
    const match = window.location.pathname.match(/^\/problems\/([^/]+)/);
    return match ? match[1] : null;
  }

  // ===== Extract problem number from the page =====
  function getProblemNumber() {
    // Try to find the problem number from the page title: "190. Reverse Bits - LeetCode"
    const titleMatch = document.title.match(/^(\d+)\./);
    if (titleMatch) return titleMatch[1];

    // Fallback: look for it in the page content
    const headingEl = document.querySelector('[data-cy="question-title"]') ||
                      document.querySelector('.text-title-large') ||
                      document.querySelector('div[class*="title"]');
    if (headingEl) {
      const numMatch = headingEl.textContent.match(/^(\d+)\./);
      if (numMatch) return numMatch[1];
    }

    return null;
  }

  // ===== Wait for page to be ready (LeetCode is SPA) =====
  function waitForProblemInfo(maxAttempts = 20) {
    return new Promise((resolve) => {
      let attempts = 0;
      function check() {
        const slug = getProblemSlug();
        const number = getProblemNumber();
        if (number && slug) {
          resolve({ slug, number });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 500);
        } else {
          // Even without the number, resolve with what we have
          resolve({ slug, number: null });
        }
      }
      check();
    });
  }

  // ===== Inject floating button =====
  function injectButton() {
    // Don't inject if already exists
    if (document.getElementById('leetviz-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'leetviz-fab';
    fab.title = 'Open LeetViz Visualizer';
    fab.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12h5l3-9 4 18 3-9h5"/>
      </svg>
      <span>LeetViz</span>
    `;

    fab.addEventListener('click', () => {
      // Send message to open the side panel
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    });

    document.body.appendChild(fab);
  }

  // ===== Main =====
  async function init() {
    const info = await waitForProblemInfo();

    // Notify background script about the current problem
    chrome.runtime.sendMessage({
      type: 'PROBLEM_DETECTED',
      slug: info.slug,
      number: info.number,
    });

    injectButton();
  }

  // Handle SPA navigation (LeetCode uses client-side routing)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (location.pathname.startsWith('/problems/')) {
        // Re-detect on navigation
        setTimeout(init, 1000);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial run
  init();
})();
