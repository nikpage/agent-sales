// agent/retryPolicy.ts

const MAX_ATTEMPTS = 5;
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

function isTransientError(error: any): boolean {
  // HTTP status codes
  const status = error?.status || error?.code || error?.response?.status;
  if (status === 429) return true; // Rate limit
  if (status >= 500 && status < 600) return true; // Server errors

  // Network errors
  const code = error?.code || error?.cause?.code;
  if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN'].includes(code)) {
    return true;
  }

  // Google API errors
  const message = error?.message || '';
  if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
    return true;
  }
  if (message.includes('500') || message.includes('503') || message.includes('unavailable')) {
    return true;
  }

  return false;
}

function getRetryAfterMs(error: any): number | null {
  // Check for Retry-After header
  const retryAfter = error?.response?.headers?.['retry-after'] || error?.headers?.['retry-after'];
  if (!retryAfter) return null;

  // Retry-After can be seconds (number) or HTTP date
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as date
  const date = Date.parse(retryAfter);
  if (!isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return null;
}

function calculateDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
  const exponentialDelay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, MAX_DELAY_MS);
  
  // Add jitter: ±25%
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string = 'operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (!isTransientError(error)) {
        throw error;
      }

      if (attempt === MAX_ATTEMPTS) {
        console.error(`[${label}] All ${MAX_ATTEMPTS} attempts failed`);
        throw error;
      }

      // Determine delay
      const retryAfterMs = getRetryAfterMs(error);
      const delay = retryAfterMs !== null 
        ? Math.min(retryAfterMs, MAX_DELAY_MS) 
        : calculateDelay(attempt);

      console.warn(`[${label}] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

export { withRetry as retry };
