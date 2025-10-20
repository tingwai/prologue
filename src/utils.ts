/**
 * Utility functions for the extension
 */

import { UI } from './constants';
import { LOG_PREFIX } from './constants';

/**
 * Masks a sensitive string by showing only the prefix and suffix
 * @param value The string to mask
 * @param prefixLength Number of characters to show at the start
 * @param suffixLength Number of characters to show at the end
 * @returns The masked string
 */
export function maskSensitiveString(
  value: string,
  prefixLength: number,
  suffixLength: number
): string {
  if (value.length <= prefixLength + suffixLength) {
    return value;
  }
  return `${value.substring(0, prefixLength)}...${value.substring(value.length - suffixLength)}`;
}

/**
 * Masks an API key for display
 * @param apiKey The API key to mask
 * @returns The masked API key
 */
export function maskApiKey(apiKey: string): string {
  return maskSensitiveString(
    apiKey,
    UI.API_KEY_DISPLAY_PREFIX,
    UI.API_KEY_DISPLAY_SUFFIX
  );
}

/**
 * Masks a GitHub token for display
 * @param token The GitHub token to mask
 * @returns The masked token
 */
export function maskGithubToken(token: string): string {
  return maskSensitiveString(
    token,
    UI.GITHUB_TOKEN_DISPLAY_PREFIX,
    UI.GITHUB_TOKEN_DISPLAY_SUFFIX
  );
}

/**
 * Interface for GitHub token information
 */
export interface GitHubTokenInfo {
  valid: boolean;
  expiresAt?: string; // ISO date string
  scopes?: string[];
  error?: string;
}

/**
 * Checks GitHub token validity and expiration
 * @param token The GitHub personal access token
 * @returns Token information including validity and expiration
 */
export async function checkGitHubToken(token: string): Promise<GitHubTokenInfo> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Invalid token (${response.status})`
      };
    }

    // Check for token expiration in headers (for fine-grained tokens)
    const expiresAt = response.headers.get('github-authentication-token-expiration');
    const scopes = response.headers.get('x-oauth-scopes')?.split(', ').filter(Boolean);

    return {
      valid: true,
      expiresAt: expiresAt || undefined,
      scopes
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to check GitHub token:`, error);
    return {
      valid: false,
      error: 'Failed to validate token'
    };
  }
}
