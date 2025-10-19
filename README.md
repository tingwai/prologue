# PR Context Assistant

AI-powered Chrome/Firefox extension that provides instant context and explanations for GitHub Pull Requests using the Continue API.

## ✨ Features

- 🤖 **AI-Powered Explanations** - Select any code snippet in a PR to get instant context
- 💾 **Smart Caching** - Loads PR once per commit, subsequent selections are instant
- 🎯 **Non-Intrusive** - Tooltip-based UI that appears only when you need it
- 🔒 **Privacy-First** - Your API key stored locally, works only on code diffs
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

### Configure API Key

1. Click the extension icon in your browser
2. Click "Configure API Key" 
3. Enter your Continue API key from [continue.dev](https://continue.dev)
4. Save settings

## 📖 How to Use

1. Open any GitHub Pull Request
2. Wait ~3-5 seconds for the PR to load (first time per PR/commit)
3. Select any code snippet in the diff
4. Instantly see AI explanation in a tooltip
5. Subsequent selections are instant (context already loaded)

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

1. **Page Load**: Extracts PR title, description, and all file diffs
2. **Initialize Agent**: Sends full PR context to Continue API to create background agent
3. **Cache**: Stores agent ID and context keyed by `${prUrl}:${commitSHA}`
4. **Selection**: When you select code, queries the existing agent (no re-sending context)
5. **Display**: Shows concise explanation in a non-intrusive tooltip

### Caching Strategy

- Cache key: `${prUrl}:${commitSHA}` 
- Re-initializes when new commits are pushed
- Auto-cleanup of cache entries older than 7 days
- Manual cache clear available in options page

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
- **Continue API** - AI agent infrastructure

## 🐛 Troubleshooting

**No API key configured:**
- Go to extension options and enter your Continue API key

**PR context not loading:**
- Check browser console for errors
- Ensure you're on the "Files changed" tab
- Try refreshing the page

**Tooltip not appearing:**
- Make sure you're selecting text in code diff areas (not comments)
- Selection must be at least 5 characters
- Check that PR context loaded (console logs)

**Cache issues:**
- Clear cache from extension options page
- Check `about:debugging` (Firefox) or `chrome://extensions` for errors

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! This extension is designed to be minimal and focused on aiding PR reviews without being intrusive.

---

Built with ❤️ using [Continue](https://continue.dev)
