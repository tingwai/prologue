import browser from 'webextension-polyfill';

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const openOptionsButton = document.getElementById('openOptions') as HTMLAnchorElement;

  // Load saved API key
  const result = await browser.storage.sync.get('anthropicApiKey');
  if (result.anthropicApiKey) {
    // Show masked version
    const key = result.anthropicApiKey as string;
    apiKeyInput.value = key.substring(0, 10) + '...' + key.substring(key.length - 4);
    apiKeyInput.placeholder = 'API key configured';
  }

  // Save API key
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    // Don't save if it's the masked version
    if (apiKey.includes('...')) {
      showStatus('API key already configured', 'success');
      return;
    }

    await browser.storage.sync.set({ anthropicApiKey: apiKey });
    showStatus('✓ API key saved!', 'success');
    
    // Mask the key after saving
    setTimeout(() => {
      apiKeyInput.value = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
    }, 500);
  });

  // Open full options page
  openOptionsButton.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
    window.close();
  });

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});
