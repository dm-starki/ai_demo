import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(join(__dirname, '..'));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL не задан');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

const users = [
  { email: 'a@a.ru', password: '1234', role: 'admin' },
  { email: 'u@u.ru', password: '1234', role: 'user' },
];

const run = async () => {
  const client = await pool.connect();
  try {
    for (const u of users) {
      const hash = bcrypt.hashSync(u.password, 10);
      await client.query(
        `
        INSERT INTO users (email, password_hash, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
        `,
        [u.email, hash, u.role],
      );
    }
    console.log('Сиды пользователей применены: a@a.ru (admin), u@u.ru (user), пароль 1234');
  } finally {
    client.release();
    await pool.end();
  }
};

void run().catch((e) => {
  console.error(e);
  process.exit(1);
});
