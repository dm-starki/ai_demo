import type { Pool } from 'pg';
import type { UserPublic, UserRole } from '../types.js';

export const findUserByEmail = async (pool: Pool, email: string) => {
  const r = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
  }>(`SELECT id, email, password_hash, role FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
  return r.rows[0] ?? null;
};

export const findUserById = async (pool: Pool, id: string) => {
  const r = await pool.query<UserPublic>(
    `SELECT id, email, role FROM users WHERE id = $1`,
    [id],
  );
  return r.rows[0] ?? null;
};

export const listUsers = async (pool: Pool) => {
  const r = await pool.query<UserPublic>(
    `SELECT id, email, role FROM users ORDER BY email`,
  );
  return r.rows;
};

export const insertUser = async (
  pool: Pool,
  input: { email: string; passwordHash: string; role: UserRole },
) => {
  const r = await pool.query<UserPublic>(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
     RETURNING id, email, role`,
    [input.email, input.passwordHash, input.role],
  );
  return r.rows[0];
};

export const updateUser = async (
  pool: Pool,
  id: string,
  patch: { email?: string; passwordHash?: string; role?: UserRole },
) => {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (patch.email !== undefined) {
    sets.push(`email = $${i++}`);
    vals.push(patch.email);
  }
  if (patch.passwordHash !== undefined) {
    sets.push(`password_hash = $${i++}`);
    vals.push(patch.passwordHash);
  }
  if (patch.role !== undefined) {
    sets.push(`role = $${i++}`);
    vals.push(patch.role);
  }
  if (!sets.length) return findUserById(pool, id);
  sets.push(`updated_at = NOW()`);
  vals.push(id);
  const r = await pool.query<UserPublic>(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, email, role`,
    vals,
  );
  return r.rows[0] ?? null;
};

export const deleteUser = async (pool: Pool, id: string) => {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
};
