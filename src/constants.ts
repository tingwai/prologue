/**
 * Application-wide constants
 */

// Timing constants (in milliseconds)
export const TIMING = {
  SELECTION_DEBOUNCE: 300,
  SELECTION_DELAY: 10,
  STATUS_MESSAGE_DURATION: 2000,
  COPY_FEEDBACK_DURATION: 1000,
  CACHE_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 1 day
  CACHE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

// UI constants
export const UI = {
  TOOLTIP_MAX_WIDTH: 500,
  TOOLTIP_OFFSET_Y: 20,
  TOOLTIP_PADDING: 10,
  MIN_SELECTION_LENGTH: 5,
  API_KEY_DISPLAY_PREFIX: 10,
  API_KEY_DISPLAY_SUFFIX: 4,
  GITHUB_TOKEN_DISPLAY_PREFIX: 8,
  GITHUB_TOKEN_DISPLAY_SUFFIX: 4,
  // Glow effect configuration for loading state
  // Note: GLOW_WINDOW_SIZE is a reference value. The actual window is controlled
  // by the CSS gradient in styles.css. Adjust gradient stop percentages to change
  // the window size (currently ~40-60% creates a bell curve effect)
  GLOW_WINDOW_SIZE: 4, // Approximate number of characters affected by the glow
  GLOW_ANIMATION_DURATION: 3, // Duration in seconds for one complete slide cycle
} as const;

// GitHub selectors
export const GITHUB_SELECTORS = {
  CODE_AREAS: [
    '.blob-code',
    '.file',
    '.diff-view',
    '.blob-wrapper',
    '.diff-text-inner',
    '[data-code-marker]',
  ],
  COMMIT_ELEMENT: '[data-hovercard-type="commit"]',
} as const;

// API configuration
export const API = {
  ANTHROPIC_VERSION: '2023-06-01',
  CLAUDE_MODEL: 'claude-sonnet-4-5-20250929',
  MAX_TOKENS: 1024,
} as const;

// Messages and prompts
export const MESSAGES = {
  ERRORS: {
    NO_API_KEY: '⚠️ No API key configured. Go to extension options.',
    PR_CONTEXT_NOT_LOADED: '⚠️ PR context not loaded. Please refresh the page.',
    QUERY_FAILED: '❌ Failed to get explanation. Try again.',
    NO_API_KEY_WARNING: 'Please enter an API key',
    PRIVATE_REPO_ERROR: 'Failed to fetch diff: Repository may be private. Please add a GitHub token in extension options.',
  },
  SUCCESS: {
    SETTINGS_SAVED: '✓ Settings saved!',
    CACHE_CLEARED: '✓ Cache cleared!',
    SETTINGS_CONFIGURED: 'Settings already configured',
  },
  LOADING: {
    THINKING: 'Thinking...',
  },
  PLACEHOLDERS: {
    API_KEY: 'sk-ant-xxxxxxxxxxxxxxxxxxxx',
    GITHUB_TOKEN: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    API_KEY_CONFIGURED: 'Configured',
  },
} as const;

// Storage keys
export const STORAGE_KEYS = {
  ANTHROPIC_API_KEY: 'anthropicApiKey',
  GITHUB_TOKEN: 'githubToken',
} as const;

// Console log prefix
export const LOG_PREFIX = '[PR Context Assistant]';
