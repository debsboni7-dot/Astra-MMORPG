import { createServer } from 'node:http';

const MAX_BODY_BYTES = 16 * 1024;
function send(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(body));
}
async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw Object.assign(new Error('Corps de requête trop volumineux'), { status: 413 });
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error('JSON invalide'), { status: 400 }); }
}
function bearer(request) {
  const value = request.headers.authorization || '';
  const match = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(value);
  return match?.[1] || null;
}

export function createAstreaHttpServer({ authService, progressionService }) {
  if (!authService || !progressionService) throw new TypeError('Auth and progression services are required');
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'POST' && url.pathname === '/v1/auth/register') {
        const account = await authService.register(await readJson(request));
        return send(response, 201, { account });
      }
      if (request.method === 'POST' && url.pathname === '/v1/auth/login') {
        const session = await authService.login(await readJson(request));
        return send(response, 200, session);
      }
      if (request.method === 'POST' && url.pathname === '/v1/auth/logout') {
        await authService.logout(bearer(request));
        return send(response, 204, {});
      }
      if (request.method === 'GET' && /^\/v1\/characters\/[^/]+\/progression\/weapons$/.test(url.pathname)) {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        const characterId = decodeURIComponent(url.pathname.split('/')[3]);
        const snapshot = await progressionService.getSnapshot(account.id, characterId);
        return send(response, 200, snapshot);
      }
      return send(response, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      if (error.code === 'CHARACTER_NOT_FOUND') return send(response, 404, { error: 'CHARACTER_NOT_FOUND' });
      if (error.code === 'INVALID_CREDENTIALS') return send(response, 401, { error: 'INVALID_CREDENTIALS' });
      if (error.code === 'ACCOUNT_EXISTS') return send(response, 409, { error: 'ACCOUNT_EXISTS' });
      return send(response, error.status || 400, { error: error.status ? error.message : 'BAD_REQUEST' });
    }
  });
}
