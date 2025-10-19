import browser from 'webextension-polyfill';
import type { PRContext, TooltipPosition } from './types';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

class PRContextAssistant {
  private tooltip: HTMLElement | null = null;
  private prContext: PRContext | null = null;
  private conversationHistory: ConversationMessage[] = [];
  private isLoading = false;

  constructor() {
    this.init();
    this.setupNavigationListener();
  }

  private async init() {
    await this.loadPRContext();
    this.setupSelectionListener();
    console.log('[PR Context Assistant] Initialized');
  }

  private setupNavigationListener() {
    // Listen for URL changes (GitHub uses pushState for navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        console.log('[PR Context Assistant] URL changed from', lastUrl, 'to', url);
        lastUrl = url;
        
        // Check if we're still on a PR page
        if (this.extractPRInfo(url)) {
          console.log('[PR Context Assistant] Navigated to different PR, reloading context');
          this.prContext = null;
          this.conversationHistory = [];
          this.hideTooltip();
          this.loadPRContext();
        }
      }
    }).observe(document, { subtree: true, childList: true });
  }

  private async loadPRContext() {
    const prUrl = window.location.href;
    const commit = this.getCurrentCommit();
    const cacheKey = `${prUrl}:${commit}`;

    // Check cache first
    const cached = await browser.storage.local.get(cacheKey);
    if (cached[cacheKey]) {
      this.prContext = cached[cacheKey];
      this.conversationHistory = cached[cacheKey].conversationHistory || [];
      console.log('[PR Context Assistant] Loaded from cache');
      return;
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      console.warn('[PR Context Assistant] No API key set. Please configure in extension options.');
      return;
    }

    try {
      // Extract PR info to get diff URL
      const prInfo = this.extractPRInfo(prUrl);
      if (!prInfo) {
        console.error('[PR Context Assistant] Could not extract PR info');
        return;
      }

      // Fetch the raw diff from GitHub
      const diffUrl = `https://patch-diff.githubusercontent.com/raw/${prInfo.owner}/${prInfo.repo}/pull/${prInfo.number}.diff`;
      console.log('[PR Context Assistant] Fetching diff from:', diffUrl);

      const diffResponse = await fetch(diffUrl);
      if (!diffResponse.ok) {
        throw new Error(`Failed to fetch diff: ${diffResponse.statusText}`);
      }

      const diffContent = await diffResponse.text();
      console.log('[PR Context Assistant] Diff fetched, length:', diffContent.length);

      // Initialize conversation with Claude
      const systemPrompt = `You are a helpful AI code review assistant. You have been provided with the complete diff of a GitHub Pull Request. Your role is to:

1. Help reviewers understand specific code snippets they select
2. Explain what the code does technically
3. Provide context about how it fits into the PR changes
4. Keep responses concise and focused
5. Respond in short concise bullet points

Here is the full PR diff:

${diffContent}

When the user selects code snippets, provide helpful, contextual explanations.`;

      // Send initial message to Claude
      this.conversationHistory = [
        { role: 'user', content: systemPrompt },
        { role: 'assistant', content: 'I\'ve reviewed the PR diff and I\'m ready to help explain code snippets. Please select any code you\'d like me to explain.' }
      ];

      this.prContext = {
        url: prUrl,
        commit,
        content: diffContent,
        agentId: '', // Not used with Anthropic
        timestamp: Date.now(),
        conversationHistory: this.conversationHistory
      };

      // Cache the context
      await browser.storage.local.set({ [cacheKey]: this.prContext });
      console.log('[PR Context Assistant] PR context loaded and cached');
    } catch (error) {
      console.error('[PR Context Assistant] Failed to initialize:', error);
    }
  }

  private getCurrentCommit(): string {
    // Extract commit hash from GitHub PR page
    const commitElement = document.querySelector('[data-hovercard-type="commit"]');
    if (commitElement) {
      const href = commitElement.getAttribute('href');
      return href?.split('/').pop() || 'latest';
    }
    return 'latest';
  }

  private extractPRInfo(prUrl: string): { owner: string; repo: string; number: string } | null {
    // Extract owner, repo, and PR number from URL
    // https://github.com/owner/repo/pull/123
    const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!match) return null;

    return {
      owner: match[1],
      repo: match[2],
      number: match[3]
    };
  }



  private async getApiKey(): Promise<string | null> {
    const result = await browser.storage.sync.get('anthropicApiKey');
    return result.anthropicApiKey || null;
  }

  private setupSelectionListener() {
    console.log('[PR Context Assistant] Setting up selection listener');
    document.addEventListener('mouseup', async (event) => {
      console.log('[PR Context Assistant] Mouseup detected!');

      // Ignore if selection is inside the tooltip
      const target = event.target as HTMLElement;
      if (this.tooltip && this.tooltip.contains(target)) {
        console.log('[PR Context Assistant] Selection inside tooltip, ignoring');
        return;
      }

      // Small delay to ensure selection is complete
      setTimeout(async () => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        console.log('[PR Context Assistant] Selection:', { text: selectedText, length: selectedText?.length });

        if (!selectedText || selectedText.length < 5) {
          console.log('[PR Context Assistant] Selection too short, hiding tooltip');
          this.hideTooltip();
          return;
        }

        // Only trigger on code areas
        const isCode = this.isCodeArea(target);
        console.log('[PR Context Assistant] isCodeArea:', isCode, 'target:', target);
        if (!isCode) {
          this.hideTooltip();
          return;
        }

        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const position = {
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        };
        console.log('[PR Context Assistant] Showing explanation at', position);

        await this.showExplanation(selectedText, position);
      }, 10);
    });

    // Hide tooltip on click outside (not on scroll)
    document.addEventListener('mousedown', (event) => {
      const target = event.target as HTMLElement;
      if (this.tooltip && !this.tooltip.contains(target) && !this.isCodeArea(target)) {
        this.hideTooltip();
      }
    });
  }

  private isCodeArea(element: HTMLElement): boolean {
    // Check if selection is within code diff area
    const isCode = !!(
      element.closest('.blob-code') ||
      element.closest('.file') ||
      element.closest('.diff-view') ||
      element.closest('.blob-wrapper') ||
      element.closest('.diff-text-inner') ||
      element.closest('[data-code-marker]')
    );
    console.log('[PR Context Assistant] isCodeArea check:', {
      element: element.className,
      hasBlobCode: !!element.closest('.blob-code'),
      hasFile: !!element.closest('.file'),
      hasDiffView: !!element.closest('.diff-view'),
      hasBlobWrapper: !!element.closest('.blob-wrapper'),
      hasDiffTextInner: !!element.closest('.diff-text-inner'),
      result: isCode
    });
    return isCode;
  }

  private async showExplanation(selectedText: string, position: TooltipPosition) {
    if (!this.prContext) {
      this.showTooltip('⚠️ PR context not loaded. Please refresh the page.', position, true);
      return;
    }

    this.showTooltip('🤔 Analyzing...', position, false);

    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        this.showTooltip('⚠️ No API key configured. Go to extension options.', position, true);
        return;
      }

      const explanation = await this.queryAgent(selectedText, apiKey);
      this.showTooltip(explanation, position, true);
    } catch (error) {
      console.error('[PR Context Assistant] Query failed:', error);
      this.showTooltip('❌ Failed to get explanation. Try again.', position, true);
    }
  }

  private async queryAgent(selectedText: string, apiKey: string): Promise<string> {
    const queryPrompt = `Explain this code snippet:\n\n\`\`\`\n${selectedText}\n\`\`\`\n\nProvide a brief explanation (2-4 sentences) covering what it does and its role in this PR.`;

    console.log('[PR Context Assistant] Querying Claude');
    console.log('[PR Context Assistant] Current conversation history length:', this.conversationHistory.length);

    // Only keep first 2 messages (system prompt + assistant acknowledgment)
    // Always replace the user query (3rd message if it exists)
    const baseHistory = this.conversationHistory.slice(0, 2);
    const messages = [...baseHistory, { role: 'user' as const, content: queryPrompt }];

    console.log('[PR Context Assistant] Sending messages length:', messages.length);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: messages,
      }),
    });

    console.log('[PR Context Assistant] API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PR Context Assistant] API error:', response.status, errorText);
      throw new Error(`Claude API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[PR Context Assistant] Claude response received');

    const assistantMessage = data.content[0]?.text || 'No explanation available.';

    // Don't update conversation history - keep it at just the first 2 messages
    // Each new selection just replaces the query, doesn't append

    return assistantMessage;
  }

  private showTooltip(content: string, position: TooltipPosition, allowCopy: boolean) {
    this.hideTooltip();

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'pr-context-tooltip';
    this.tooltip.innerHTML = `
      <div class="pr-context-tooltip-content">${this.formatContent(content)}</div>
      ${allowCopy ? '<button class="pr-context-copy-btn" title="Copy">📋</button>' : ''}
      <button class="pr-context-close-btn" title="Close">✕</button>
    `;

    document.body.appendChild(this.tooltip);

    // Position tooltip
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let left = position.x - tooltipRect.width / 2;
    let top = position.y - tooltipRect.height;

    // Keep tooltip in viewport
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
      top = position.y + 20; // Show below selection if not enough space above
    }

    this.tooltip.style.left = `${left + window.scrollX}px`;
    this.tooltip.style.top = `${top + window.scrollY}px`;

    // Add event listeners
    const closeBtn = this.tooltip.querySelector('.pr-context-close-btn');
    closeBtn?.addEventListener('click', () => this.hideTooltip());

    if (allowCopy) {
      const copyBtn = this.tooltip.querySelector('.pr-context-copy-btn');
      copyBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(content);
        if (copyBtn) copyBtn.textContent = '✓';
        setTimeout(() => {
          if (copyBtn) copyBtn.textContent = '📋';
        }, 1000);
      });
    }
  }

  private formatContent(content: string): string {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  private hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PRContextAssistant());
} else {
  new PRContextAssistant();
}
