import browser from 'webextension-polyfill';
import type { PRContext, TooltipPosition, ConversationMessage } from './types';
import { TIMING, UI, GITHUB_SELECTORS, API, MESSAGES, STORAGE_KEYS, LOG_PREFIX } from './constants';
import { getSystemPrompt, ASSISTANT_ACKNOWLEDGMENT, getSingleLineQueryPrompt, getMultiLineQueryPrompt } from './prompts';

type AIProvider = 'anthropic' | 'openai';

interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
}

class PRContextAssistant {
  private tooltip: HTMLElement | null = null;
  private prContext: PRContext | null = null;
  private conversationHistory: ConversationMessage[] = [];
  private queryTimeout: NodeJS.Timeout | null = null;
  private activeAbortController: AbortController | null = null;

  constructor() {
    this.init();
    this.setupNavigationListener();
  }

  private async init() {
    await this.loadPRContext();
    this.setupSelectionListener();
    console.log(`${LOG_PREFIX} Initialized`);
  }

  private setupNavigationListener() {
    // Listen for URL changes (GitHub uses pushState for navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        console.log(`${LOG_PREFIX} URL changed from`, lastUrl, 'to', url);
        lastUrl = url;

        // Check if we're still on a PR page
        if (this.extractPRInfo(url)) {
          console.log(`${LOG_PREFIX} Navigated to different PR, reloading context`);
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
      console.log(`${LOG_PREFIX} Loaded from cache`);
      return;
    }

    if (!await this.getAIProviderConfig()) {
      return;
    }

    try {
      // Extract PR info to get diff URL
      const prInfo = this.extractPRInfo(prUrl);
      if (!prInfo) {
        console.error('[Prologue] Could not extract PR info');
        return;
      }

      // Get GitHub token if available (for private repos)
      const githubToken = await this.getGithubToken();

      // Try to fetch diff - use GitHub API for private repos, patch-diff for public
      let diffContent: string;

      if (githubToken) {
        // Use GitHub API for authenticated requests (works for private repos)
        const apiUrl = `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/pulls/${prInfo.number}`;
        console.log('[Prologue] Fetching PR via GitHub API:', apiUrl);

        const apiResponse = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3.diff',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });

        console.log('[Prologue] GitHub API response status:', apiResponse.status, apiResponse.statusText);

        if (!apiResponse.ok) {
          const responseText = await apiResponse.text();
          console.error('[Prologue] GitHub API fetch failed:', {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            responseBody: responseText.substring(0, 500)
          });
          throw new Error(`Failed to fetch diff via GitHub API (${apiResponse.status}): ${apiResponse.statusText || 'Check token permissions'}`);
        }

        diffContent = await apiResponse.text();
        console.log('[Prologue] Diff fetched via GitHub API, length:', diffContent.length);
      } else {
        // Use patch-diff service for public repos (no auth needed)
        const diffUrl = `https://patch-diff.githubusercontent.com/raw/${prInfo.owner}/${prInfo.repo}/pull/${prInfo.number}.diff`;
        console.log('[Prologue] Fetching diff from patch-diff:', diffUrl);

        const diffResponse = await fetch(diffUrl);
        console.log('[Prologue] Patch-diff response status:', diffResponse.status, diffResponse.statusText);

        if (!diffResponse.ok) {
          const responseText = await diffResponse.text();
          console.error('[Prologue] Patch-diff fetch failed:', {
            status: diffResponse.status,
            statusText: diffResponse.statusText,
            responseBody: responseText.substring(0, 500)
          });

          if (diffResponse.status === 404) {
            throw new Error('Failed to fetch diff: Repository may be private. Please add a GitHub token in extension options.');
          }
          throw new Error(`Failed to fetch diff (${diffResponse.status}): ${diffResponse.statusText || 'Unknown error'}`);
        }

        diffContent = await diffResponse.text();
        console.log('[Prologue] Diff fetched from patch-diff, length:', diffContent.length);
      }

      // Initialize conversation with Claude
      this.conversationHistory = [
        { role: 'user', content: getSystemPrompt(diffContent) },
        { role: 'assistant', content: ASSISTANT_ACKNOWLEDGMENT }
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
      console.log('[Prologue] PR context loaded and cached');
    } catch (error) {
      console.error('[Prologue] Failed to initialize:', error);
    }
  }

  private getCurrentCommit(): string {
    // Extract commit hash from GitHub PR page
    const commitElement = document.querySelector(GITHUB_SELECTORS.COMMIT_ELEMENT);
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



  private async getAIProviderConfig(): Promise<AIProviderConfig | null> {
    const result = await browser.storage.sync.get([
      STORAGE_KEYS.ANTHROPIC_API_KEY,
      STORAGE_KEYS.OPENAI_API_KEY,
    ]);

    const anthropicApiKey = result[STORAGE_KEYS.ANTHROPIC_API_KEY] as string | undefined;
    if (anthropicApiKey) {
      return { provider: 'anthropic', apiKey: anthropicApiKey };
    }

    const openaiApiKey = result[STORAGE_KEYS.OPENAI_API_KEY] as string | undefined;
    if (openaiApiKey) {
      return { provider: 'openai', apiKey: openaiApiKey };
    }

    return null;
  }

  private async getGithubToken(): Promise<string | null> {
    const result = await browser.storage.sync.get(STORAGE_KEYS.GITHUB_TOKEN);
    return result[STORAGE_KEYS.GITHUB_TOKEN] || null;
  }

  private setupSelectionListener() {
    console.log(`${LOG_PREFIX} Setting up selection listener`);
    document.addEventListener('mouseup', async (event) => {
      // Ignore if selection is inside the tooltip
      const target = event.target as HTMLElement;
      if (this.tooltip && this.tooltip.contains(target)) {
        return;
      }

      // Small delay to ensure selection is complete
      setTimeout(async () => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (!selectedText || selectedText.length < UI.MIN_SELECTION_LENGTH) {
          this.hideTooltip();
          return;
        }

        // Only trigger on code areas
        const isCode = this.isCodeArea(target);
        if (!isCode) {
          this.hideTooltip();
          return;
        }

        // Position tooltip at mouse cursor location
        const position = {
          x: event.clientX + window.scrollX,
          y: event.clientY + window.scrollY,
        };

        // Clear any existing query timeout
        if (this.queryTimeout) {
          clearTimeout(this.queryTimeout);
          this.queryTimeout = null;
        }

        // Check if context is loaded
        if (!this.prContext) {
          this.showTooltip(MESSAGES.ERRORS.PR_CONTEXT_NOT_LOADED, position, true);
          return;
        }

        // Wait before showing tooltip and sending query (debounce for multi-clicks)
        this.queryTimeout = setTimeout(async () => {
          this.showTooltip(MESSAGES.LOADING.THINKING, position, false);
          await this.sendExplanationQuery(selectedText, position);
        }, TIMING.SELECTION_DEBOUNCE);
      }, TIMING.SELECTION_DELAY);
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
    return GITHUB_SELECTORS.CODE_AREAS.some(selector =>
      element.closest(selector)
    );
  }

  private async sendExplanationQuery(selectedText: string, position: TooltipPosition) {
    // Cancel any previous ongoing API call
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    // Create new abort controller for this request
    this.activeAbortController = new AbortController();
    const signal = this.activeAbortController.signal;

    try {
      const providerConfig = await this.getAIProviderConfig();
      if (!providerConfig) {
        this.showTooltip(MESSAGES.ERRORS.NO_API_KEY, position, true);
        return;
      }

      let streamedExplanation = '';
      const explanation = await this.queryAgent(selectedText, providerConfig, signal, (textDelta) => {
        streamedExplanation += textDelta;
        if (!signal.aborted) {
          this.updateTooltipContent(streamedExplanation, false);
        }
      });

      if (!signal.aborted) {
        this.updateTooltipContent(explanation || streamedExplanation, true);
      }
    } catch (error: any) {
      // Don't show error if request was intentionally aborted
      if (error.name === 'AbortError') {
        return;
      }
      console.error(`${LOG_PREFIX} Query failed:`, error);
      this.showTooltip(MESSAGES.ERRORS.QUERY_FAILED, position, true);
    } finally {
      // Clean up abort controller if it's still the active one
      if (this.activeAbortController?.signal === signal) {
        this.activeAbortController = null;
      }
    }
  }

  private async queryAgent(
    selectedText: string,
    providerConfig: AIProviderConfig,
    signal: AbortSignal,
    onTextDelta: (text: string) => void,
  ): Promise<string> {
    // Count lines in selection
    const lineCount = selectedText.split('\n').length;
    const isSingleLine = lineCount === 1;

    // Get appropriate prompt based on selection size
    const queryPrompt = isSingleLine
      ? getSingleLineQueryPrompt(selectedText)
      : getMultiLineQueryPrompt(selectedText);

    // Only keep first 2 messages (system prompt + assistant acknowledgment)
    // Always replace the user query (3rd message if it exists)
    const baseHistory = this.conversationHistory.slice(0, 2);
    const messages = [...baseHistory, { role: 'user' as const, content: queryPrompt }];

    if (providerConfig.provider === 'openai') {
      return this.queryOpenAI(messages, providerConfig.apiKey, signal, onTextDelta);
    }

    return this.queryAnthropic(messages, providerConfig.apiKey, signal, onTextDelta);
  }

  private async queryAnthropic(
    messages: ConversationMessage[],
    apiKey: string,
    signal: AbortSignal,
    onTextDelta: (text: string) => void,
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': API.ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: API.CLAUDE_MODEL,
        max_tokens: API.MAX_TOKENS,
        messages,
        stream: true,
      }),
      signal: signal, // Add abort signal to fetch
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${LOG_PREFIX} API error:`, response.status, errorText);
      throw new Error(`Claude API failed: ${response.status} ${response.statusText}`);
    }

    let explanation = '';
    await this.consumeEventStream(response, (eventData) => {
      const event = JSON.parse(eventData);
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const text = event.delta.text || '';
        explanation += text;
        onTextDelta(text);
      }
    });

    return explanation || 'No explanation available.';
  }

  private async queryOpenAI(
    messages: ConversationMessage[],
    apiKey: string,
    signal: AbortSignal,
    onTextDelta: (text: string) => void,
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: API.OPENAI_MODEL,
        max_tokens: API.MAX_TOKENS,
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${LOG_PREFIX} OpenAI API error:`, response.status, errorText);
      throw new Error(`OpenAI API failed: ${response.status} ${response.statusText}`);
    }

    let explanation = '';
    await this.consumeEventStream(response, (eventData) => {
      if (eventData === '[DONE]') {
        return;
      }

      const event = JSON.parse(eventData);
      const text = event.choices[0]?.delta?.content || '';
      explanation += text;
      onTextDelta(text);
    });

    return explanation || 'No explanation available.';
  }

  private async consumeEventStream(response: Response, onEvent: (eventData: string) => void): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('API response did not include a readable stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const consumeBufferedEvents = (isComplete: boolean = false) => {
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = isComplete ? '' : events.pop() || '';

      for (const event of events) {
        const eventData = event
          .split(/\r?\n/)
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice('data:'.length).trimStart())
          .join('\n');

        if (eventData) {
          onEvent(eventData);
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      consumeBufferedEvents(done);

      if (done) {
        return;
      }
    }
  }

  private showTooltip(content: string, position: TooltipPosition, allowCopy: boolean) {
    this.hideTooltip();

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'pr-context-tooltip';

    // Apply glow effect for loading state
    const isLoading = content === MESSAGES.LOADING.THINKING;
    const formattedContent = isLoading
      ? `<span class="pr-context-tooltip-loading" data-text="${content}" style="--glow-duration: ${UI.GLOW_ANIMATION_DURATION}s">${content}</span>`
      : this.formatContent(content);

    this.tooltip.innerHTML = `
      <div class="pr-context-tooltip-content">${formattedContent}</div>
      ${allowCopy ? '<button class="pr-context-copy-btn" title="Copy">📋</button>' : ''}
      <button class="pr-context-close-btn" title="Close">✕</button>
    `;

    document.body.appendChild(this.tooltip);

    // Position tooltip - always below cursor
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let left = position.x - tooltipRect.width / 2;
    let top = position.y + UI.TOOLTIP_OFFSET_Y; // Show below cursor

    // Always add the below class for arrow direction
    this.tooltip.classList.add('pr-context-tooltip-below');

    // Keep tooltip horizontally in viewport
    const padding = UI.TOOLTIP_PADDING;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;

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
        }, TIMING.COPY_FEEDBACK_DURATION);
      });
    }
  }

  private updateTooltipContent(content: string, allowCopy: boolean) {
    if (!this.tooltip) {
      return;
    }

    const contentElement = this.tooltip.querySelector('.pr-context-tooltip-content');
    if (contentElement) {
      contentElement.innerHTML = this.formatContent(content);
    }

    const copyButton = this.tooltip.querySelector('.pr-context-copy-btn');
    if (allowCopy && !copyButton) {
      const newCopyButton = document.createElement('button');
      newCopyButton.className = 'pr-context-copy-btn';
      newCopyButton.title = 'Copy';
      newCopyButton.textContent = '📋';
      newCopyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(content);
        newCopyButton.textContent = '✓';
        setTimeout(() => {
          newCopyButton.textContent = '📋';
        }, TIMING.COPY_FEEDBACK_DURATION);
      });
      this.tooltip.querySelector('.pr-context-close-btn')?.before(newCopyButton);
    } else if (!allowCopy && copyButton) {
      copyButton.remove();
    }
  }

  private formatContent(content: string): string {
    // Convert markdown formatting and preserve bullet points
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/```[\s\S]*?```/g, (match) => {
        // Multi-line code blocks - preserve as-is but escape HTML
        const code = match.slice(3, -3).trim();
        return `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
      })
      .replace(/`([^`]*?)`/g, '<code>$1</code>') // Inline code (single backticks) - use *? for non-greedy
      .replace(/^- /gm, '• ') // Convert dashes to bullets
      .replace(/^\* /gm, '• ') // Convert asterisks to bullets
      .replace(/\n/g, '<br>'); // Line breaks
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
