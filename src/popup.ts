import browser from 'webextension-polyfill';
import { initializeSettingsForm } from './settings-shared';

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const githubTokenInput = document.getElementById('githubToken') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const openOptionsButton = document.getElementById('openOptions') as HTMLAnchorElement;

  // Initialize shared settings form
  initializeSettingsForm({
    apiKeyInput,
    githubTokenInput,
    saveButton,
    statusDiv
  }, true); // isPopup = true

  // Open full options page
  openOptionsButton.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
    window.close();
  });
});
