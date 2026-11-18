import { verifyAdminAuth, verifyPwIssuedToken } from './radio-admin-config-addon.js';

const prefix = '/api/admin/govee/';
const routes = new Map([
  ['devices', 'GET'],
  ['state', 'POST'],
  ['control', 'POST'],
  ['groups/control', 'POST'],
  ['audio', 'POST'],
  ['audio/preview', 'POST']
]);

function reply(error, status) {
  return Response.json({ ok: false, error }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function handleGoveeAdmin(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(prefix)) return null;
  const action = url.pathname.slice(prefix.length);
  const method = routes.get(action);
  if (!method) return reply('govee_route_not_found', 404);
  if (request.method !== method) return reply('method_not_allowed', 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return reply('origin_not_allowed', 403);

  try {
    const auth = verifyPwIssuedToken(await verifyAdminAuth(request, env));
    if (!auth.ok) return reply('govee_admin_required', 403);
    if (!env.GOVEE_CONTROL_WORKER) {
      return reply('govee_service_unconfigured', 503);
    }

    const target = new URL('/api/' + action, 'https://govee.internal');
    if (action === 'devices' && url.searchParams.has('area')) {
      target.searchParams.set('area', url.searchParams.get('area'));
    }
    const headers = new Headers();
    if (method === 'POST') {
      if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
        return reply('json_required', 415);
      }
      headers.set('content-type', 'application/json');
    }
    const upstream = await env.GOVEE_CONTROL_WORKER.fetch(new Request(target, {
      method, headers, redirect: 'manual', ...(method === 'POST' ? { body: request.body, duplex: 'half' } : {})
    }));
    const responseHeaders = new Headers({ 'cache-control': 'no-store', 'content-type': 'application/json', 'x-content-type-options': 'nosniff' });
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) responseHeaders.set('retry-after', retryAfter);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return reply('govee_service_unavailable', 502);
  }
}
