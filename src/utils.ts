/**
 * Utility functions for the extension
 */

import { UI } from './constants';

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
