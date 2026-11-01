import { createAuthService } from './auth/AuthService.js';
import { createPostgresRepository } from './db/PostgresRepository.js';
import { createWeaponProgressionService } from './progression/WeaponProgressionService.js';
import { createMagicProgressionService } from './progression/MagicProgressionService.js';
import { createCharacterService } from './characters/CharacterService.js';
import { createAstreaHttpServer } from './http/createAstreaHttpServer.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const { Pool } = await import('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_SIZE || 10), ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined });
const repository = createPostgresRepository(pool);
const authService = createAuthService(repository);
const progressionService = createWeaponProgressionService(repository);
const magicProgressionService = createMagicProgressionService(repository);
const characterService = createCharacterService(repository);
const server = createAstreaHttpServer({ authService, characterService, progressionService, magicProgressionService });
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => process.stdout.write(`ASTREA API listening on :${port}\n`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(async () => { await pool.end(); process.exit(0); }));
}
