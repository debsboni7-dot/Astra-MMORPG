const TICKET_TTL_SECONDS = 30;
export function createRealtimeTicketService({ characterService, realtimeServer, sessionId = 'astrea-prototype-lobby' }) {
  if (typeof characterService?.get !== 'function' || typeof realtimeServer?.issueTicket !== 'function') {
    throw new TypeError('Character lookup and realtime ticket issuer are required');
  }
  if (typeof sessionId !== 'string' || sessionId.length < 1 || sessionId.length > 128) {
    throw new TypeError('A valid realtime session identifier is required');
  }
  async function issueForCharacter(accountId, characterId) {
    if (!accountId || typeof characterId !== 'string' || characterId.length < 1 || characterId.length > 128) {
      throw new TypeError('Authenticated account and character are required');
    }
    const character = await characterService.get(accountId, characterId);
    if (!character) throw Object.assign(new Error('Personnage introuvable ou non autorisé'), { code: 'CHARACTER_NOT_FOUND' });
    const ticket = realtimeServer.issueTicket({
      accountId: String(accountId),
      characterId: String(character.id),
      sessionId,
      playerId: String(character.id),
    });
    return { ticket, expiresIn: TICKET_TTL_SECONDS };
  }
  return Object.freeze({ issueForCharacter });
}
