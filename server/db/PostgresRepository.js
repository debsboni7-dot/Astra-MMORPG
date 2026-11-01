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
    async createCharacter(accountId, displayName) {
      const { rows } = await pool.query(
        'INSERT INTO characters (account_id,display_name) VALUES ($1,$2) RETURNING id,display_name AS "displayName",created_at AS "createdAt"',
        [accountId, displayName],
      );
      return rows[0];
    },
    async listCharacters(accountId) {
      const { rows } = await pool.query(
        'SELECT id,display_name AS "displayName",created_at AS "createdAt" FROM characters WHERE account_id=$1 ORDER BY created_at,id',
        [accountId],
      );
      return rows;
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
          'SELECT id,account_id AS "accountId",weapon_progression AS "weaponProgression",magic_progression AS "magicProgression" FROM characters WHERE id=$1 AND account_id=$2 FOR UPDATE',
          [characterId, accountId],
        );
        if (!rows[0]) throw Object.assign(new Error('Personnage introuvable ou non autorisé'), { code: 'CHARACTER_NOT_FOUND' });
        const character = rows[0];
        const saveProgression = async (progression, kind = 'weapon') => {
          const column = kind === 'magic' ? 'magic_progression' : kind === 'weapon' ? 'weapon_progression' : null;
          if (!column) throw new TypeError('Unknown progression storage kind');
          await client.query(`UPDATE characters SET ${column}=$1::jsonb WHERE id=$2`, [JSON.stringify(progression), characterId]);
        };
        const result = await callback(character, saveProgression);
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
