/**
 * FocusTube - Mock Chrome API Polyfill for Localhost Development & Testing
 *
 * Emulates chrome.storage.sync, chrome.storage.local, chrome.runtime, and
 * chrome.tabs using localStorage and BroadcastChannel so the extension's popup,
 * options page, and content scripts work seamlessly in standard browser tabs.
 */

(function () {
  if (typeof window.chrome !== 'undefined' && window.chrome?.runtime?.id) {
    // Native Chrome Extension environment detected; do not overwrite
    return;
  }

  const STORAGE_PREFIX = 'focustube_mock_';
  const broadcastChannel = new BroadcastChannel('focustube_mock_bus');
  const messageListeners = [];

  const defaultSettings = {
    enabled: true,
    mode: 'strict',
    redirectShorts: true,
    hideSidebarShorts: true,
    hideFeedShelves: true,
    hideSearchShorts: true,
    hideWatchNextShorts: true,
    hideChannelShortsTab: true,
    preserveTimestamp: true,
    rewriteLinks: true,
    debugLogging: false
  };

  const defaultStats = {
    redirectedCount: 14,
    lastRedirectAt: Date.now() - 360000,
    installedAt: Date.now() - 86400000
  };

  function getStored(key, fallback) {
    try {
      const val = localStorage.getItem(STORAGE_PREFIX + key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  function setStored(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage set error:', e);
    }
  }

  // Ensure initial defaults exist
  if (!localStorage.getItem(STORAGE_PREFIX + 'focustube_settings')) {
    setStored('focustube_settings', defaultSettings);
  }
  if (!localStorage.getItem(STORAGE_PREFIX + 'focustube_stats')) {
    setStored('focustube_stats', defaultStats);
  }

  const mockStorageArea = {
    get: function (keys, callback) {
      setTimeout(() => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          if (k === 'focustube_settings') {
            result[k] = getStored('focustube_settings', defaultSettings);
          } else if (k === 'focustube_stats') {
            result[k] = getStored('focustube_stats', defaultStats);
          } else {
            result[k] = getStored(k, null);
          }
        }
        if (callback) callback(result);
      }, 10);
    },
    set: function (items, callback) {
      setTimeout(() => {
        for (const [k, v] of Object.entries(items)) {
          setStored(k, v);
        }
        if (callback) callback();
      }, 10);
    }
  };

  // Broadcast channel receiver
  broadcastChannel.onmessage = (event) => {
    const { message, sender } = event.data || {};
    for (const listener of messageListeners) {
      try {
        listener(message, sender, () => {});
      } catch (err) {
        console.warn('Listener execution error:', err);
      }
    }
  };

  function computeEffectiveSettings(raw) {
    if (raw.enabled === false) {
      return {
        ...raw,
        enabled: false,
        redirectShorts: false,
        hideSidebarShorts: false,
        hideFeedShelves: false,
        hideSearchShorts: false,
        hideWatchNextShorts: false,
        hideChannelShortsTab: false,
        rewriteLinks: false
      };
    }
    if (raw.mode === 'strict') {
      return {
        ...raw,
        enabled: true,
        redirectShorts: true,
        hideSidebarShorts: true,
        hideFeedShelves: true,
        hideSearchShorts: true,
        hideWatchNextShorts: true,
        hideChannelShortsTab: true
      };
    }
    if (raw.mode === 'redirect_only') {
      return {
        ...raw,
        enabled: true,
        redirectShorts: true,
        hideSidebarShorts: false,
        hideFeedShelves: false,
        hideSearchShorts: false,
        hideWatchNextShorts: false,
        hideChannelShortsTab: false
      };
    }
    return { ...raw, enabled: true };
  }

  window.chrome = {
    runtime: {
      id: 'focustube-localhost-preview-mode',
      lastError: null,
      getURL: (path) => path,
      openOptionsPage: () => {
        const studioOptionsTab = document.querySelector('[data-tab="options"]');
        if (studioOptionsTab) {
          studioOptionsTab.click();
        } else {
          window.open('/src/options/options.html', '_blank');
        }
      },
      sendMessage: function (message, callback) {
        return new Promise((resolve) => {
          setTimeout(() => {
            let response = { success: true };

            if (message.action === 'GET_SETTINGS') {
              const raw = getStored('focustube_settings', defaultSettings);
              const effective = computeEffectiveSettings(raw);
              response = { success: true, settings: raw, effectiveSettings: effective };
            } else if (message.action === 'SAVE_SETTINGS') {
              setStored('focustube_settings', message.data);
              const raw = message.data;
              const effective = computeEffectiveSettings(raw);
              response = { success: true, settings: raw, effectiveSettings: effective };
              // Broadcast to other components
              broadcastChannel.postMessage({
                message: { action: 'SETTINGS_UPDATED', data: effective },
                sender: { id: 'mock' }
              });
            } else if (message.action === 'RESET_SETTINGS') {
              setStored('focustube_settings', defaultSettings);
              response = { success: true, settings: defaultSettings, effectiveSettings: defaultSettings };
              broadcastChannel.postMessage({
                message: { action: 'SETTINGS_UPDATED', data: defaultSettings },
                sender: { id: 'mock' }
              });
            } else if (message.action === 'GET_STATS') {
              response = { success: true, stats: getStored('focustube_stats', defaultStats) };
            } else if (message.action === 'INCREMENT_REDIRECT_COUNT') {
              const current = getStored('focustube_stats', defaultStats);
              const updated = {
                ...current,
                redirectedCount: (current.redirectedCount || 0) + 1,
                lastRedirectAt: Date.now()
              };
              setStored('focustube_stats', updated);
              response = { success: true, stats: updated };
              broadcastChannel.postMessage({
                message: { action: 'STATS_UPDATED', data: updated },
                sender: { id: 'mock' }
              });
            }

            if (callback) callback(response);
            resolve(response);
          }, 15);
        });
      },
      onMessage: {
        addListener: function (listener) {
          messageListeners.push(listener);
        },
        removeListener: function (listener) {
          const idx = messageListeners.indexOf(listener);
          if (idx !== -1) messageListeners.splice(idx, 1);
        }
      }
    },
    storage: {
      sync: mockStorageArea,
      local: mockStorageArea
    },
    action: {
      setBadgeText: () => Promise.resolve(),
      setBadgeBackgroundColor: () => Promise.resolve(),
      setTitle: () => Promise.resolve()
    },
    declarativeNetRequest: {
      updateDynamicRules: () => Promise.resolve()
    },
    tabs: {
      query: () => Promise.resolve([]),
      sendMessage: () => Promise.resolve()
    }
  };

  console.info('[FocusTube] Mock Chrome Extension API polyfill active for localhost testing.');
})();
