import browser from 'webextension-polyfill';
import { initializeSettingsForm } from './settings-shared';
import { LOG_PREFIX } from './constants';

document.addEventListener('DOMContentLoaded', () => {
  try {
    const anthropicApiKeyInput = document.getElementById('anthropicApiKey') as HTMLInputElement;
    const openaiApiKeyInput = document.getElementById('openaiApiKey') as HTMLInputElement;
    const githubTokenInput = document.getElementById('githubToken') as HTMLInputElement;
    const saveButton = document.getElementById('save') as HTMLButtonElement;
    const statusDiv = document.getElementById('status') as HTMLDivElement;
    const openOptionsButton = document.getElementById('openOptions') as HTMLAnchorElement;
    const githubTokenStatusDiv = document.getElementById('githubTokenStatus') as HTMLDivElement;

    if (!anthropicApiKeyInput || !openaiApiKeyInput || !githubTokenInput || !saveButton || !statusDiv || !openOptionsButton) {
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
      githubTokenStatusDiv
    }, true); // isPopup = true

    // Open full options page
    openOptionsButton.addEventListener('click', (e) => {
      e.preventDefault();
      browser.runtime.openOptionsPage().catch(error => {
        console.error(`${LOG_PREFIX} Failed to open options page:`, error);
      });
      window.close();
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to initialize popup:`, error);
  }
});
