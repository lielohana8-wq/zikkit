/**
 * Generate a unique portal token for client-facing links
 * Format: {bizId-prefix}_{type}_{id}_{random}
 */
export function generatePortalToken(type: 'job' | 'quote', id: number): string {
  const random = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  return `${type}_${id}_${random}`;
}

/**
 * Parse a portal token to extract type and id
 */
export function parsePortalToken(token: string): { type: 'job' | 'quote'; id: number } | null {
  const parts = token.split('_');
  if (parts.length < 3) return null;
  const type = parts[0] as 'job' | 'quote';
  const id = parseInt(parts[1]);
  if ((type !== 'job' && type !== 'quote') || isNaN(id)) return null;
  return { type, id };
}

/**
 * Get the full portal URL
 */
export function getPortalUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/portal/${token}`;
  }
  return `/portal/${token}`;
}
