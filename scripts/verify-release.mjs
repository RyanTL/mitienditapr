#!/usr/bin/env node

const [, , rawBaseUrl] = process.argv;

if (!rawBaseUrl) {
  console.error("Usage: npm run verify:release -- <base-url>");
  process.exit(1);
}

let baseUrl;

try {
  baseUrl = new URL(rawBaseUrl);
} catch {
  console.error(`Invalid base URL: ${rawBaseUrl}`);
  process.exit(1);
}

const probes = [
  { path: "/api/healthz", expectedStatus: 200 },
  { path: "/api/readiness", expectedStatus: 200 },
];

async function probeEndpoint(path, expectedStatus) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    url: url.toString(),
    ok:
      response.status === expectedStatus &&
      payload !== null &&
      payload.ok === true,
    status: response.status,
    payload,
  };
}

const results = [];
let hasFailure = false;

for (const probe of probes) {
  try {
    const result = await probeEndpoint(probe.path, probe.expectedStatus);
    results.push(result);
    hasFailure ||= !result.ok;
  } catch (error) {
    hasFailure = true;
    results.push({
      url: new URL(probe.path, baseUrl).toString(),
      ok: false,
      status: null,
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.log(`Release verification for ${baseUrl.origin}`);

for (const result of results) {
  if (result.ok) {
    console.log(`PASS ${result.url} -> ${result.status}`);
    continue;
  }

  const detail =
    result.error ??
    `status=${result.status} payload=${JSON.stringify(result.payload)}`;
  console.error(`FAIL ${result.url} -> ${detail}`);
}

if (hasFailure) {
  process.exit(1);
}
