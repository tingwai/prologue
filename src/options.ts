import browser from 'webextension-polyfill';

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const clearCacheButton = document.getElementById('clearCache') as HTMLButtonElement;

  // Load saved API key
  const result = await browser.storage.sync.get('continueApiKey');
  if (result.continueApiKey) {
    apiKeyInput.value = result.continueApiKey;
  }

  // Save API key
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    await browser.storage.sync.set({ continueApiKey: apiKey });
    showStatus('API key saved successfully!', 'success');
  });

  // Clear cache
  clearCacheButton.addEventListener('click', async () => {
    await browser.storage.local.clear();
    showStatus('Cache cleared successfully!', 'success');
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
