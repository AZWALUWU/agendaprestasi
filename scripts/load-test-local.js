// k6 load test — lokal: npm run build && npx wrangler dev
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8787";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // Test homepage — SSR + Supabase query, tanpa KV (gratis di lokal)
  const res = http.get(`${BASE_URL}/`);

  check(res, {
    "status 200": (r) => r.status === 200,
    "under 1s": (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
