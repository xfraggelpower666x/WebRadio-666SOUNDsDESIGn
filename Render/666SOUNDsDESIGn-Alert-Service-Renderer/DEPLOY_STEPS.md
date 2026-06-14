# Deploy Steps

## Render backend
1. Create a new Render web service from this folder.
2. Use build command: `pip install -r requirements.txt`
3. Use start command: `gunicorn src.server:app`
4. Set env vars from `.env.example`.
5. Test `/health`.
6. Test `/analyze` and `/master` with a real audio file.

## Cloudflare Worker bridge
1. Open `worker-bridge/`.
2. Set `MASTERING_BACKEND_URL` in `wrangler.toml`.
3. Add secrets:
   - `ADMIN_PASSWORD`
   - `MASTERING_BACKEND_TOKEN`
   - `OPENAI_API_KEY`
4. Deploy with `wrangler deploy`.
