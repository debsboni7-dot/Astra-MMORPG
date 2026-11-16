import test from 'node:test';
import assert from 'node:assert/strict';
import { createAstreaHttpServer } from '../server/http/createAstreaHttpServer.js';

const token = 't'.repeat(48);

async function withServer(run, serverOptions = {}) {
  const calls = [];
  const server = createAstreaHttpServer({
    authService: {
      async register(input) { calls.push({ action:'register', input }); return { id:'account-1', email:input.email }; },
      async login(input) { calls.push({ action:'login', input }); return { token, account:{id:'account-1',email:input.email}, expiresIn:3600 }; },
      async authenticate(value) { calls.push({ action:'authenticate', value }); return value === token ? { id:'account-1' } : null; },
      async logout(value) { calls.push({ action:'logout', value }); },
    },
    characterService: {
      async list(accountId) { calls.push({ action:'list', accountId }); return [{id:'char-1',displayName:'Ari',race:'human'}]; },
      async create(accountId, displayName, race) { calls.push({ action:'create', accountId, displayName, race }); return {id:'char-2',displayName,race}; },
    },
    progressionService: { async getSnapshot() { return {}; } },
    ...serverOptions,
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base, calls); }
  finally { await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
}

test('registration and login forward only the submitted credentials and return the API contract', async () => {
  await withServer(async (base,calls) => {
    const registered = await fetch(base+'/v1/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'a@example.com',password:'long-password-123'})});
    assert.equal(registered.status,201);
    assert.deepEqual(await registered.json(),{account:{id:'account-1',email:'a@example.com'}});
    const loggedIn = await fetch(base+'/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'a@example.com',password:'long-password-123'})});
    assert.equal(loggedIn.status,200);
    assert.equal((await loggedIn.json()).token,token);
    assert.deepEqual(calls.filter(x=>x.action==='register'||x.action==='login').map(x=>x.action),['register','login']);
  });
});

test('character routes require a valid bearer token and derive account ownership from the session', async () => {
  await withServer(async (base,calls) => {
    const denied=await fetch(base+'/v1/characters');
    assert.equal(denied.status,401);
    const listed=await fetch(base+'/v1/characters',{headers:{authorization:'Bearer '+token}});
    assert.equal(listed.status,200);
    assert.equal((await listed.json()).characters[0].id,'char-1');
    const created=await fetch(base+'/v1/characters',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({displayName:'Nova',race:'elf',accountId:'attacker'})});
    assert.equal(created.status,201);
    assert.deepEqual(calls.find(x=>x.action==='create'),{action:'create',accountId:'account-1',displayName:'Nova',race:'elf'});
  });
});

test('logout revokes the bearer token through the auth service', async () => {
  await withServer(async (base,calls) => {
    const response=await fetch(base+'/v1/auth/logout',{method:'POST',headers:{authorization:'Bearer '+token}});
    assert.equal(response.status,204);
    assert.ok(calls.some(x=>x.action==='logout'&&x.value===token));
  });
});

test('HTTP API rejects malformed JSON and oversized request bodies', async () => {
  await withServer(async (base) => {
    const malformed=await fetch(base+'/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:'{'});
    assert.equal(malformed.status,400);
    assert.deepEqual(await malformed.json(),{error:'BAD_REQUEST'});
    const oversized=await fetch(base+'/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({padding:'x'.repeat(17*1024)})});
    assert.equal(oversized.status,413);
    assert.deepEqual(await oversized.json(),{error:'REQUEST_TOO_LARGE'});
  });
});


test('registration and login have independent per-IP rate-limit buckets', async () => {
  await withServer(async (base) => {
    const post = (path) => fetch(base + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'long-password-123' }),
    });

    const login = await post('/v1/auth/login');
    const register = await post('/v1/auth/register');
    assert.equal(login.status, 200);
    assert.equal(register.status, 201);

    const limitedLogin = await post('/v1/auth/login');
    const limitedRegister = await post('/v1/auth/register');
    for (const response of [limitedLogin, limitedRegister]) {
      assert.equal(response.status, 429);
      assert.equal((await response.json()).error, 'RATE_LIMITED');
      assert.ok(Number(response.headers.get('retry-after')) >= 1);
    }
  }, { authRateLimitLimit: 1, authRateLimitWindowMs: 60_000 });
});

test('rate-limit settings reject zero, negative and non-integer values', async () => {
  const services = {
    authService: {}, characterService: {}, progressionService: {},
  };
  for (const options of [
    { authRateLimitLimit: 0 },
    { authRateLimitLimit: -1 },
    { authRateLimitLimit: 1.5 },
    { authRateLimitWindowMs: 0 },
    { authRateLimitWindowMs: -10 },
    { authRateLimitWindowMs: 2.5 },
  ]) {
    assert.throws(() => createAstreaHttpServer({ ...services, ...options }), /positive integers/);
  }
});


test('untrusted X-Forwarded-For headers cannot bypass the local auth limiter', async () => {
  await withServer(async (base) => {
    const post = (forwardedFor) => fetch(base + '/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': forwardedFor },
      body: JSON.stringify({ email: 'a@example.com', password: 'long-password-123' }),
    });
    assert.equal((await post('198.51.100.10')).status, 200);
    const second = await post('203.0.113.77');
    assert.equal(second.status, 429);
  }, { authRateLimitLimit: 1, authRateLimitWindowMs: 60_000 });
});


test('unexpected service failures return 500 without leaking internal details', async () => {
  await withServer(async (base) => {
    const response = await fetch(base + '/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'long-password-123' }),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'INTERNAL_SERVER_ERROR' });
  }, {
    authService: {
      async register() { throw new Error('database password and host must never leak'); },
      async login() { throw new Error('database password and host must never leak'); },
      async authenticate() { return null; },
      async logout() {},
    },
  });
});

test('invalid service input remains a 400 client error', async () => {
  await withServer(async (base) => {
    const response = await fetch(base + '/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: 'short' }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'BAD_REQUEST' });
  }, {
    authService: {
      async register() { throw new TypeError('invalid user input'); },
      async login() { throw new TypeError('invalid user input'); },
      async authenticate() { return null; },
      async logout() {},
    },
  });
});
