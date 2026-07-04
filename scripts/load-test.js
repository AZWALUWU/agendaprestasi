// k6 load test — jalankan: k6 run scripts/load-test.js
// Install k6: https://k6.io/docs/get-started/installation/

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5173";

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
  const res = http.get(`${BASE_URL}/api/posts`);

  check(res, {
    "status 200": (r) => r.status === 200,
    "no cache miss": (r) => r.headers["X-Cache"] !== "MISS",
    "under 1s": (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
