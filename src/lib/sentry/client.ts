import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry() {
  if (initialized) return;

  initialized = true;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,

    beforeSend(event) {
      // Filter localhost noise
      if (
        event.exception?.values?.[0]?.value?.includes?.(
          "ResizeObserver loop limit exceeded"
        )
      ) {
        return null;
      }
      return event;
    },
  });
}