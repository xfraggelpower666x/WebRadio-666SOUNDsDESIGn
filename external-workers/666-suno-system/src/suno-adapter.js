import { createLocalJob } from "./jobs.js";

export async function createSunoJob(payload, env) {
  if (!env.SUNO_API_KEY || !env.SUNO_API_BASE_URL) {
    return {
      ok: true,
      mode: "placeholder",
      job: createLocalJob(payload),
      warning: "SUNO_API_KEY or SUNO_API_BASE_URL missing. Placeholder job created."
    };
  }

  // Provider-specific implementation belongs here.
  // Do not hardcode unofficial API assumptions in frontend or player worker.
  return {
    ok: false,
    error: "provider_not_implemented",
    provider: env.SUNO_API_PROVIDER || "unknown"
  };
}
