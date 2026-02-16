/**
 * LeetViz — Background Service Worker
 * Handles messages from content script,
 * fetches the registry, and controls the side panel.
 * Tracks problem state per-tab for proper SPA handling.
 */

// PRODUCTION: const GITHUB_PAGES_BASE = 'https://vinayak-sutar.github.io/leetViz';
const GITHUB_PAGES_BASE = 'http://localhost:8190'; // LOCAL DEV
const REGISTRY_URL = `${GITHUB_PAGES_BASE}/problems/registry.json`;
const REGISTRY_CACHE_MS = 5 * 60 * 1000;

let registryCache = null;
let registryCacheTime = 0;

// Per-tab problem tracking
const tabProblems = new Map(); // tabId → { slug, number, timestamp }

// ===== Fetch Registry =====
async function fetchRegistry() {
  const now = Date.now();
  if (registryCache && (now - registryCacheTime) < REGISTRY_CACHE_MS) {
    return registryCache;
  }

  try {
    const response = await fetch(REGISTRY_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    registryCache = await response.json();
    registryCacheTime = now;
    return registryCache;
  } catch (err) {
    console.error('[LeetViz] Failed to fetch registry:', err);
    return registryCache || { problems: {} };
  }
}

// ===== Update problem state for a tab =====
function updateTabProblem(tabId, data) {
  const problem = {
    slug: data.slug,
    number: data.number,
    timestamp: Date.now(), // Always use fresh timestamp so onChanged fires
  };

  tabProblems.set(tabId, problem);

  // Store in chrome.storage for the side panel to read
  // A fresh timestamp ensures onChanged always fires
  chrome.storage.local.set({
    currentProblem: { ...problem, tabId }
  });

  // Also send a direct runtime message to the side panel as a backup
  // (storage.onChanged can be unreliable in some Chrome versions)
  chrome.runtime.sendMessage({
    type: 'PROBLEM_CHANGED',
    problem: { ...problem, tabId }
  }).catch(() => {
    // Side panel may not be open — ignore
  });

  console.log(`[LeetViz BG] Tab ${tabId} → Problem #${data.number} (${data.slug})`);
}

// ===== Message Handlers =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (msg.type === 'PROBLEM_DETECTED' && tabId) {
    updateTabProblem(tabId, msg);
  }

  if (msg.type === 'OPEN_SIDE_PANEL' && tabId) {
    chrome.sidePanel.open({ tabId });
  }

  if (msg.type === 'GET_CURRENT_PROBLEM') {
    // Side panel asks: what problem is the active tab viewing?
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const problem = tabProblems.get(tabs[0].id) || null;
        sendResponse({ problem, baseUrl: GITHUB_PAGES_BASE });
      } else {
        sendResponse({ problem: null, baseUrl: GITHUB_PAGES_BASE });
      }
    });
    return true; // async
  }

  if (msg.type === 'CHECK_REGISTRY') {
    fetchRegistry().then(registry => {
      const info = registry.problems?.[msg.number] || null;
      sendResponse({ found: !!info, info, baseUrl: GITHUB_PAGES_BASE });
    });
    return true; // async
  }
});

// ===== Open side panel when extension icon is clicked =====
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// ===== Enable side panel on LeetCode tabs =====
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes('leetcode.com/problems/')) {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true,
    });
  }
});

// ===== Clean up when tabs close =====
chrome.tabs.onRemoved.addListener((tabId) => {
  tabProblems.delete(tabId);
});

// ===== When user switches tabs, notify side panel =====
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const problem = tabProblems.get(tabId);
  if (problem) {
    chrome.storage.local.set({
      currentProblem: { ...problem, tabId, timestamp: Date.now() }
    });
  }
});
