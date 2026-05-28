import * as Sentry from "@sentry/react";

export function captureReactQueryError(error: unknown) {
  Sentry.captureException(error);
}