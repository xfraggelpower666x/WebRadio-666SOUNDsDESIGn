const base = String(process.env.BASE_URL || process.argv[2] || "").replace(/\/$/, "");
if (!base) throw new Error("BASE_URL or URL argument required");
async function json(path, init) {
  const response = await fetch(base + path, { cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}
const checks = [];
for (const path of ["/health", "/api/player-alert/status", "/api/discord/status", "/api/runtime-config/status"]) {
  const result = await json(path);
  checks.push({ path, status: result.response.status, ok: result.response.ok && result.data.ok === true, data: result.data });
}
const alert = checks.find(item => item.path === "/api/player-alert/status");
const health = checks.find(item => item.path === "/health");
const releaseReady = Boolean(alert?.data?.backendConfigured && alert?.data?.rateIdentity === "server-assisted-sha256");
const ok = checks.every(item => item.ok) && releaseReady;
console.log(JSON.stringify({ ok, base, releaseReady, checks }, null, 2));
if (!ok) process.exitCode = 1;
