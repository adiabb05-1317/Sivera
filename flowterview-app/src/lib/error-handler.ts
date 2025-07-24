export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

export class AppErrorHandler {
  static createError(
    error: unknown,
    context?: string,
    retryable = false
  ): AppError {
    const timestamp = new Date();
    
    if (error instanceof Error) {
      return {
        message: error.message,
        code: (error as any).code,
        statusCode: (error as any).statusCode,
        details: { context, originalError: error.stack },
        timestamp,
        retryable,
      };
    }

    if (typeof error === "string") {
      return {
        message: error,
        details: { context },
        timestamp,
        retryable,
      };
    }

    return {
      message: "An unknown error occurred",
      details: { context, originalError: error },
      timestamp,
      retryable,
    };
  }

  static isNetworkError(error: AppError): boolean {
    return (
      error.statusCode === 0 ||
      error.message.includes("fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("Failed to fetch")
    );
  }

  static isRetryableError(error: AppError): boolean {
    return (
      error.retryable ||
      this.isNetworkError(error) ||
      (error.statusCode !== undefined && 
       error.statusCode >= 500 && 
       error.statusCode < 600) ||
      error.statusCode === 429 // Rate limited
    );
  }

  static getRetryDelay(attempt: number): number {
    // Exponential backoff with jitter: 1s, 2s, 4s, 8s...
    const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
    const jitter = Math.random() * 1000;
    return baseDelay + jitter;
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    context?: string
  ): Promise<T> {
    let lastError: AppError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.createError(error, context, true);

        if (attempt === maxRetries || !this.isRetryableError(lastError)) {
          throw lastError;
        }

        const delay = this.getRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// Toast notification helper for errors
export const handleErrorWithToast = (
  error: AppError | unknown,
  toast: (options: { title: string; description: string; variant?: string }) => void,
  context?: string
) => {
  const appError = error instanceof Error || typeof error === 'object' && error !== null && 'message' in error
    ? error as AppError
    : AppErrorHandler.createError(error, context);

  const isRetryable = AppErrorHandler.isRetryableError(appError);
  
  toast({
    title: "Error",
    description: `${appError.message}${isRetryable ? " (This operation can be retried)" : ""}`,
    variant: "destructive",
  });

  // Log error for debugging
  console.error("Application Error:", {
    ...appError,
    context,
    isRetryable,
  });
};