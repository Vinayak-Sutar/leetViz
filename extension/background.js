/**
 * LeetViz — Background Service Worker
 * Handles messages from content script,
 * fetches the registry, and controls the side panel.
 */

const GITHUB_PAGES_BASE = 'https://vinayak-sutar.github.io/leetViz';
const REGISTRY_URL = `${GITHUB_PAGES_BASE}/problems/registry.json`;
const REGISTRY_CACHE_MS = 5 * 60 * 1000; // Cache registry for 5 minutes

let registryCache = null;
let registryCacheTime = 0;
let currentProblem = null; // { slug, number }

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

// ===== Check if problem has a visualizer =====
async function checkProblem(number) {
  const registry = await fetchRegistry();
  return registry.problems?.[number] || null;
}

// ===== Message Handlers =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PROBLEM_DETECTED') {
    currentProblem = { slug: msg.slug, number: msg.number };
    // Store for side panel to read
    chrome.storage.local.set({ currentProblem });
  }

  if (msg.type === 'OPEN_SIDE_PANEL') {
    // Open the side panel
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
  }

  if (msg.type === 'GET_PROBLEM_INFO') {
    sendResponse(currentProblem);
    return true; // async response
  }

  if (msg.type === 'CHECK_REGISTRY') {
    checkProblem(msg.number).then(info => {
      sendResponse({ found: !!info, info, baseUrl: GITHUB_PAGES_BASE });
    });
    return true; // async response
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
