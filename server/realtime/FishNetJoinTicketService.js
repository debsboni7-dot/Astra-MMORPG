import { createHash, randomBytes } from 'node:crypto';

const TICKET_TTL_SECONDS = 30;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function hashTicket(ticket) {
  return createHash('sha256').update(ticket, 'utf8').digest('hex');
}

export function createFishNetJoinTicketService({
  characterService,
  repository,
  serverId = 'astrea-prototype-zone-01',
  now = Date.now,
}) {
  if (typeof characterService?.get !== 'function'
    || typeof repository?.createRealtimeJoinTicket !== 'function'
    || typeof repository?.consumeRealtimeJoinTicket !== 'function') {
    throw new TypeError('Character service and durable realtime ticket repository are required');
  }
  if (typeof serverId !== 'string' || !/^[a-zA-Z0-9._:-]{1,96}$/.test(serverId)) {
    throw new TypeError('A valid realtime server identifier is required');
  }

  async function issueForCharacter(accountId, characterId) {
    if (!accountId || typeof characterId !== 'string' || characterId.length < 1 || characterId.length > 128) {
      throw new TypeError('Authenticated account and character are required');
    }
    const character = await characterService.get(accountId, characterId);
    if (!character) {
      throw Object.assign(new Error('Personnage introuvable ou non autorisé'), { code: 'CHARACTER_NOT_FOUND' });
    }

    const ticket = randomBytes(32).toString('base64url');
    await repository.createRealtimeJoinTicket({
      tokenHash: hashTicket(ticket),
      accountId: String(accountId),
      characterId: String(character.id),
      serverId,
      expiresAt: new Date(now() + TICKET_TTL_SECONDS * 1000),
    });
    return { ticket, expiresIn: TICKET_TTL_SECONDS };
  }

  async function consume(ticket, expectedServerId = serverId) {
    if (typeof ticket !== 'string' || !TOKEN_PATTERN.test(ticket)
      || expectedServerId !== serverId) return null;
    return repository.consumeRealtimeJoinTicket(hashTicket(ticket), serverId);
  }

  return Object.freeze({ issueForCharacter, consume, serverId });
}
