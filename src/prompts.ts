/**
 * AI prompts for the PR Context Assistant
 * Edit these prompts to customize how Claude explains code
 */

/**
 * System prompt that gets sent with the full PR diff
 * This sets the context and behavior for all subsequent queries
 */
export function getSystemPrompt(diffContent: string): string {
  return `You are a code review assistant. Focus on being insightful, not verbose.

Here is the full PR diff:

${diffContent}

When explaining code:
- Skip obvious things (e.g., "this creates a variable", "this is a function")
- Focus on non-obvious behavior, edge cases, gotchas, or clever patterns
- Explain WHY code exists in this PR, not just WHAT it does
- If code is straightforward, say so briefly
- Be concise: 1-3 bullet points max
- Only explain things worth mentioning`;
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

Be insightful, not verbose. Skip obvious details. Focus on:
- Non-obvious behavior or gotchas
- Why this change in the PR
- If straightforward, just say "Straightforward: [brief]"

1-3 bullet points max using • or -.`;
}

/**
 * Query prompt for multi-line code selections
 */
export function getMultiLineQueryPrompt(selectedText: string): string {
  return `Explain this code:

\`\`\`
${selectedText}
\`\`\`

Be insightful, not verbose. Skip obvious details. Focus on:
- Non-obvious patterns, edge cases, or gotchas
- Why these changes in the PR
- If straightforward, just say "Straightforward: [brief]"

1-3 bullet points max using • or -.`;
}
