/**
 * FocusTube Studio - Interactive Testbench Controller
 */

(function () {
  let currentSettings = null;
  let redirectCount = 14;

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const headerModeBadge = document.getElementById('header-mode-badge');
  const headerCounter = document.getElementById('header-redirect-counter');
  const simModeButtons = document.querySelectorAll('.sim-mode-btn');
  const simUrlPath = document.getElementById('sim-url-path');
  const eventLogContainer = document.getElementById('event-log-container');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const btnAddDynamic = document.getElementById('btn-add-dynamic-shorts');
  const toast = document.getElementById('studio-toast');
  const toastTitle = document.getElementById('toast-title');
  const toastMsg = document.getElementById('toast-msg');
  const popupFrame = document.getElementById('popup-frame');
  const optionsFrame = document.getElementById('options-frame');

  // Injected style tag for the simulated YouTube window
  const simStyleTag = document.createElement('style');
  simStyleTag.id = 'studio-injected-rules';
  document.head.appendChild(simStyleTag);

  function logEvent(text, type = 'info') {
    if (!eventLogContainer) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${text}`;
    eventLogContainer.appendChild(entry);
    eventLogContainer.scrollTop = eventLogContainer.scrollHeight;
  }

  function showToast(title, message) {
    if (!toast) return;
    toastTitle.textContent = title;
    toastMsg.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  /**
   * Applies CSS hiding rules to simulated YouTube tags based on active settings
   */
  function updateSimulatedCSS(effective) {
    const rules = [];

    if (effective.hideSidebarShorts) {
      rules.push('ytd-guide-entry-renderer.shorts-nav-entry { display: none !important; }');
    }
    if (effective.hideFeedShelves) {
      rules.push('ytd-rich-shelf-renderer[is-shorts] { display: none !important; }');
    }
    if (effective.hideSearchShorts) {
      rules.push('ytd-search ytd-reel-shelf-renderer { display: none !important; }');
    }
    if (effective.hideWatchNextShorts) {
      rules.push('#related ytd-reel-shelf-renderer { display: none !important; }');
    }
    if (effective.hideChannelShortsTab) {
      rules.push('yt-tab-shape[tab-title="Shorts"] { display: none !important; }');
    }

    simStyleTag.textContent = rules.join('\n');
    logEvent(`Updated CSS rules: ${rules.length} hiding selectors active`, 'hiding');
  }

  /**
   * Updates UI badges and quick switch buttons
   */
  function syncModeDisplay(mode) {
    if (headerModeBadge) {
      headerModeBadge.textContent = `${mode.toUpperCase()} MODE`;
      if (mode === 'strict') {
        headerModeBadge.style.color = '#ff2a54';
        headerModeBadge.style.borderColor = 'rgba(255, 42, 84, 0.4)';
      } else if (mode === 'redirect_only') {
        headerModeBadge.style.color = '#38bdf8';
        headerModeBadge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      } else {
        headerModeBadge.style.color = '#a855f7';
        headerModeBadge.style.borderColor = 'rgba(168, 85, 247, 0.4)';
      }
    }

    simModeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
  }

  /**
   * Reload embedded iframes so they sync storage
   */
  function refreshFrames() {
    if (popupFrame && popupFrame.contentWindow) {
      try { popupFrame.contentWindow.location.reload(); } catch {}
    }
    if (optionsFrame && optionsFrame.contentWindow) {
      try { optionsFrame.contentWindow.location.reload(); } catch {}
    }
  }

  /**
   * Simulated Shorts Redirection Trigger
   */
  function triggerShortsRedirect(shortsUrl) {
    // Exact parsing
    const match = shortsUrl.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (!match) return;

    const videoId = match[1];
    let watchUrl = `/watch?v=${videoId}`;

    // Timestamp preservation
    if (shortsUrl.includes('t=15s')) {
      watchUrl += '&t=15s';
    }

    redirectCount++;
    if (headerCounter) {
      headerCounter.textContent = String(redirectCount);
    }
    if (simUrlPath) {
      simUrlPath.textContent = watchUrl;
    }

    logEvent(`INTERCEPTED: ${shortsUrl} -> REDIRECTED TO: ${watchUrl}`, 'redirect');
    showToast('YouTube Shorts Redirected!', `Converts ${shortsUrl} to standard player: ${watchUrl}`);

    chrome.runtime.sendMessage({ action: 'INCREMENT_REDIRECT_COUNT' });
  }

  /**
   * Wire up simulated YouTube links
   */
  function attachSimulatorLinkListeners() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      if (href.startsWith('/shorts/')) {
        e.preventDefault();
        triggerShortsRedirect(href);
      } else if (href.startsWith('/watch?v=')) {
        e.preventDefault();
        if (simUrlPath) simUrlPath.textContent = href;
        logEvent(`Regular video loaded: ${href}`, 'info');
      }
    });
  }

  /**
   * Tab Navigation
   */
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(`tab-${target}`);
      if (targetContent) targetContent.classList.add('active');

      if (target === 'popup' || target === 'options') {
        refreshFrames();
      }
    });
  });

  /**
   * Quick Mode Switch buttons
   */
  simModeButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mode = btn.getAttribute('data-mode');
      if (!mode) return;

      const res = await chrome.runtime.sendMessage({
        action: 'SAVE_SETTINGS',
        data: { ...currentSettings, mode }
      });

      if (res?.effectiveSettings) {
        currentSettings = res.settings;
        syncModeDisplay(currentSettings.mode);
        updateSimulatedCSS(res.effectiveSettings);
        refreshFrames();
        logEvent(`User changed mode to ${mode.toUpperCase()} in toolbar.`);
      }
    });
  });

  // Clear logs button
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
      if (eventLogContainer) eventLogContainer.innerHTML = '';
      logEvent('Console logs cleared.');
    });
  }

  // Simulate infinite scroll dynamically adding new Shorts cards
  if (btnAddDynamic) {
    btnAddDynamic.addEventListener('click', () => {
      const grid = document.getElementById('shorts-shelf-grid');
      if (!grid) return;

      const newShort = document.createElement('div');
      newShort.className = 'shorts-card';
      const id = 'dyn_' + Math.random().toString(36).substring(2, 9);
      newShort.innerHTML = `
        <a href="/shorts/${id}123" class="shorts-link">
          <div class="shorts-thumb thumb-short-1">
            <span class="shorts-badge">Dynamic Short</span>
            <span class="hover-action">Click to Test Redirect</span>
          </div>
          <span class="shorts-title">Dynamically Appended Short (Infinite Scroll)</span>
          <span class="shorts-views">250K views</span>
        </a>
      `;
      grid.appendChild(newShort);
      logEvent(`DOM MutationObserver detected new dynamic Short: /shorts/${id}123`, 'info');
    });
  }

  // Listen to broadcast changes from popup / options iframes
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SETTINGS_UPDATED' && message.data) {
      updateSimulatedCSS(message.data);
      if (message.data.mode) {
        syncModeDisplay(message.data.mode);
      }
      logEvent(`Settings updated from UI: mode=${message.data.mode}`, 'info');
    }
  });

  // Initialization
  async function initStudio() {
    attachSimulatorLinkListeners();

    const settingsRes = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
    if (settingsRes?.settings) {
      currentSettings = settingsRes.settings;
      syncModeDisplay(currentSettings.mode);
      updateSimulatedCSS(settingsRes.effectiveSettings);
    }

    const statsRes = await chrome.runtime.sendMessage({ action: 'GET_STATS' });
    if (statsRes?.stats && headerCounter) {
      redirectCount = statsRes.stats.redirectedCount || 14;
      headerCounter.textContent = String(redirectCount);
    }

    logEvent('FocusTube Studio Testbench ready. YouTube feed emulation active.');
  }

  initStudio();
})();
