/**
 * YouTube Recommendation Blocker - Content Script
 *
 * Manages state synchronization between chrome.storage.local, YouTube SPA
 * navigation events, and dynamically inserted recommendation containers.
 */
(() => {
  'use strict';

  // Prevent duplicate initialization if injected more than once.
  if (window.__yrbInitialized) {
    return;
  }
  window.__yrbInitialized = true;

  const STORAGE_KEY = 'blockRecommendations';
  const DEFAULT_ENABLED = true;

  let isBlockingEnabled = DEFAULT_ENABLED;
  let lastKnownPathname = window.location.pathname;
  let syncScheduled = false;
  let observer = null;
  let observedTarget = null;

  /**
   * Determine the current YouTube route category strictly from pathname.
   * Only "home" ("/") and "watch" ("/watch") are eligible for blocking.
   * Search (/results), Subscriptions (/feed/subscriptions), Channels,
   * Shorts (/shorts/*), etc. resolve to "other" and are never modified.
   *
   * @returns {'home' | 'watch' | 'other'}
   */
  function getPageType() {
    const pathname = window.location.pathname;
    if (pathname === '/' || pathname === '') {
      return 'home';
    }
    if (pathname === '/watch') {
      return 'watch';
    }
    return 'other';
  }

  /**
   * Safely set or remove an attribute only when its value has actually changed,
   * avoiding unnecessary DOM writes and MutationObserver feedback loops.
   *
   * @param {Element} el
   * @param {string} name
   * @param {string | null} value
   */
  function setAttrIfChanged(el, name, value) {
    if (!el) return;
    const current = el.getAttribute(name);
    if (value === null) {
      if (current !== null) {
        el.removeAttribute(name);
      }
    } else if (current !== value) {
      el.setAttribute(name, value);
    }
  }

  /**
   * Synchronize root <html> gating attributes and ARIA visibility markers
   * on the specific target containers for the current YouTube view.
   */
  function syncBlockingState() {
    syncScheduled = false;

    const root = document.documentElement;
    if (!root) return;

    const pageType = getPageType();
    lastKnownPathname = window.location.pathname;

    setAttrIfChanged(root, 'data-yrb-blocked', isBlockingEnabled ? 'true' : 'false');
    setAttrIfChanged(root, 'data-yrb-page', pageType);

    // Keep aria-hidden accurate on currently mounted recommendation targets
    // without touching unrelated YouTube containers (playlists, chat, ads, etc.).
    const homeGrids = document.querySelectorAll(
      'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer, ytd-browse[page-subtype="home"] #primary > ytd-section-list-renderer'
    );
    const shouldHideHome = isBlockingEnabled && pageType === 'home';
    homeGrids.forEach((node) => {
      setAttrIfChanged(node, 'data-yrb-hidden', shouldHideHome ? 'true' : null);
      setAttrIfChanged(node, 'aria-hidden', shouldHideHome ? 'true' : null);
    });

    const watchRelated = document.querySelectorAll(
      'ytd-watch-flexy #related, ytd-watch-flexy ytd-watch-next-secondary-results-renderer, ytd-watch-grid #related, ytd-watch-grid ytd-watch-next-secondary-results-renderer'
    );
    const shouldHideWatch = isBlockingEnabled && pageType === 'watch';
    watchRelated.forEach((node) => {
      setAttrIfChanged(node, 'data-yrb-hidden', shouldHideWatch ? 'true' : null);
      setAttrIfChanged(node, 'aria-hidden', shouldHideWatch ? 'true' : null);
    });

    // Narrow the MutationObserver from <html> to <ytd-page-manager> once available
    // so unrelated masthead/player mutations do not wake the observer.
    ensureOptimalObserverTarget();
  }

  /**
   * Coalesce rapid DOM mutation bursts into a single per-frame sync call.
   */
  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    window.requestAnimationFrame(syncBlockingState);
  }

  /**
   * Attach or narrow the MutationObserver to <ytd-page-manager> once it exists.
   */
  function ensureOptimalObserverTarget() {
    if (!observer) return;

    const pageManager = document.querySelector('ytd-page-manager');
    const desiredTarget = pageManager || document.documentElement;

    if (!desiredTarget || desiredTarget === observedTarget) {
      return;
    }

    observer.disconnect();
    observer.observe(desiredTarget, {
      childList: true,
      subtree: true
    });
    observedTarget = desiredTarget;
  }

  /**
   * Initialize a lightweight MutationObserver for dynamically loaded YouTube
   * Polymer containers and route changes that bypass standard events.
   */
  function initMutationObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      // Fast-path: if URL pathname changed during SPA transition, sync immediately.
      if (window.location.pathname !== lastKnownPathname) {
        scheduleSync();
        return;
      }

      // Skip processing on non-target routes when blocking state is already synced.
      const pageType = getPageType();
      if (pageType === 'other' && !isBlockingEnabled) {
        return;
      }

      // Only schedule a sync if a relevant container or page shell was added.
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        if (mutation.addedNodes.length === 0) continue;

        for (let j = 0; j < mutation.addedNodes.length; j++) {
          const added = mutation.addedNodes[j];
          if (added.nodeType !== Node.ELEMENT_NODE) continue;

          const tag = added.tagName;
          if (
            tag === 'YTD-PAGE-MANAGER' ||
            tag === 'YTD-BROWSE' ||
            tag === 'YTD-RICH-GRID-RENDERER' ||
            tag === 'YTD-SECTION-LIST-RENDERER' ||
            tag === 'YTD-WATCH-FLEXY' ||
            tag === 'YTD-WATCH-GRID' ||
            tag === 'YTD-WATCH-NEXT-SECONDARY-RESULTS-RENDERER' ||
            added.id === 'related' ||
            added.id === 'secondary' ||
            added.id === 'primary'
          ) {
            scheduleSync();
            return;
          }
        }
      }
    });

    ensureOptimalObserverTarget();
  }

  /**
   * Subscribe once to YouTube's single-page application navigation lifecycle
   * and browser history popstate events.
   */
  function initNavigationListeners() {
    window.addEventListener('yt-navigate-start', scheduleSync, { passive: true });
    window.addEventListener('yt-navigate-finish', syncBlockingState, { passive: true });
    window.addEventListener('yt-page-data-updated', scheduleSync, { passive: true });
    window.addEventListener('popstate', syncBlockingState, { passive: true });
  }

  /**
   * Load the persisted user setting from chrome.storage.local and react
   * immediately to any changes triggered from the extension popup.
   */
  function initStorageSync() {
    // Apply default immediately at document_start to minimize visual flicker,
    // then reconcile with the saved value in chrome.storage.local.
    syncBlockingState();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED }, (result) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          return;
        }
        isBlockingEnabled = Boolean(result[STORAGE_KEY]);
        syncBlockingState();
      });

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes[STORAGE_KEY]) {
          return;
        }
        isBlockingEnabled = Boolean(changes[STORAGE_KEY].newValue);
        syncBlockingState();
      });
    }
  }

  // Initialize extension runtime.
  initStorageSync();
  initNavigationListeners();
  initMutationObserver();
})();
