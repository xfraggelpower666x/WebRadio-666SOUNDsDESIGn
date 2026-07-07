PLAYER_STRUCTURE_AWARENESS = {
    "ok": True,
    "aware_paths": [
        "CHAOS_ENGINE/",
        "external-workers/666-chaos-ai-track-system/",
        "external-workers/666-suno-system/",
        "config/radio-runtime.json",
        "worker-addons/radio-admin-config-addon.js",
        "worker-addons/chaos-engine-api-addon.js"
    ],
    "rules": [
        "preserve nested directories",
        "do not flatten external-workers",
        "do not merge external workers into audio worker root",
        "no secrets in repo"
    ]
}
