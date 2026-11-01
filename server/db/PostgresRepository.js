export function createPostgresRepository(pool) {
  if (!pool || typeof pool.query !== 'function' || typeof pool.connect !== 'function') throw new TypeError('A PostgreSQL pool is required');
  return {
    async createAccount({ email, passwordHash, passwordSalt }) {
      const { rows } = await pool.query(
        'INSERT INTO accounts (email, password_hash, password_salt) VALUES ($1,$2,$3) RETURNING id,email',
        [email, passwordHash, passwordSalt],
      );
      return rows[0];
    },
    async findAccountByEmail(email) {
      const { rows } = await pool.query('SELECT id,email,password_hash AS "passwordHash",password_salt AS "passwordSalt" FROM accounts WHERE email=$1', [email]);
      return rows[0] || null;
    },
    async createSession({ accountId, tokenHash, expiresAt }) {
      await pool.query('INSERT INTO account_sessions (account_id,token_hash,expires_at) VALUES ($1,$2,$3)', [accountId, tokenHash, expiresAt]);
    },
    async findSession(tokenHash) {
      const { rows } = await pool.query('SELECT account_id AS "accountId",expires_at AS "expiresAt" FROM account_sessions WHERE token_hash=$1', [tokenHash]);
      return rows[0] || null;
    },
    async deleteSession(tokenHash) {
      await pool.query('DELETE FROM account_sessions WHERE token_hash=$1', [tokenHash]);
    },
    async withCharacterTransaction(accountId, characterId, callback) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          'SELECT id,account_id AS "accountId",weapon_progression AS "weaponProgression" FROM characters WHERE id=$1 AND account_id=$2 FOR UPDATE',
          [characterId, accountId],
        );
        if (!rows[0]) throw Object.assign(new Error('Personnage introuvable ou non autorisé'), { code: 'CHARACTER_NOT_FOUND' });
        const result = await callback(rows[0]);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async saveWeaponProgression(characterId, progression) {
      // Called only inside withCharacterTransaction; transaction-scoped client is supplied below instead.
      throw new Error('Use the transaction-bound progression writer');
    },
    async withCharacterProgressionTransaction(accountId, characterId, callback) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          'SELECT id,account_id AS "accountId",weapon_progression AS "weaponProgression" FROM characters WHERE id=$1 AND account_id=$2 FOR UPDATE',
          [characterId, accountId],
        );
        if (!rows[0]) throw Object.assign(new Error('Personnage introuvable ou non autorisé'), { code: 'CHARACTER_NOT_FOUND' });
        const character = rows[0];
        const result = await callback(character, async progression => {
          await client.query('UPDATE characters SET weapon_progression=$1::jsonb WHERE id=$2', [JSON.stringify(progression), characterId]);
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
