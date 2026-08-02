import browser from 'webextension-polyfill';
import { STORAGE_KEYS, TIMING, MESSAGES, LOG_PREFIX } from './constants';
import { maskApiKey, maskGithubToken, checkGitHubToken } from './utils';

interface SettingsFormElements {
  anthropicApiKeyInput: HTMLInputElement;
  openaiApiKeyInput: HTMLInputElement;
  githubTokenInput: HTMLInputElement;
  saveButton: HTMLButtonElement;
  statusDiv: HTMLDivElement;
  clearCacheButton?: HTMLButtonElement;
  githubTokenStatusDiv?: HTMLDivElement;
}

export function initializeSettingsForm(elements: SettingsFormElements, isPopup: boolean = false) {
  const { anthropicApiKeyInput, openaiApiKeyInput, githubTokenInput, saveButton, statusDiv, clearCacheButton, githubTokenStatusDiv } = elements;

  // Store full values for popup mode (to show when toggling visibility)
  let fullAnthropicApiKey: string | null = null;
  let fullOpenAIApiKey: string | null = null;
  let fullGithubToken: string | null = null;

  // Setup toggle visibility buttons
  setupToggleVisibility();

  // Check token on input change (debounced)
  let tokenCheckTimeout: NodeJS.Timeout | null = null;
  githubTokenInput.addEventListener('input', () => {
    if (tokenCheckTimeout) {
      clearTimeout(tokenCheckTimeout);
    }
    // Debounce token check by 1 second
    tokenCheckTimeout = setTimeout(() => {
      const token = githubTokenInput.value.trim();
      if (token && !token.includes('...')) {
        checkAndDisplayTokenStatus(token);
      } else if (githubTokenStatusDiv) {
        githubTokenStatusDiv.style.display = 'none';
      }
    }, 1000);
  });

  // Load saved settings
  loadSettings();

  async function loadSettings() {
    try {
      const result = await browser.storage.sync.get([
        STORAGE_KEYS.ANTHROPIC_API_KEY,
        STORAGE_KEYS.OPENAI_API_KEY,
        STORAGE_KEYS.GITHUB_TOKEN
      ]);

      if (result[STORAGE_KEYS.ANTHROPIC_API_KEY]) {
        fullAnthropicApiKey = result[STORAGE_KEYS.ANTHROPIC_API_KEY] as string;
        if (isPopup) {
          // Show masked version in popup
          anthropicApiKeyInput.value = maskApiKey(fullAnthropicApiKey);
          anthropicApiKeyInput.placeholder = MESSAGES.PLACEHOLDERS.API_KEY_CONFIGURED;
        } else {
          anthropicApiKeyInput.value = fullAnthropicApiKey;
        }
      }

      if (result[STORAGE_KEYS.OPENAI_API_KEY]) {
        fullOpenAIApiKey = result[STORAGE_KEYS.OPENAI_API_KEY] as string;
        if (isPopup) {
          openaiApiKeyInput.value = maskApiKey(fullOpenAIApiKey);
          openaiApiKeyInput.placeholder = MESSAGES.PLACEHOLDERS.API_KEY_CONFIGURED;
        } else {
          openaiApiKeyInput.value = fullOpenAIApiKey;
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
        // Check token validity and expiration
        checkAndDisplayTokenStatus(fullGithubToken);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to load settings:`, error);
      showStatus('Failed to load settings', 'error');
    }
  }

  async function checkAndDisplayTokenStatus(token: string) {
    if (!githubTokenStatusDiv || !token) return;

    githubTokenStatusDiv.textContent = 'Checking token...';
    githubTokenStatusDiv.style.display = 'block';

    const tokenInfo = await checkGitHubToken(token);

    if (!tokenInfo.valid) {
      githubTokenStatusDiv.textContent = `⚠️ ${tokenInfo.error || 'Invalid token'}`;
      githubTokenStatusDiv.style.color = '#ef4444';
    } else if (tokenInfo.expiresAt) {
      const expiresDate = new Date(tokenInfo.expiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        githubTokenStatusDiv.textContent = '⚠️ Token expired';
        githubTokenStatusDiv.style.color = '#ef4444';
      } else if (daysUntilExpiry < 7) {
        githubTokenStatusDiv.textContent = `⚠️ Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;
        githubTokenStatusDiv.style.color = '#f59e0b';
      } else {
        githubTokenStatusDiv.textContent = `✓ Valid, expires ${expiresDate.toLocaleDateString()}`;
        githubTokenStatusDiv.style.color = '#10b981';
      }
    } else {
      // No expiration (classic token without expiration set)
      githubTokenStatusDiv.textContent = '✓ Valid token (no expiration)';
      githubTokenStatusDiv.style.color = '#10b981';
    }
  }

  // Save settings
  saveButton.addEventListener('click', async () => {
    try {
      const enteredAnthropicApiKey = anthropicApiKeyInput.value.trim();
      const enteredOpenAIApiKey = openaiApiKeyInput.value.trim();
      const githubToken = githubTokenInput.value.trim();
      const anthropicApiKey = isPopup && enteredAnthropicApiKey.includes('...')
        ? fullAnthropicApiKey || ''
        : enteredAnthropicApiKey;
      const openaiApiKey = isPopup && enteredOpenAIApiKey.includes('...')
        ? fullOpenAIApiKey || ''
        : enteredOpenAIApiKey;

      if (!anthropicApiKey && !openaiApiKey) {
        showStatus(MESSAGES.ERRORS.NO_API_KEY_WARNING, 'error');
        return;
      }

      await browser.storage.sync.set({
        [STORAGE_KEYS.ANTHROPIC_API_KEY]: anthropicApiKey || null,
        [STORAGE_KEYS.OPENAI_API_KEY]: openaiApiKey || null,
        [STORAGE_KEYS.GITHUB_TOKEN]: githubToken || null
      });

      showStatus(MESSAGES.SUCCESS.SETTINGS_SAVED, 'success');

      fullAnthropicApiKey = anthropicApiKey || null;
      fullOpenAIApiKey = openaiApiKey || null;

      // Mask the values after saving in popup
      if (isPopup) {
        setTimeout(() => {
          if (anthropicApiKey) {
            anthropicApiKeyInput.value = maskApiKey(anthropicApiKey);
          }
          if (openaiApiKey) {
            openaiApiKeyInput.value = maskApiKey(openaiApiKey);
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
            if (targetId === 'anthropicApiKey' && fullAnthropicApiKey) {
              input.value = fullAnthropicApiKey;
            } else if (targetId === 'openaiApiKey' && fullOpenAIApiKey) {
              input.value = fullOpenAIApiKey;
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
            if (targetId === 'anthropicApiKey' && fullAnthropicApiKey) {
              input.value = maskApiKey(fullAnthropicApiKey);
            } else if (targetId === 'openaiApiKey' && fullOpenAIApiKey) {
              input.value = maskApiKey(fullOpenAIApiKey);
            } else if (targetId === 'githubToken' && fullGithubToken) {
              input.value = maskGithubToken(fullGithubToken);
            }
          }
        }
      });
    });
  }
}
