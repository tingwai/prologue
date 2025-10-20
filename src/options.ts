import { initializeSettingsForm } from './settings-shared';
import { LOG_PREFIX } from './constants';

document.addEventListener('DOMContentLoaded', () => {
  try {
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const githubTokenInput = document.getElementById('githubToken') as HTMLInputElement;
    const saveButton = document.getElementById('save') as HTMLButtonElement;
    const statusDiv = document.getElementById('status') as HTMLDivElement;
    const clearCacheButton = document.getElementById('clearCache') as HTMLButtonElement;

    if (!apiKeyInput || !githubTokenInput || !saveButton || !statusDiv || !clearCacheButton) {
      console.error(`${LOG_PREFIX} Required DOM elements not found`);
      return;
    }

    // Initialize shared settings form
    initializeSettingsForm({
      apiKeyInput,
      githubTokenInput,
      saveButton,
      statusDiv,
      clearCacheButton
    }, false); // isPopup = false
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to initialize options page:`, error);
  }
});
