import { createAuthService } from './auth/AuthService.js';
import { createPostgresRepository } from './db/PostgresRepository.js';
import { createWeaponProgressionService } from './progression/WeaponProgressionService.js';
import { createMagicProgressionService } from './progression/MagicProgressionService.js';
import { createMagicCombatService } from './combat/MagicCombatService.js';
import { createCharacterService } from './characters/CharacterService.js';
import { createAstreaHttpServer } from './http/createAstreaHttpServer.js';
import { createNodeWebSocketPrototypeServer } from './realtime/NodeWebSocketPrototypeServer.js';
import { createRealtimeTicketService } from './realtime/RealtimeTicketService.js';
import { createFishNetJoinTicketService } from './realtime/FishNetJoinTicketService.js';
import { createZonePersistenceService } from './realtime/ZonePersistenceService.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const { Pool } = await import('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_SIZE || 10), ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined });
const repository = createPostgresRepository(pool);
const authService = createAuthService(repository);
const progressionService = createWeaponProgressionService(repository);
const magicProgressionService = createMagicProgressionService(repository);
const magicCombatService = createMagicCombatService(repository);
const characterService = createCharacterService(repository);
const realtimeServer = createNodeWebSocketPrototypeServer();
const realtimeTicketService = createRealtimeTicketService({ characterService, realtimeServer });
const realtimeServerId = process.env.REALTIME_SERVER_ID || 'astrea-prototype-zone-01';
const fishNetJoinTicketService = createFishNetJoinTicketService({ characterService, repository, serverId: realtimeServerId });
const zonePersistenceService = createZonePersistenceService(repository);
const server = createAstreaHttpServer({ authService, characterService, progressionService, magicProgressionService, magicCombatService, realtimeTicketService, fishNetJoinTicketService, zonePersistenceService, realtimeServerSecret: process.env.REALTIME_SERVER_SECRET || null, realtimeServerId });
realtimeServer.attachTo(server);
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => process.stdout.write(`ASTREA API listening on :${port}\n`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    realtimeServer.destroyConnections();
    server.close(async () => { await pool.end(); process.exit(0); });
  });
}
