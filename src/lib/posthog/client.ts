import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (typeof window === "undefined") return;

  if (initialized) return;

  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

  if (!key || !host) {
    console.warn("PostHog env missing");
    return;
  }

  posthog.init(key, {
    api_host: host,

    capture_pageview: false,

    capture_pageleave: true,

    autocapture: true,

    person_profiles: "identified_only",

    persistence: "localStorage+cookie",

    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
    },

    loaded: (posthogInstance) => {
      if (import.meta.env.DEV) {
        posthogInstance.debug();
      }

      console.log("PostHog Loaded");
    },
  });

  initialized = true;

  console.log("PostHog Initialized");
}

export { posthog };