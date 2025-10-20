import browser from 'webextension-polyfill';

interface SettingsFormElements {
  apiKeyInput: HTMLInputElement;
  githubTokenInput: HTMLInputElement;
  saveButton: HTMLButtonElement;
  statusDiv: HTMLDivElement;
  clearCacheButton?: HTMLButtonElement;
}

export function initializeSettingsForm(elements: SettingsFormElements, isPopup: boolean = false) {
  const { apiKeyInput, githubTokenInput, saveButton, statusDiv, clearCacheButton } = elements;

  // Setup toggle visibility buttons
  setupToggleVisibility();

  // Load saved settings
  loadSettings();

  async function loadSettings() {
    const result = await browser.storage.sync.get(['anthropicApiKey', 'githubToken']);
    
    if (result.anthropicApiKey) {
      if (isPopup) {
        // Show masked version in popup
        const key = result.anthropicApiKey as string;
        apiKeyInput.value = key.substring(0, 10) + '...' + key.substring(key.length - 4);
        apiKeyInput.placeholder = 'Configured';
      } else {
        apiKeyInput.value = result.anthropicApiKey;
      }
    }
    
    if (result.githubToken) {
      if (isPopup) {
        // Show masked version in popup
        const token = result.githubToken as string;
        githubTokenInput.value = token.substring(0, 8) + '...' + token.substring(token.length - 4);
        githubTokenInput.placeholder = 'Configured';
      } else {
        githubTokenInput.value = result.githubToken;
      }
    }
  }

  // Save settings
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const githubToken = githubTokenInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    // Don't save if it's the masked version (popup only)
    if (isPopup && apiKey.includes('...')) {
      showStatus('Settings already configured', 'success');
      return;
    }

    await browser.storage.sync.set({ 
      anthropicApiKey: apiKey,
      githubToken: githubToken || null
    });
    
    showStatus('✓ Settings saved!', 'success');
    
    // Mask the values after saving in popup
    if (isPopup) {
      setTimeout(() => {
        if (apiKey) {
          apiKeyInput.value = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
        }
        if (githubToken) {
          githubTokenInput.value = githubToken.substring(0, 8) + '...' + githubToken.substring(githubToken.length - 4);
        }
      }, 500);
    }
  });

  // Clear cache (options page only)
  if (clearCacheButton) {
    clearCacheButton.addEventListener('click', async () => {
      await browser.storage.local.clear();
      showStatus('✓ Cache cleared!', 'success');
    });
  }

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 2000);
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
        } else {
          input.type = 'password';
          // Hide slash, show eye parts
          eyeOpen.forEach(el => (el as SVGElement).style.display = 'block');
          if (eyeClosed) eyeClosed.style.display = 'none';
        }
      });
    });
  }
}
