import type { UserRole, UserRow } from '../types.js';
import { pool } from '../db.js';

export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const r = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role, created_at FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return r.rows[0] ?? null;
};

export const findUserById = async (id: string): Promise<UserRow | null> => {
  const r = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role, created_at FROM users WHERE id = $1`,
    [id],
  );
  return r.rows[0] ?? null;
};

export const listUsers = async (): Promise<Omit<UserRow, 'password_hash'>[]> => {
  const r = await pool.query<Omit<UserRow, 'password_hash'>>(
    `SELECT id, email, role, created_at FROM users ORDER BY email`,
  );
  return r.rows;
};

export const insertUser = async (params: {
  email: string;
  passwordHash: string;
  role: UserRole;
}): Promise<Omit<UserRow, 'password_hash'>> => {
  const r = await pool.query<Omit<UserRow, 'password_hash'>>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role, created_at`,
    [params.email, params.passwordHash, params.role],
  );
  return r.rows[0];
};

export const updateUserCredentials = async (params: {
  id: string;
  email: string;
  passwordHash: string;
}): Promise<void> => {
  await pool.query(
    `UPDATE users SET email = $2, password_hash = $3 WHERE id = $1`,
    [params.id, params.email, params.passwordHash],
  );
};

/** Обновление email, роли и опционально пароля (админ-панель). */
export const updateUserByAdmin = async (params: {
  id: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
}): Promise<void> => {
  if (params.passwordHash) {
    await pool.query(
      `UPDATE users SET email = $2, role = $3, password_hash = $4 WHERE id = $1`,
      [params.id, params.email, params.role, params.passwordHash],
    );
  } else {
    await pool.query(`UPDATE users SET email = $2, role = $3 WHERE id = $1`, [
      params.id,
      params.email,
      params.role,
    ]);
  }
};

export const updateUserPassword = async (params: {
  id: string;
  passwordHash: string;
}): Promise<void> => {
  await pool.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [
    params.id,
    params.passwordHash,
  ]);
};

export const deleteUserById = async (id: string): Promise<void> => {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
};
