// Only import Sentry when actually running on server
let Sentry: typeof import("@sentry/nextjs") | null = null;

export async function register() {
  // Only run on server runtime
  if (typeof window === "undefined") {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  }
}

// Dynamically import and use Sentry's error handler only on server
export const onRequestError =
  typeof window === "undefined"
    ? async (error: unknown, request: any, context?: any) => {
        const { captureRequestError } = await import("@sentry/nextjs");
        return captureRequestError(error, request, context);
      }
    : undefined;
