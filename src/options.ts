import { initializeSettingsForm } from './settings-shared';
import { LOG_PREFIX } from './constants';

document.addEventListener('DOMContentLoaded', () => {
  try {
    const anthropicApiKeyInput = document.getElementById('anthropicApiKey') as HTMLInputElement;
    const openaiApiKeyInput = document.getElementById('openaiApiKey') as HTMLInputElement;
    const githubTokenInput = document.getElementById('githubToken') as HTMLInputElement;
    const saveButton = document.getElementById('save') as HTMLButtonElement;
    const statusDiv = document.getElementById('status') as HTMLDivElement;
    const clearCacheButton = document.getElementById('clearCache') as HTMLButtonElement;
    const githubTokenStatusDiv = document.getElementById('githubTokenStatus') as HTMLDivElement;

    if (!anthropicApiKeyInput || !openaiApiKeyInput || !githubTokenInput || !saveButton || !statusDiv || !clearCacheButton) {
      console.error(`${LOG_PREFIX} Required DOM elements not found`);
      return;
    }

    // Initialize shared settings form
    initializeSettingsForm({
      anthropicApiKeyInput,
      openaiApiKeyInput,
      githubTokenInput,
      saveButton,
      statusDiv,
      clearCacheButton,
      githubTokenStatusDiv
    }, false); // isPopup = false
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to initialize options page:`, error);
  }
});
