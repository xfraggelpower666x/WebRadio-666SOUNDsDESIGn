const memoryJobs = new Map();

export function createLocalJob(payload) {
  const id = "suno-local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const job = {
    id,
    status: "queued",
    provider: "local-adapter-placeholder",
    payload,
    createdAt: new Date().toISOString(),
    result: null
  };
  memoryJobs.set(id, job);
  return job;
}

export function getJob(id) {
  return memoryJobs.get(id) || null;
}

export function listJobs() {
  return Array.from(memoryJobs.values()).slice(-50);
}

export function completePlaceholder(id) {
  const job = memoryJobs.get(id);
  if (!job) return null;
  job.status = "done";
  job.result = {
    tracks: [],
    note: "Placeholder mode. Connect real Suno/Zuno provider in src/suno-adapter.js."
  };
  return job;
}
