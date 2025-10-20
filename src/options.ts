import { initializeSettingsForm } from './settings-shared';

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const githubTokenInput = document.getElementById('githubToken') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const clearCacheButton = document.getElementById('clearCache') as HTMLButtonElement;

  // Initialize shared settings form
  initializeSettingsForm({
    apiKeyInput,
    githubTokenInput,
    saveButton,
    statusDiv,
    clearCacheButton
  }, false); // isPopup = false
});
