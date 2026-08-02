/**
 * AI prompts for Prologue
 * Edit these prompts to customize how Claude explains code
 */

/**
 * System prompt that gets sent with the full PR diff
 * This sets the context and behavior for all subsequent queries
 */
export function getSystemPrompt(diffContent: string): string {
  return `You help a developer understand selected code in this PR. Write tooltip-ready explanations: concise and easy to scan.

Here is the full PR diff:

${diffContent}

When explaining code:
- Explain what the code does in plain language
- Explain why it exists and how it supports this PR, when the diff provides context
- Use this format: "• Does: <what>" and "• Why: <reason>"
- Use one bullet when the reason is obvious; otherwise use both
- Keep each bullet under 20 words; no introduction, conclusion, or syntax walkthrough
- Mention a risk or edge case only when it helps explain the behavior`;
}

/**
 * Assistant's initial acknowledgment message
 */
export const ASSISTANT_ACKNOWLEDGMENT =
  "I've reviewed the PR diff and I'm ready to help explain code snippets. Please select any code you'd like me to explain.";

/**
 * Query prompt for single-line code selections
 */
export function getSingleLineQueryPrompt(selectedText: string): string {
  return `Explain this line:

\`\`\`
${selectedText}
\`\`\`

Explain what it does and why it matters to this PR. Use the tooltip format.`;
}

/**
 * Query prompt for multi-line code selections
 */
export function getMultiLineQueryPrompt(selectedText: string): string {
  return `Explain this code:

\`\`\`
${selectedText}
\`\`\`

Explain what it does and why it matters to this PR. Use the tooltip format.`;
}
