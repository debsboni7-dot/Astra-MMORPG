import test from 'node:test';
import assert from 'node:assert/strict';
import { createAstreaHttpServer } from '../server/http/createAstreaHttpServer.js';

const token = 't'.repeat(48);

async function withServer(run) {
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
    assert.deepEqual(await oversized.json(),{error:'Corps de requête trop volumineux'});
  });
});
