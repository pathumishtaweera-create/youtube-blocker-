/**
 * YouTube Recommendation Blocker - Popup Script
 *
 * Syncs the master toggle with chrome.storage.local so settings persist
 * across browser restarts and stay exclusively on the user's device.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'blockRecommendations';
  const DEFAULT_ENABLED = true;

  const toggleEl = document.getElementById('toggle-blocking');
  const statusEl = document.getElementById('status-indicator');

  if (!toggleEl || !statusEl) {
    return;
  }

  /**
   * Update the popup UI to reflect the current ON/OFF state.
   *
   * @param {boolean} isEnabled
   */
  function renderState(isEnabled) {
    toggleEl.checked = isEnabled;
    toggleEl.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
    statusEl.textContent = isEnabled ? 'ON' : 'OFF';
    statusEl.setAttribute('data-state', isEnabled ? 'on' : 'off');
  }

  /**
   * Load the saved setting when the popup opens.
   */
  function loadSavedSetting() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED }, (result) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          renderState(DEFAULT_ENABLED);
          return;
        }
        renderState(Boolean(result[STORAGE_KEY]));
      });
    } else {
      renderState(DEFAULT_ENABLED);
    }
  }

  /**
   * Persist the updated setting whenever the user flips the toggle.
   */
  toggleEl.addEventListener('change', () => {
    const isEnabled = Boolean(toggleEl.checked);
    renderState(isEnabled);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: isEnabled });
    }
  });

  /**
   * Keep the popup UI synchronized if storage is updated externally while open.
   */
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[STORAGE_KEY]) {
        return;
      }
      renderState(Boolean(changes[STORAGE_KEY].newValue));
    });
  }

  loadSavedSetting();
})();
