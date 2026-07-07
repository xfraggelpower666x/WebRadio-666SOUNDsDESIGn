const PREFIX = "suno-job:";

export async function saveJob(env, job) {
  if (!(env.SUNO_JOBS_KV && typeof env.SUNO_JOBS_KV.put === "function")) return false;
  await env.SUNO_JOBS_KV.put(`${PREFIX}${job.id}`, JSON.stringify(job), { expirationTtl: 60 * 60 * 24 * 7 });
  return true;
}

export async function getJob(env, id) {
  if (!(env.SUNO_JOBS_KV && typeof env.SUNO_JOBS_KV.get === "function")) return null;
  return env.SUNO_JOBS_KV.get(`${PREFIX}${id}`, { type: "json" });
}

export async function listJobs(env, limit = 50) {
  if (!(env.SUNO_JOBS_KV && typeof env.SUNO_JOBS_KV.list === "function")) return null;
  const result = await env.SUNO_JOBS_KV.list({ prefix: PREFIX, limit: Math.max(1, Math.min(100, limit)) });
  const jobs = [];
  for (const key of result.keys || []) {
    const job = await env.SUNO_JOBS_KV.get(key.name, { type: "json" });
    if (job) jobs.push(job);
  }
  return jobs.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}
