import browser from 'webextension-polyfill';
import type { PRContext, TooltipPosition } from './types';

class PRContextAssistant {
  private tooltip: HTMLElement | null = null;
  private prContext: PRContext | null = null;
  private isLoading = false;

  constructor() {
    this.init();
  }

  private async init() {
    await this.loadPRContext();
    this.setupSelectionListener();
    console.log('[PR Context Assistant] Initialized');
  }

  private async loadPRContext() {
    const prUrl = window.location.href;
    const commit = this.getCurrentCommit();
    const cacheKey = `${prUrl}:${commit}`;

    // Check cache first
    const cached = await browser.storage.local.get(cacheKey);
    if (cached[cacheKey]) {
      this.prContext = cached[cacheKey];
      console.log('[PR Context Assistant] Loaded from cache');
      return;
    }

    // Fetch PR content and send to AI
    const prContent = this.extractPRContent();
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      console.warn('[PR Context Assistant] No API key set. Please configure in extension options.');
      return;
    }

    try {
      const agentId = await this.initializeAgent(prContent, prUrl, apiKey);
      this.prContext = {
        url: prUrl,
        commit,
        content: prContent,
        agentId,
        timestamp: Date.now(),
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

  private extractPRContent(): string {
    // Extract PR title, description, and diff content
    const title = document.querySelector('.js-issue-title')?.textContent?.trim() || '';
    const description = document.querySelector('.comment-body')?.textContent?.trim() || '';
    
    // Get all file diffs
    const diffContainers = document.querySelectorAll('.file');
    let diffContent = '';
    
    diffContainers.forEach((container) => {
      const fileName = container.querySelector('.file-info a')?.textContent?.trim() || '';
      const diffLines = container.querySelectorAll('.blob-code');
      const fileContent = Array.from(diffLines)
        .map((line) => line.textContent?.trim())
        .join('\n');
      
      diffContent += `\n\n### File: ${fileName}\n${fileContent}`;
    });

    return `# PR: ${title}\n\n## Description\n${description}\n\n## Changes\n${diffContent}`;
  }

  private async initializeAgent(prContent: string, repoUrl: string, apiKey: string): Promise<string> {
    const prompt = `You are a code review assistant. You have been given the full context of a GitHub Pull Request. Your job is to provide concise, helpful explanations when asked about specific code selections.

Here is the full PR content:

${prContent}

When asked about specific code snippets, explain:
1. What the code does technically
2. How it fits into the changes in this PR
3. Any potential concerns or notable patterns

Keep responses brief and focused. This is a quick reference tool for reviewers.`;

    const createAgentBody = {
      repoUrl: this.extractRepoUrl(repoUrl),
      name: `pr-context-${Date.now()}`,
      prompt,
      agent: "continuedev/default-background-agent",
      idempotencyKey: `${repoUrl}-${Date.now()}`,
    };

    const response = await fetch("https://api.continue.dev/agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(createAgentBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  private extractRepoUrl(prUrl: string): string {
    // Convert PR URL to repo URL
    // https://github.com/owner/repo/pull/123 -> https://github.com/owner/repo
    const match = prUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    return match ? `${match[0]}` : prUrl;
  }

  private async getApiKey(): Promise<string | null> {
    const result = await browser.storage.sync.get('continueApiKey');
    return result.continueApiKey || null;
  }

  private setupSelectionListener() {
    document.addEventListener('mouseup', async (event) => {
      // Small delay to ensure selection is complete
      setTimeout(async () => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (!selectedText || selectedText.length < 5) {
          this.hideTooltip();
          return;
        }

        // Only trigger on code areas
        const target = event.target as HTMLElement;
        if (!this.isCodeArea(target)) {
          this.hideTooltip();
          return;
        }

        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const position = {
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        };

        await this.showExplanation(selectedText, position);
      }, 10);
    });

    // Hide tooltip on scroll or click outside
    document.addEventListener('scroll', () => this.hideTooltip(), true);
    document.addEventListener('mousedown', (event) => {
      if (this.tooltip && !this.tooltip.contains(event.target as Node)) {
        this.hideTooltip();
      }
    });
  }

  private isCodeArea(element: HTMLElement): boolean {
    // Check if selection is within code diff area
    return !!(
      element.closest('.blob-code') ||
      element.closest('.file') ||
      element.closest('.diff-view')
    );
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
    const queryPrompt = `Explain this code snippet concisely:\n\n\`\`\`\n${selectedText}\n\`\`\`\n\nProvide a brief explanation covering what it does and its role in this PR.`;

    // Query the existing agent
    const response = await fetch(`https://api.continue.dev/agents/${this.prContext!.agentId}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: queryPrompt }),
    });

    if (!response.ok) {
      throw new Error(`Agent query failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || data.answer || 'No explanation available.';
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
