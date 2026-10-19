(() => {
  // src/config/constants.js
  var STORAGE_KEYS = {
    SETTINGS: "focustube_settings",
    STATS: "focustube_stats",
    SELECTOR_OVERRIDES: "focustube_selector_overrides"
  };
  var MODES = {
    STRICT: "strict",
    REDIRECT_ONLY: "redirect_only",
    CUSTOM: "custom"
  };
  var MESSAGE_ACTIONS = {
    GET_SETTINGS: "GET_SETTINGS",
    SAVE_SETTINGS: "SAVE_SETTINGS",
    RESET_SETTINGS: "RESET_SETTINGS",
    GET_STATS: "GET_STATS",
    INCREMENT_REDIRECT_COUNT: "INCREMENT_REDIRECT_COUNT",
    SETTINGS_UPDATED: "SETTINGS_UPDATED",
    LOG_EVENT: "LOG_EVENT"
  };

  // src/config/settings.js
  var DEFAULT_SETTINGS = {
    enabled: true,
    mode: MODES.STRICT,
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
  var DEFAULT_STATS = {
    redirectedCount: 0,
    lastRedirectAt: null,
    installedAt: null
  };
  function resolveEffectiveSettings(rawSettings) {
    const merged = { ...DEFAULT_SETTINGS, ...rawSettings || {} };
    if (merged.enabled === false) {
      return {
        ...merged,
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
    switch (merged.mode) {
      case MODES.STRICT:
        return {
          ...merged,
          enabled: true,
          redirectShorts: true,
          hideSidebarShorts: true,
          hideFeedShelves: true,
          hideSearchShorts: true,
          hideWatchNextShorts: true,
          hideChannelShortsTab: true,
          preserveTimestamp: true,
          rewriteLinks: true
        };
      case MODES.REDIRECT_ONLY:
        return {
          ...merged,
          enabled: true,
          redirectShorts: true,
          hideSidebarShorts: false,
          hideFeedShelves: false,
          hideSearchShorts: false,
          hideWatchNextShorts: false,
          hideChannelShortsTab: false,
          preserveTimestamp: Boolean(merged.preserveTimestamp),
          rewriteLinks: Boolean(merged.rewriteLinks)
        };
      case MODES.CUSTOM:
        return {
          ...merged,
          enabled: true,
          redirectShorts: Boolean(merged.redirectShorts),
          hideSidebarShorts: Boolean(merged.hideSidebarShorts),
          hideFeedShelves: Boolean(merged.hideFeedShelves),
          hideSearchShorts: Boolean(merged.hideSearchShorts),
          hideWatchNextShorts: Boolean(merged.hideWatchNextShorts),
          hideChannelShortsTab: Boolean(merged.hideChannelShortsTab),
          preserveTimestamp: Boolean(merged.preserveTimestamp),
          rewriteLinks: Boolean(merged.rewriteLinks)
        };
      default:
        return resolveEffectiveSettings({ ...merged, mode: MODES.STRICT });
    }
  }
  function sanitizeSettings(input) {
    if (!input || typeof input !== "object") {
      return { ...DEFAULT_SETTINGS };
    }
    const validModes = Object.values(MODES);
    const mode = validModes.includes(input.mode) ? input.mode : DEFAULT_SETTINGS.mode;
    return {
      enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_SETTINGS.enabled,
      mode,
      redirectShorts: typeof input.redirectShorts === "boolean" ? input.redirectShorts : DEFAULT_SETTINGS.redirectShorts,
      hideSidebarShorts: typeof input.hideSidebarShorts === "boolean" ? input.hideSidebarShorts : DEFAULT_SETTINGS.hideSidebarShorts,
      hideFeedShelves: typeof input.hideFeedShelves === "boolean" ? input.hideFeedShelves : DEFAULT_SETTINGS.hideFeedShelves,
      hideSearchShorts: typeof input.hideSearchShorts === "boolean" ? input.hideSearchShorts : DEFAULT_SETTINGS.hideSearchShorts,
      hideWatchNextShorts: typeof input.hideWatchNextShorts === "boolean" ? input.hideWatchNextShorts : DEFAULT_SETTINGS.hideWatchNextShorts,
      hideChannelShortsTab: typeof input.hideChannelShortsTab === "boolean" ? input.hideChannelShortsTab : DEFAULT_SETTINGS.hideChannelShortsTab,
      preserveTimestamp: typeof input.preserveTimestamp === "boolean" ? input.preserveTimestamp : DEFAULT_SETTINGS.preserveTimestamp,
      rewriteLinks: typeof input.rewriteLinks === "boolean" ? input.rewriteLinks : DEFAULT_SETTINGS.rewriteLinks,
      debugLogging: typeof input.debugLogging === "boolean" ? input.debugLogging : DEFAULT_SETTINGS.debugLogging
    };
  }

  // src/utils/storage.js
  function getStorageArea() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      return chrome.storage.sync || chrome.storage.local;
    }
    return null;
  }
  async function loadSettings() {
    const storage = getStorageArea();
    if (!storage) {
      return { ...DEFAULT_SETTINGS };
    }
    return new Promise((resolve) => {
      try {
        storage.get([STORAGE_KEYS.SETTINGS], (result) => {
          if (chrome.runtime?.lastError) {
            console.warn("[FocusTube] Storage read error:", chrome.runtime.lastError.message);
            resolve({ ...DEFAULT_SETTINGS });
            return;
          }
          const raw = result?.[STORAGE_KEYS.SETTINGS];
          resolve(sanitizeSettings(raw));
        });
      } catch {
        resolve({ ...DEFAULT_SETTINGS });
      }
    });
  }
  async function saveSettings(newSettings) {
    const sanitized = sanitizeSettings(newSettings);
    const storage = getStorageArea();
    if (!storage) {
      return sanitized;
    }
    return new Promise((resolve, reject) => {
      try {
        storage.set({ [STORAGE_KEYS.SETTINGS]: sanitized }, () => {
          if (chrome.runtime?.lastError) {
            console.error("[FocusTube] Storage write error:", chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(sanitized);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  async function loadStats() {
    const storage = getStorageArea();
    if (!storage) {
      return { ...DEFAULT_STATS };
    }
    return new Promise((resolve) => {
      try {
        storage.get([STORAGE_KEYS.STATS], (result) => {
          if (chrome.runtime?.lastError) {
            resolve({ ...DEFAULT_STATS });
            return;
          }
          resolve({ ...DEFAULT_STATS, ...result?.[STORAGE_KEYS.STATS] || {} });
        });
      } catch {
        resolve({ ...DEFAULT_STATS });
      }
    });
  }
  async function incrementRedirectStat() {
    const current = await loadStats();
    const updated = {
      ...current,
      redirectedCount: (current.redirectedCount || 0) + 1,
      lastRedirectAt: Date.now()
    };
    const storage = getStorageArea();
    if (storage) {
      await new Promise((resolve) => {
        try {
          storage.set({ [STORAGE_KEYS.STATS]: updated }, resolve);
        } catch {
          resolve();
        }
      });
    }
    return updated;
  }

  // src/background/service-worker.js
  var DNR_RULE_IDS = [1, 2];
  async function syncDeclarativeNetRequestRules(shouldRedirect) {
    if (typeof chrome === "undefined" || !chrome.declarativeNetRequest) {
      return;
    }
    try {
      if (shouldRedirect) {
        const redirectRuleNoQuery = {
          id: 1,
          priority: 1,
          action: {
            type: "redirect",
            redirect: {
              regexSubstitution: "https://www.youtube.com/watch?v=\\1"
            }
          },
          condition: {
            regexFilter: "^https?://[^/]+/shorts/([^/?#]{11})/?$",
            requestDomains: ["youtube.com"],
            resourceTypes: ["main_frame"]
          }
        };
        const redirectRuleWithQuery = {
          id: 2,
          priority: 1,
          action: {
            type: "redirect",
            redirect: {
              regexSubstitution: "https://www.youtube.com/watch?v=\\1&\\2"
            }
          },
          condition: {
            regexFilter: "^https?://[^/]+/shorts/([^/?#]{11})\\?(.*)",
            requestDomains: ["youtube.com"],
            resourceTypes: ["main_frame"]
          }
        };
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: DNR_RULE_IDS,
          addRules: [redirectRuleNoQuery, redirectRuleWithQuery]
        });
        console.info("[FocusTube Background] DNR redirection rules registered.");
      } else {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: DNR_RULE_IDS
        });
        console.info("[FocusTube Background] DNR redirection rules removed.");
      }
    } catch (error) {
      console.error("[FocusTube Background] Failed to update DNR rules:", error);
    }
  }
  function formatBadgeText(count) {
    if (!count || count <= 0) return "";
    if (count > 9999) return `${Math.floor(count / 1e3)}k`;
    if (count > 999) return `${(count / 1e3).toFixed(1)}k`;
    return String(count);
  }
  async function updateActionBadge(settings) {
    if (typeof chrome === "undefined" || !chrome.action) return;
    try {
      const currentSettings = settings || await loadSettings();
      if (currentSettings && currentSettings.enabled === false) {
        await chrome.action.setBadgeText({ text: "OFF" });
        await chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
        await chrome.action.setTitle({
          title: "FocusTube: Stopped / Paused (Click popup to resume)"
        });
        return;
      }
      const stats = await loadStats();
      const count = stats.redirectedCount || 0;
      const badgeText = formatBadgeText(count);
      await chrome.action.setBadgeText({ text: badgeText });
      await chrome.action.setBadgeBackgroundColor({ color: "#FF0033" });
      await chrome.action.setTitle({
        title: `FocusTube: Active (${count} Shorts redirected to regular player)`
      });
    } catch (error) {
      console.warn("[FocusTube Background] Failed to update action badge:", error);
    }
  }
  async function broadcastSettingsToTabs(effectiveSettings) {
    if (typeof chrome === "undefined" || !chrome.tabs) return;
    try {
      const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: MESSAGE_ACTIONS.SETTINGS_UPDATED,
            data: effectiveSettings
          }).catch(() => {
          });
        }
      }
    } catch (error) {
      console.warn("[FocusTube Background] Tab broadcast error:", error);
    }
  }
  chrome.runtime.onInstalled.addListener(async (details) => {
    console.info(`[FocusTube] Extension installed / updated: reason=${details.reason}`);
    const settings = await loadSettings();
    const effective = resolveEffectiveSettings(settings);
    await syncDeclarativeNetRequestRules(effective.redirectShorts);
    await updateActionBadge(settings);
  });
  chrome.runtime.onStartup.addListener(async () => {
    const settings = await loadSettings();
    const effective = resolveEffectiveSettings(settings);
    await syncDeclarativeNetRequestRules(effective.redirectShorts);
    await updateActionBadge(settings);
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return false;
    (async () => {
      switch (message.action) {
        case MESSAGE_ACTIONS.GET_SETTINGS: {
          const raw = await loadSettings();
          const effective = resolveEffectiveSettings(raw);
          sendResponse({ success: true, settings: raw, effectiveSettings: effective });
          break;
        }
        case MESSAGE_ACTIONS.SAVE_SETTINGS: {
          const saved = await saveSettings(message.data);
          const effective = resolveEffectiveSettings(saved);
          await syncDeclarativeNetRequestRules(effective.redirectShorts);
          await broadcastSettingsToTabs(effective);
          await updateActionBadge(saved);
          sendResponse({ success: true, settings: saved, effectiveSettings: effective });
          break;
        }
        case MESSAGE_ACTIONS.RESET_SETTINGS: {
          const saved = await saveSettings(DEFAULT_SETTINGS);
          const effective = resolveEffectiveSettings(saved);
          await syncDeclarativeNetRequestRules(effective.redirectShorts);
          await broadcastSettingsToTabs(effective);
          await updateActionBadge(saved);
          sendResponse({ success: true, settings: saved, effectiveSettings: effective });
          break;
        }
        case MESSAGE_ACTIONS.GET_STATS: {
          const stats = await loadStats();
          sendResponse({ success: true, stats });
          break;
        }
        case MESSAGE_ACTIONS.INCREMENT_REDIRECT_COUNT: {
          const updated = await incrementRedirectStat();
          await updateActionBadge();
          sendResponse({ success: true, stats: updated });
          break;
        }
        default:
          sendResponse({ success: false, error: "Unknown action" });
          break;
      }
    })();
    return true;
  });
})();
