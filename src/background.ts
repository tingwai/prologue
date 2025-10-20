import browser from 'webextension-polyfill';
import type { CachedStorageValue } from './types';
import { TIMING, LOG_PREFIX } from './constants';

/**
 * Background service worker for the extension
 * Handles extension lifecycle and cache management
 */

console.log(`${LOG_PREFIX} Background service worker loaded`);

/**
 * Open options page on fresh install
 */
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log(`${LOG_PREFIX} Extension installed`);
    browser.runtime.openOptionsPage().catch(error => {
      console.error(`${LOG_PREFIX} Failed to open options page:`, error);
    });
  }
});

/**
 * Handle messages from content script if needed
 */
browser.runtime.onMessage.addListener((message, sender) => {
  console.log(`${LOG_PREFIX} Message received:`, message, 'from', sender.tab?.id);
  // Return nothing (void) for sync handling
  return undefined;
});

/**
 * Type guard to check if a value is a cached storage value
 */
function isCachedValue(value: unknown): value is CachedStorageValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'timestamp' in value &&
    typeof (value as CachedStorageValue).timestamp === 'number'
  );
}

/**
 * Clean up old cache entries (older than CACHE_MAX_AGE)
 */
async function cleanupOldCache(): Promise<void> {
  try {
    const storage = await browser.storage.local.get(null);
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, value] of Object.entries(storage)) {
      if (isCachedValue(value) && now - value.timestamp > TIMING.CACHE_MAX_AGE) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      await browser.storage.local.remove(keysToRemove);
      console.log(`${LOG_PREFIX} Cleaned up ${keysToRemove.length} old cache entries`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Cache cleanup failed:`, error);
  }
}

/**
 * Run cleanup on startup and periodically
 */
cleanupOldCache();
const cleanupIntervalId = setInterval(cleanupOldCache, TIMING.CACHE_CLEANUP_INTERVAL);

// Clean up interval on extension unload (not always possible in service workers)
if (typeof self !== 'undefined' && 'addEventListener' in self) {
  self.addEventListener('unload', () => {
    clearInterval(cleanupIntervalId);
  });
}
