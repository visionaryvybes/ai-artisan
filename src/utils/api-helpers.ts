interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
  } = options;

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff if enabled
      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Operation failed after ${maxAttempts} attempts: ${lastError?.message}`);
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retryOptions?: RetryOptions }
): Promise<Response> {
  const { retryOptions, ...fetchOptions } = options || {};
  
  return retryOperation(
    async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    },
    retryOptions
  );
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      return true;
    }
    
    // Timeout errors
    if (error.message.includes('timeout')) {
      return true;
    }
    
    // Rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return true;
    }
  }
  
  return false;
} 