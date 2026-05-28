import * as Sentry from "@sentry/react";

export function captureError(
  error: unknown,
  context?: Record<string, unknown>
) {
  console.error(error);

  Sentry.captureException(error, {
    extra: context,
  });
}