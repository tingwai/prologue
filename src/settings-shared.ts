import browser from 'webextension-polyfill';
import { STORAGE_KEYS, TIMING, MESSAGES, LOG_PREFIX } from './constants';
import { maskApiKey, maskGithubToken } from './utils';

interface SettingsFormElements {
  apiKeyInput: HTMLInputElement;
  githubTokenInput: HTMLInputElement;
  saveButton: HTMLButtonElement;
  statusDiv: HTMLDivElement;
  clearCacheButton?: HTMLButtonElement;
}

export function initializeSettingsForm(elements: SettingsFormElements, isPopup: boolean = false) {
  const { apiKeyInput, githubTokenInput, saveButton, statusDiv, clearCacheButton } = elements;

  // Store full values for popup mode (to show when toggling visibility)
  let fullApiKey: string | null = null;
  let fullGithubToken: string | null = null;

  // Setup toggle visibility buttons
  setupToggleVisibility();

  // Load saved settings
  loadSettings();

  async function loadSettings() {
    try {
      const result = await browser.storage.sync.get([
        STORAGE_KEYS.ANTHROPIC_API_KEY,
        STORAGE_KEYS.GITHUB_TOKEN
      ]);

      if (result[STORAGE_KEYS.ANTHROPIC_API_KEY]) {
        fullApiKey = result[STORAGE_KEYS.ANTHROPIC_API_KEY] as string;
        if (isPopup) {
          // Show masked version in popup
          apiKeyInput.value = maskApiKey(fullApiKey);
          apiKeyInput.placeholder = MESSAGES.PLACEHOLDERS.API_KEY_CONFIGURED;
        } else {
          apiKeyInput.value = fullApiKey;
        }
      }

      if (result[STORAGE_KEYS.GITHUB_TOKEN]) {
        fullGithubToken = result[STORAGE_KEYS.GITHUB_TOKEN] as string;
        if (isPopup) {
          // Show masked version in popup
          githubTokenInput.value = maskGithubToken(fullGithubToken);
          githubTokenInput.placeholder = MESSAGES.PLACEHOLDERS.API_KEY_CONFIGURED;
        } else {
          githubTokenInput.value = fullGithubToken;
        }
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to load settings:`, error);
      showStatus('Failed to load settings', 'error');
    }
  }

  // Save settings
  saveButton.addEventListener('click', async () => {
    try {
      const apiKey = apiKeyInput.value.trim();
      const githubToken = githubTokenInput.value.trim();

      if (!apiKey) {
        showStatus(MESSAGES.ERRORS.NO_API_KEY_WARNING, 'error');
        return;
      }

      // Don't save if it's the masked version (popup only)
      if (isPopup && apiKey.includes('...')) {
        showStatus(MESSAGES.SUCCESS.SETTINGS_CONFIGURED, 'success');
        return;
      }

      await browser.storage.sync.set({
        [STORAGE_KEYS.ANTHROPIC_API_KEY]: apiKey,
        [STORAGE_KEYS.GITHUB_TOKEN]: githubToken || null
      });

      showStatus(MESSAGES.SUCCESS.SETTINGS_SAVED, 'success');

      // Mask the values after saving in popup
      if (isPopup) {
        setTimeout(() => {
          if (apiKey) {
            apiKeyInput.value = maskApiKey(apiKey);
          }
          if (githubToken) {
            githubTokenInput.value = maskGithubToken(githubToken);
          }
        }, 500);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to save settings:`, error);
      showStatus('Failed to save settings', 'error');
    }
  });

  // Clear cache (options page only)
  if (clearCacheButton) {
    clearCacheButton.addEventListener('click', async () => {
      try {
        await browser.storage.local.clear();
        showStatus(MESSAGES.SUCCESS.CACHE_CLEARED, 'success');
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to clear cache:`, error);
        showStatus('Failed to clear cache', 'error');
      }
    });
  }

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, TIMING.STATUS_MESSAGE_DURATION);
  }

  function setupToggleVisibility() {
    const toggleButtons = document.querySelectorAll('.toggle-visibility');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        if (!targetId) return;
        
        const input = document.getElementById(targetId) as HTMLInputElement;
        const svg = button.querySelector('svg');
        if (!input || !svg) return;
        
        const eyeOpen = svg.querySelectorAll('.eye-open');
        const eyeClosed = svg.querySelector('.eye-closed') as SVGLineElement;
        
        if (input.type === 'password') {
          input.type = 'text';
          // Show slash, hide eye parts
          eyeOpen.forEach(el => (el as SVGElement).style.display = 'none');
          if (eyeClosed) eyeClosed.style.display = 'block';
          
          // In popup mode, show full value when revealing
          if (isPopup) {
            if (targetId === 'apiKey' && fullApiKey) {
              input.value = fullApiKey;
            } else if (targetId === 'githubToken' && fullGithubToken) {
              input.value = fullGithubToken;
            }
          }
        } else {
          input.type = 'password';
          // Hide slash, show eye parts
          eyeOpen.forEach(el => (el as SVGElement).style.display = 'block');
          if (eyeClosed) eyeClosed.style.display = 'none';

          // In popup mode, show masked value when hiding
          if (isPopup) {
            if (targetId === 'apiKey' && fullApiKey) {
              input.value = maskApiKey(fullApiKey);
            } else if (targetId === 'githubToken' && fullGithubToken) {
              input.value = maskGithubToken(fullGithubToken);
            }
          }
        }
      });
    });
  }
}
