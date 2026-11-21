import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_ZONE_BODY_BYTES = 300 * 1024;
function send(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extraHeaders });
  response.end(status === 204 ? undefined : JSON.stringify(body));
}
async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > maxBytes) throw Object.assign(new Error('Corps de requête trop volumineux'), { status: 413 });
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(new Error('JSON invalide'), { status: 400 }); }
}
function bearer(request) {
  const value = request.headers.authorization || '';
  const match = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(value);
  return match?.[1] || null;
}

export function createAstreaHttpServer({ authService, characterService, progressionService, magicProgressionService = null, magicCombatService = null, realtimeTicketService = null, fishNetJoinTicketService = null, zonePersistenceService = null, realtimeServerSecret = null, realtimeServerId = null, authRateLimitLimit = 10, authRateLimitWindowMs = 60_000 }) {
  if (!authService || !characterService || !progressionService) throw new TypeError('Auth, character and progression services are required');
  if (!Number.isInteger(authRateLimitLimit) || authRateLimitLimit < 1 || !Number.isInteger(authRateLimitWindowMs) || authRateLimitWindowMs < 1) throw new TypeError('Auth rate-limit settings must be positive integers');
  const authRateBuckets = new Map();
  function authRateLimit(request, route) {
    const now = Date.now();
    const key = `${request.socket.remoteAddress || 'unknown'}:${route}`;
    let bucket = authRateBuckets.get(key);
    if (!bucket || now - bucket.startedAt >= authRateLimitWindowMs) bucket = { startedAt: now, count: 0 };
    bucket.count += 1;
    authRateBuckets.delete(key);
    authRateBuckets.set(key, bucket);
    if (authRateBuckets.size > 5000) authRateBuckets.delete(authRateBuckets.keys().next().value);
    return bucket.count > authRateLimitLimit ? Math.max(1, Math.ceil((bucket.startedAt + authRateLimitWindowMs - now) / 1000)) : 0;
  }
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'POST' && (url.pathname === '/v1/auth/register' || url.pathname === '/v1/auth/login' || url.pathname === '/v1/realtime/fishnet/tickets')) {
        const retryAfter = authRateLimit(request, url.pathname);
        if (retryAfter) return send(response, 429, { error: 'RATE_LIMITED' }, { 'retry-after': String(retryAfter) });
      }
      if (request.method === 'POST' && url.pathname === '/v1/auth/register') {
        const account = await authService.register(await readJson(request));
        return send(response, 201, { account });
      }
      if (request.method === 'POST' && url.pathname === '/v1/auth/login') {
        const session = await authService.login(await readJson(request));
        return send(response, 200, session);
      }
      if (request.method === 'POST' && url.pathname === '/v1/realtime/fishnet/tickets') {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        if (!fishNetJoinTicketService) return send(response, 503, { error: 'REALTIME_UNAVAILABLE' });
        const body = await readJson(request);
        if (typeof body.characterId !== 'string' || body.characterId.length < 1 || body.characterId.length > 128) {
          throw new TypeError('Invalid characterId');
        }
        const ticket = await fishNetJoinTicketService.issueForCharacter(account.id, body.characterId);
        return send(response, 201, ticket);
      }
      if (request.method === 'POST' && url.pathname === '/v1/internal/realtime/fishnet/consume') {
        const supplied = request.headers['x-astrea-server-key'];
        if (typeof realtimeServerSecret !== 'string' || realtimeServerSecret.length < 32
          || typeof supplied !== 'string'
          || Buffer.byteLength(supplied) !== Buffer.byteLength(realtimeServerSecret)
          || !timingSafeEqual(Buffer.from(supplied), Buffer.from(realtimeServerSecret))) {
          return send(response, 401, { error: 'UNAUTHENTICATED' });
        }
        if (!fishNetJoinTicketService) return send(response, 503, { error: 'REALTIME_UNAVAILABLE' });
        const body = await readJson(request);
        if (typeof body.ticket !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.ticket)
          || typeof body.serverId !== 'string' || body.serverId.length < 1 || body.serverId.length > 96) {
          throw new TypeError('Invalid ticket or serverId');
        }
        const identity = await fishNetJoinTicketService.consume(body.ticket, body.serverId);
        if (!identity) return send(response, 401, { error: 'INVALID_OR_EXPIRED_TICKET' });
        return send(response, 200, { identity });
      }
      const internalZoneMatch = /^\\/v1\\/internal\\/zones\\/([^/]+)\\/(lease\\/acquire|lease\\/renew|events|snapshots|recovery)$/.exec(url.pathname);
      if (internalZoneMatch) {
        if (request.method !== 'POST') return send(response, 405, { error: 'METHOD_NOT_ALLOWED' });
        const supplied = request.headers['x-astrea-server-key'];
        if (typeof realtimeServerSecret !== 'string' || realtimeServerSecret.length < 32
          || typeof supplied !== 'string'
          || Buffer.byteLength(supplied) !== Buffer.byteLength(realtimeServerSecret)
          || !timingSafeEqual(Buffer.from(supplied), Buffer.from(realtimeServerSecret))) {
          return send(response, 401, { error: 'UNAUTHENTICATED' });
        }
        if (!zonePersistenceService) return send(response, 503, { error: 'ZONE_PERSISTENCE_UNAVAILABLE' });
        const zoneId = decodeURIComponent(internalZoneMatch[1]);
        if (typeof realtimeServerId !== 'string' || !realtimeServerId || zoneId !== realtimeServerId) {
          return send(response, 403, { error: 'ZONE_NOT_AUTHORIZED' });
        }
        const body = await readJson(request, MAX_ZONE_BODY_BYTES);
        const operation = internalZoneMatch[2];
        if (operation === 'lease/acquire') {
          const lease = await zonePersistenceService.acquireLease({ ...body, zoneId });
          return lease
            ? send(response, 201, { lease })
            : send(response, 409, { error: 'ZONE_ALREADY_LEASED' });
        }
        if (operation === 'lease/renew') {
          const lease = await zonePersistenceService.renewLease({ ...body, zoneId });
          return lease
            ? send(response, 200, { lease })
            : send(response, 409, { error: 'ZONE_LEASE_LOST' });
        }
        if (operation === 'events') {
          const result = await zonePersistenceService.appendEvent({ ...body, zoneId });
          return send(response, result.duplicate ? 200 : 201, result);
        }
        if (operation === 'snapshots') {
          return send(response, 201, await zonePersistenceService.saveSnapshot({ ...body, zoneId }));
        }
        if (operation === 'recovery') {
          return send(response, 200, await zonePersistenceService.loadRecoveryState({ ...body, zoneId }));
        }
      }
      if (request.method === 'POST' && url.pathname === '/v1/realtime/tickets') {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        if (!realtimeTicketService) return send(response, 503, { error: 'REALTIME_UNAVAILABLE' });
        const body = await readJson(request);
        if (typeof body.characterId !== 'string' || body.characterId.length < 1 || body.characterId.length > 128) {
          throw new TypeError('Invalid characterId');
        }
        const ticket = await realtimeTicketService.issueForCharacter(account.id, body.characterId);
        return send(response, 201, ticket);
      }
      if (request.method === 'GET' && url.pathname === '/v1/characters') {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        return send(response, 200, { characters: await characterService.list(account.id) });
      }
      if (request.method === 'POST' && url.pathname === '/v1/characters') {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        const body = await readJson(request);
        const character = await characterService.create(account.id, body.displayName, body.race || 'human');
        return send(response, 201, { character });
      }
      if (request.method === 'POST' && url.pathname === '/v1/auth/logout') {
        await authService.logout(bearer(request));
        return send(response, 204, {});
      }
      const pathSegments = url.pathname.split('/');
      const isMagicCombatSnapshot = pathSegments[1] === 'v1' && pathSegments[2] === 'characters' &&
        pathSegments.length === 6 && pathSegments[4] === 'combat' && pathSegments[5] === 'magic';
      const isMagicCombatCast = pathSegments[1] === 'v1' && pathSegments[2] === 'characters' &&
        pathSegments.length === 7 && pathSegments[4] === 'combat' && pathSegments[5] === 'magic' && pathSegments[6] === 'cast';
      const isMagicSnapshot = pathSegments[1] === 'v1' && pathSegments[2] === 'characters' &&
        pathSegments.length === 6 && pathSegments[4] === 'progression' && pathSegments[5] === 'magic';
      const isMagicSchool = pathSegments[1] === 'v1' && pathSegments[2] === 'characters' &&
        pathSegments.length === 7 && pathSegments[4] === 'progression' && pathSegments[5] === 'magic' &&
        pathSegments[6] !== 'unlock';
      const isMagicEquip = pathSegments[1] === 'v1' && pathSegments[2] === 'characters' &&
        pathSegments.length === 7 && pathSegments[4] === 'progression' && pathSegments[5] === 'magic' &&
        pathSegments[6] === 'equip';
      if (magicCombatService && request.method === 'GET' && isMagicCombatSnapshot) {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        const characterId = decodeURIComponent(pathSegments[3]);
        return send(response, 200, await magicCombatService.getSnapshot(account.id, characterId));
      }
      if (magicCombatService && request.method === 'POST' && isMagicCombatCast) {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        const characterId = decodeURIComponent(pathSegments[3]);
        const body = await readJson(request);
        const result = await magicCombatService.castSpell({ accountId:account.id, characterId, school:body.school, targetId:body.targetId || null, requestId:body.requestId });
        return send(response, result.cast?.executed ? 200 : 409, result);
      }
      if (magicProgressionService && request.method === 'GET' && isMagicSnapshot) {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        const characterId = decodeURIComponent(pathSegments[3]);
        return send(response, 200, await magicProgressionService.getSnapshot(account.id, characterId));
      }
      if (magicProgressionService && request.method === 'GET' && isMagicSchool) {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        const characterId = decodeURIComponent(pathSegments[3]);
        const school = decodeURIComponent(pathSegments[6]);
        return send(response, 200, await magicProgressionService.getTree(account.id, characterId, school));
      }
      if (magicProgressionService && request.method === 'POST' && isMagicEquip) {
        const account = await authService.authenticate(bearer(request));
        if (!account) return send(response, 401, { error: 'UNAUTHENTICATED' });
        const characterId = decodeURIComponent(pathSegments[3]);
        const body = await readJson(request);
        const result = await magicProgressionService.equipTechnique({
          accountId: account.id, characterId, school: body.school, skillId: body.skillId,
          slotType: body.slotType, slotIndex: body.slotIndex,
        });
        return send(response, result.equipped ? 200 : 409, result);
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
      if (error.code === 'REALTIME_CAPACITY') return send(response, 503, { error: 'REALTIME_CAPACITY' });
      if (error.code === 'ZONE_LEASE_LOST') return send(response, 409, { error: 'ZONE_LEASE_LOST' });
      if (error.code === 'ZONE_STATE_NOT_FOUND') return send(response, 404, { error: 'ZONE_STATE_NOT_FOUND' });
      if (error.code === 'IDEMPOTENCY_CONFLICT') return send(response, 409, { error: 'IDEMPOTENCY_CONFLICT' });
      if (error.code === 'SNAPSHOT_NOT_ADVANCED') return send(response, 409, { error: 'SNAPSHOT_NOT_ADVANCED' });
      if (error.code === 'INVALID_ZONE_INPUT') return send(response, 400, { error: 'BAD_REQUEST' });
      if (error.status === 413) return send(response, 413, { error: 'REQUEST_TOO_LARGE' });
      if (error.status === 400 || error instanceof TypeError) return send(response, 400, { error: 'BAD_REQUEST' });
      // Do not misreport database/service outages as client errors or leak internals.
      return send(response, 500, { error: 'INTERNAL_SERVER_ERROR' });
    }
  });
}
