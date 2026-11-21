const baseUrl = (process.env.ASTREA_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const runId = process.env.GITHUB_RUN_ID || String(Date.now());
const attempt = process.env.GITHUB_RUN_ATTEMPT || '1';
const runnerTemp = process.env.RUNNER_TEMP;

if (!runnerTemp) throw new Error('RUNNER_TEMP is required for this CI-only ticket preparation script');

async function post(path, body, token = null, expectedStatus = 200) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const response = await fetch(baseUrl + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (response.status !== expectedStatus) {
    throw new Error(`ASTREA API ${path} returned HTTP ${response.status}; expected ${expectedStatus}`);
  }
  return response.status === 204 ? null : response.json();
}

const outputs = [];
for (const clientId of [1, 2]) {
  const email = `fishnet-ci-${runId}-${attempt}-${clientId}@astrea.test`;
  const password = `ASTREA-FishNet-CI-${runId}-${attempt}-${clientId}-Secure!`;

  await post('/v1/auth/register', { email, password }, null, 201);
  const login = await post('/v1/auth/login', { email, password }, null, 200);
  const created = await post('/v1/characters', {
    displayName: `FishNetTest${clientId}`,
    race: 'human',
  }, login.token, 201);
  const ticket = await post('/v1/realtime/fishnet/tickets', {
    characterId: created.character.id,
  }, login.token, 201);

  if (typeof ticket.ticket !== 'string' || ticket.expiresIn !== 30)
    throw new Error('ASTREA FishNet ticket contract mismatch');

  outputs.push({ clientId, ticket: ticket.ticket });
}

const { writeFile } = await import('node:fs/promises');
const { join } = await import('node:path');
for (const output of outputs) {
  await writeFile(join(runnerTemp, `astrea-fishnet-ticket-${output.clientId}`), output.ticket + '\\n', { mode: 0o600 });
}
process.stdout.write('Prepared two isolated ASTREA accounts, characters and short-lived FishNet tickets in private runner files.\\n');
