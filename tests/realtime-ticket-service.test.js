import test from 'node:test';
import assert from 'node:assert/strict';
import { createRealtimeTicketService } from '../server/realtime/RealtimeTicketService.js';

test('realtime ticket service only issues tickets for a character owned by the authenticated account', async () => {
  const lookups = [];
  const issued = [];
  const characterService = {
    async get(accountId, characterId) {
      lookups.push({ accountId, characterId });
      return accountId === 'account-1' && characterId === 'character-1'
        ? { id: 'character-1' }
        : null;
    },
  };
  const realtimeServer = {
    issueTicket(input) {
      issued.push(input);
      return 'ephemeral-one-use-ticket';
    },
  };
  const service = createRealtimeTicketService({ characterService, realtimeServer });

  const result = await service.issueForCharacter('account-1', 'character-1');
  assert.deepEqual(result, { ticket: 'ephemeral-one-use-ticket', expiresIn: 30 });
  assert.deepEqual(lookups, [{ accountId: 'account-1', characterId: 'character-1' }]);
  assert.deepEqual(issued, [{
    accountId: 'account-1',
    characterId: 'character-1',
    sessionId: 'astrea-prototype-lobby',
    playerId: 'character-1',
  }]);
});

test('realtime ticket service refuses another account character without issuing a ticket', async () => {
  let issueCount = 0;
  const service = createRealtimeTicketService({
    characterService: { async get() { return null; } },
    realtimeServer: { issueTicket() { issueCount += 1; return 'must-not-be-issued'; } },
  });
  await assert.rejects(
    service.issueForCharacter('account-attacker', 'character-victim'),
    error => error.code === 'CHARACTER_NOT_FOUND',
  );
  assert.equal(issueCount, 0);
});

test('realtime ticket service validates identity inputs and its session identifier', async () => {
  const deps = {
    characterService: { async get() { return { id: 'character-1' }; } },
    realtimeServer: { issueTicket() { return 'ticket'; } },
  };
  assert.throws(() => createRealtimeTicketService({ ...deps, sessionId: '' }), /session identifier/);
  const service = createRealtimeTicketService(deps);
  await assert.rejects(service.issueForCharacter('', 'character-1'), /Authenticated account/);
  await assert.rejects(service.issueForCharacter('account-1', ''), /Authenticated account/);
});
