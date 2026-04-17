import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const adminUrl = process.env.DB_ADMIN_URL;
if (!adminUrl) {
  console.error('Укажите DB_ADMIN_URL в back/.env');
  process.exit(1);
}

const sqlPath = join(__dirname, '..', 'sql', 'init_db.sql');
const initSql = readFileSync(sqlPath, 'utf8');

const run = async () => {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query(initSql);
    const hash = await bcrypt.hash('1234', 10);
    await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES
        ($1, $2, 'admin'),
        ($3, $4, 'user')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, updated_at = NOW()`,
      ['a@a.ru', hash, 'u@u.ru', hash],
    );
    await client.query('COMMIT');
    console.log('База cursor_auto инициализирована, тестовые пользователи: a@a.ru, u@u.ru (пароль 1234).');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
