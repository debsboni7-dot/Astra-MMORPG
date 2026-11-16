import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPostgresRepository } from '../server/db/PostgresRepository.js';
import { createAuthService } from '../server/auth/AuthService.js';
import { createCharacterService } from '../server/characters/CharacterService.js';

const databaseUrl = process.env.DATABASE_URL;

test('real PostgreSQL migrations, account ownership and character persistence', { skip: !databaseUrl }, async () => {
  const { Pool } = await import('pg');
  let pool = new Pool({ connectionString: databaseUrl });
  let email;
  try {
    for (const file of [
      '000_accounts_and_sessions.sql',
      '001_character_weapon_progression.sql',
      '002_character_magic_progression.sql',
      '003_character_magic_combat_state.sql',
    ]) {
      await pool.query(await readFile(new URL(`../server/migrations/${file}`, import.meta.url), 'utf8'));
    }

    const repository = createPostgresRepository(pool);
    const auth = createAuthService(repository);
    const characters = createCharacterService(repository);
    email = `integration-${crypto.randomUUID()}@astrea.test`;
    const account = await auth.register({ email, password: 'integration-password-123' });
    const session = await auth.login({ email, password: 'integration-password-123' });
    assert.equal((await auth.authenticate(session.token)).id, String(account.id));

    const character = await characters.create(account.id, 'IntegrationHero', 'elf');
    assert.equal(character.race, 'elf');
    assert.equal((await characters.list(account.id)).length, 1);
    assert.equal((await characters.list('999999999')).length, 0);

    await repository.withCharacterTransaction(account.id, character.id, async (record, saveProgression, saveCombatState) => {
      assert.equal(record.characterData.race, 'elf');
      await saveProgression({ schemaVersion: 1, schools: { nature: { successfulCasts: 3 } } }, 'magic');
      await saveCombatState({ schemaVersion: 1, hp: 87, mana: 64 });
    });

    const saved = await repository.withCharacterTransaction(account.id, character.id, async record => ({
      race: record.characterData.race,
      progression: record.magicProgression,
      combat: record.magicCombatState,
    }));
    assert.equal(saved.race, 'elf');
    assert.equal(saved.progression.schools.nature.successfulCasts, 3);
    assert.equal(saved.combat.hp, 87);
    assert.equal(saved.combat.mana, 64);

    await assert.rejects(repository.withCharacterTransaction(account.id, character.id, async (_record, saveProgression) => {
      await saveProgression({ schemaVersion: 1, schools: { nature: { successfulCasts: 999 } } }, 'magic');
      throw new Error('force rollback');
    }), /force rollback/);

    const afterRollback = await repository.withCharacterTransaction(account.id, character.id, async record => record.magicProgression);
    assert.equal(afterRollback.schools.nature.successfulCasts, 3);

    await auth.logout(session.token);
    assert.equal(await auth.authenticate(session.token), null);

    // Recreate the database connection pool to prove committed data survives
    // a backend connection restart, not just reads through the original pool.
    await pool.end();
    pool = new Pool({ connectionString: databaseUrl });
    const reconnectedRepository = createPostgresRepository(pool);
    const afterReconnect = await reconnectedRepository.withCharacterTransaction(account.id, character.id, async record => ({
      race: record.characterData.race,
      progression: record.magicProgression,
      combat: record.magicCombatState,
    }));
    assert.equal(afterReconnect.race, 'elf');
    assert.equal(afterReconnect.progression.schools.nature.successfulCasts, 3);
    assert.equal(afterReconnect.combat.hp, 87);
    assert.equal(afterReconnect.combat.mana, 64);
  } finally {
    if (email) await pool.query('DELETE FROM accounts WHERE email=$1', [email]);
    await pool.end();
  }
});
