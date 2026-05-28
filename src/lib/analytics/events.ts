import { posthog } from "@/lib/posthog/client";

type AnalyticsProperties = Record<string, unknown>;

export function track(
  event: string,
  properties?: AnalyticsProperties
) {
  try {
    posthog.capture(event, properties);
  } catch (err) {
    console.error("Analytics error:", err);
  }
}