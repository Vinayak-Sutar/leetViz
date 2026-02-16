/**
 * LeetViz — Content Script
 * Runs on leetcode.com/problems/* pages.
 * Detects the problem slug/number, injects a floating button,
 * and communicates with the background service worker.
 *
 * Handles LeetCode's SPA navigation with multiple detection strategies.
 */
(() => {
  'use strict';

  // Prevent duplicate injection per page load
  if (window.__leetviz_injected) return;
  window.__leetviz_injected = true;

  let lastReportedSlug = null;

  // ===== Extract problem info from URL =====
  function getProblemSlug() {
    const match = window.location.pathname.match(/^\/problems\/([^/]+)/);
    return match ? match[1] : null;
  }

  // ===== Extract problem number from the page =====
  function getProblemNumber() {
    // Strategy 1: Page title — "190. Reverse Bits - LeetCode"
    const titleMatch = document.title.match(/^(\d+)\./);
    if (titleMatch) return titleMatch[1];

    // Strategy 2: Question title heading
    const selectors = [
      '[data-cy="question-title"]',
      'a[class*="title__"] span',
      'div[class*="title"]',
      '.text-title-large',
      'span[data-cy="question-title"]'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const numMatch = el.textContent.trim().match(/^(\d+)\./);
        if (numMatch) return numMatch[1];
      }
    }

    // Strategy 3: Look through all visible text for "NUMBER. Title" pattern
    const allHeaders = document.querySelectorAll('h1, h2, h3, h4, [role="heading"]');
    for (const h of allHeaders) {
      const numMatch = h.textContent.trim().match(/^(\d+)\.\s/);
      if (numMatch) return numMatch[1];
    }

    return null;
  }

  // ===== Poll for problem info (LeetCode lazy-loads content) =====
  function pollForProblemInfo(maxAttempts = 30) {
    return new Promise((resolve) => {
      let attempts = 0;
      function check() {
        const slug = getProblemSlug();
        const number = getProblemNumber();
        if (number && slug) {
          resolve({ slug, number });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 300);
        } else {
          resolve({ slug, number: null });
        }
      }
      check();
    });
  }

  // ===== Inject floating button =====
  function injectButton() {
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
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    });

    document.body.appendChild(fab);
  }

  // ===== Report problem to background =====
  function reportProblem(info) {
    if (!info.slug) return;
    
    // Always report if number is different, or if slug changed
    if (info.slug === lastReportedSlug && info.number) return;
    lastReportedSlug = info.slug;

    console.log('[LeetViz] Detected problem:', info);

    chrome.runtime.sendMessage({
      type: 'PROBLEM_DETECTED',
      slug: info.slug,
      number: info.number,
      timestamp: Date.now(),
    });
  }

  // ===== Main detect & report =====
  async function detectAndReport() {
    const info = await pollForProblemInfo();
    reportProblem(info);
    injectButton();
  }

  // ===== Force re-detect after SPA navigation =====
  function onSpaNavigation() {
    lastReportedSlug = null; // Always reset on navigation
    if (location.pathname.startsWith('/problems/')) {
      // Wait for DOM to update after SPA nav
      setTimeout(detectAndReport, 500);
      // Double-check with longer delay (LeetCode can be slow)
      setTimeout(detectAndReport, 1500);
    }
  }

  // ===== SPA Navigation Detection =====
  // Strategy 1: MutationObserver on URL changes
  let lastUrl = location.href;
  
  function checkUrlChange() {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      onSpaNavigation();
    }
  }

  // MutationObserver catches most SPA changes
  const observer = new MutationObserver(checkUrlChange);
  observer.observe(document.body, { childList: true, subtree: true });

  // Strategy 2: Intercept pushState/replaceState
  const origPushState = history.pushState;
  const origReplaceState = history.replaceState;

  history.pushState = function (...args) {
    origPushState.apply(this, args);
    setTimeout(checkUrlChange, 50);
  };

  history.replaceState = function (...args) {
    origReplaceState.apply(this, args);
    setTimeout(checkUrlChange, 50);
  };

  // Strategy 3: popstate event (back/forward)
  window.addEventListener('popstate', () => {
    setTimeout(checkUrlChange, 50);
  });

  // Strategy 4: Watch document.title changes (LeetCode updates title on navigation)
  let lastTitle = document.title;
  const titleObserver = new MutationObserver(() => {
    if (document.title !== lastTitle) {
      lastTitle = document.title;
      if (location.pathname.startsWith('/problems/')) {
        lastReportedSlug = null;
        detectAndReport();
      }
    }
  });
  titleObserver.observe(document.querySelector('title') || document.head, {
    childList: true,
    characterData: true,
    subtree: true
  });

  // Strategy 5: Periodic check as final fallback
  setInterval(checkUrlChange, 2000);

  // ===== Initial run =====
  detectAndReport();
})();
