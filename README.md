# Prologue

**Select. Understand. Ship faster.**

Never wonder what code does again. Prologue brings Claude directly to your GitHub pull requests. Just highlight any snippet and get instant, insightful explanations without leaving the page.

## ✨ Features

- 🤖 **AI-Powered Explanations** - Select any code snippet in a PR to get instant, insightful explanations from Claude
- 🔐 **Private Repository Support** - Works with private repos using GitHub Personal Access Token
- 💾 **Smart Caching** - Loads PR diff once per commit, subsequent selections are instant
- 🎯 **Non-Intrusive** - Minimal tooltip-based UI that appears only when you need it
- 🔒 **Privacy-First** - API keys stored locally, no data sent except to Anthropic's Claude API
- 🦊 **Cross-Browser** - Works on both Chrome and Firefox

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Build for BOTH Chrome AND Firefox
npm run build            # Builds to dist-chrome/ and dist-firefox/

# Or build individually
npm run build:chrome     # Chrome only -> dist-chrome/
npm run build:firefox    # Firefox only -> dist-firefox/

# Or run in development mode with watch
npm run dev              # Chrome
npm run dev:firefox      # Firefox
```

### Load Extension

**Chrome:**
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist-chrome` folder

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist-firefox/manifest.json`

### Configure Settings

1. Click the extension icon in your browser toolbar
2. Enter your **Anthropic API Key** from [console.anthropic.com](https://console.anthropic.com/)
3. (Optional) For **private repositories**, add a GitHub Personal Access Token:
   - Go to [github.com/settings/tokens](https://github.com/settings/tokens)
   - Generate a new token (classic) with `repo` scope
   - Paste the token in the settings
4. Click "Save Settings"
5. For more options, click "⚙️ Manage Extension Settings" to open full settings page

## 📖 How to Use

1. **Navigate** to any GitHub Pull Request
2. **Wait** ~2-3 seconds for the extension to load the PR diff (first time per commit)
3. **Select** any code snippet in the diff view
4. **Read** the AI-generated explanation in a tooltip that appears below your cursor
5. **Enjoy** instant responses for subsequent selections (context already cached)

### Tips

- Select **5+ characters** for the tooltip to appear
- Works in the **"Files changed"** tab and commit diff views
- Click the **👁️ eye icon** in settings to reveal your API keys
- **Clear cache** from settings if PRs aren't loading correctly

## 🏗️ Architecture

```
src/
├── manifest.json          # Chrome Manifest v3
├── manifest-firefox.json  # Firefox Manifest v2 (for compatibility)
├── content.ts            # Main extension logic (runs on GitHub PR pages)
├── background.ts         # Service worker for cache cleanup
├── options.ts/.html      # Settings page for API key
├── styles.css            # Tooltip styling
└── types.ts              # TypeScript interfaces
```

### How It Works

1. **Diff Fetching**:
   - Public repos: Uses `patch-diff.githubusercontent.com`
   - Private repos: Uses GitHub API with your personal access token
2. **Claude Integration**: Sends full PR diff to Claude with system prompt for context
3. **Smart Caching**: Stores PR diff and conversation history keyed by `${prUrl}:${commitSHA}`
4. **Code Selection**: When you select code, sends focused query to Claude with full PR context
5. **Instant Display**: Shows concise, insightful explanation in a positioned tooltip
6. **No History Growth**: Each selection replaces the previous query (conversation doesn't grow)

### Caching Strategy

- **Cache key**: `${prUrl}:${commitSHA}` (unique per PR and commit)
- **Auto-refresh**: Re-fetches diff when new commits are pushed
- **Auto-cleanup**: Removes cache entries older than 7 days via background service worker
- **Manual clear**: Available in extension settings page
- **What's cached**: Full PR diff, initial conversation setup (not individual queries)

## 🔧 Development

```bash
# Watch mode for rapid development
npm run dev              # Chrome
npm run dev:firefox      # Firefox

# Type checking
npx tsc --noEmit

# Clean build artifacts
npm run clean
```

## 📦 Tech Stack

- **TypeScript** - Type-safe development
- **Webpack** - Bundling and build process
- **webextension-polyfill** - Cross-browser compatibility
- **Claude API** - Anthropic's AI model (Claude Sonnet 4.5)
- **GitHub API** - Fetching private repository diffs

## 🐛 Troubleshooting

**Extension not working on private repos:**
- Add a GitHub Personal Access Token in extension settings
- Token must have `repo` scope (full access to private repositories)
- Check browser console for "404" errors indicating auth issues

**"PR context not loaded" message:**
- Refresh the page and wait 2-3 seconds
- Check that you have a valid Anthropic API key configured
- Open browser console (F12) and look for `[Prologue]` logs
- For private repos, ensure GitHub token is configured

**Tooltip not appearing:**
- Select at least **5 characters** of code
- Selection must be in diff areas (`.blob-code`, `.file`, etc.)
- Check console for `[Prologue] isCodeArea: false` logs

**"Failed to fetch diff" errors:**
- **404 error without token**: Repository is private, add GitHub token
- **404 error with token**: Token may lack `repo` scope, regenerate with correct permissions
- **401/403 errors**: API key or GitHub token is invalid

**Cache issues:**
- Click "⚙️ Manage Extension Settings" → "Clear Cache"
- Check console for cache-related errors
- Try reloading the extension from browser extensions page

## ⚠️ Privacy & Security

- **Local storage only**: API keys stored in browser's sync storage (encrypted by browser)
- **No tracking**: Extension doesn't collect any analytics or telemetry
- **API calls**: Only to Anthropic (Claude) and GitHub APIs - no third-party services
- **Code visibility**: PR diffs sent to Claude API for analysis (review Anthropic's privacy policy)
- **Open source**: Full code available for audit

## 🔑 API Keys & Costs

**Anthropic API Key (Required)**
- Get from [console.anthropic.com](https://console.anthropic.com/)
- Full PR context sent once per PR, queries are cheap

**GitHub Token (Optional)**
- Only needed for private repositories
- Free to generate, no API costs
- Create at [github.com/settings/tokens](https://github.com/settings/tokens)

## 🤝 Contributing

Contributions welcome! This extension is designed to be minimal and focused on aiding PR reviews without being intrusive.

### Areas for Improvement
- Better error messaging in UI (not just console)
- Support for GitHub Enterprise
- Configurable Claude model selection
- Keyboard shortcuts for triggering explanations
