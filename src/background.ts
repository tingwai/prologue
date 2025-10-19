import browser from 'webextension-polyfill';

// Background service worker for extension
console.log('[PR Context Assistant] Background service worker loaded');

// Listen for extension installation
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[PR Context Assistant] Extension installed');
    browser.runtime.openOptionsPage();
  }
});

// Handle messages from content script if needed
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[PR Context Assistant] Message received:', message);
  return false;
});

// Clean up old cache entries (older than 7 days)
async function cleanupOldCache() {
  const storage = await browser.storage.local.get(null);
  const now = Date.now();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;

  const keysToRemove: string[] = [];

  for (const [key, value] of Object.entries(storage)) {
    if (typeof value === 'object' && value !== null && 'timestamp' in value) {
      const timestamp = (value as any).timestamp;
      if (now - timestamp > weekInMs) {
        keysToRemove.push(key);
      }
    }
  }

  if (keysToRemove.length > 0) {
    await browser.storage.local.remove(keysToRemove);
    console.log(`[PR Context Assistant] Cleaned up ${keysToRemove.length} old cache entries`);
  }
}

// Run cleanup on startup and periodically
cleanupOldCache();
setInterval(cleanupOldCache, 24 * 60 * 60 * 1000); // Once per day
