import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry() {
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn("Sentry DSN missing");
    return;
  }

  initialized = true;

  Sentry.init({
    dsn,

    environment: import.meta.env.MODE,

    integrations: [
      Sentry.browserTracingIntegration(),

      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    tracesSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_SAMPLE_RATE ?? "0"
    ),

    replaysSessionSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE ?? "0"
    ),

    replaysOnErrorSampleRate: 1.0,

    sendDefaultPii: false,

    beforeSend(event) {
      // Ignore noisy browser errors
      if (
        event.exception?.values?.[0]?.value?.includes?.(
          "ResizeObserver loop limit exceeded"
        )
      ) {
        return null;
      }

      // Browser-only
      if (typeof window !== "undefined") {
        try {
          const posthog = window.posthog;

          if (posthog) {
            const sessionId =
              posthog.get_session_id?.();

            if (sessionId) {
              event.tags = {
                ...event.tags,
                posthog_session_id: sessionId,
              };
            }

            const distinctId =
              posthog.get_distinct_id?.();

            if (distinctId) {
              event.user = {
                id: distinctId,
              };
            }
          }
        } catch (err) {
          console.error(
            "Failed attaching PostHog context",
            err
          );
        }
      }

      return event;
    },
  });

  console.log("Sentry Initialized");
}