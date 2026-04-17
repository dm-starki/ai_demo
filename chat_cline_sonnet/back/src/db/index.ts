// ============================================================
// Пул подключений к PostgreSQL
// ============================================================

import pg from 'pg';
import { dbConfig } from '../config.js';

const { Pool } = pg;

/** Пул подключений к базе данных */
export const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.name,
  user: dbConfig.user,
  password: dbConfig.password,
  max: dbConfig.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Обработка ошибок пула
pool.on('error', (err) => {
  console.error('Ошибка пула подключений к PostgreSQL:', err);
});

/**
 * Выполнить SQL запрос с параметрами
 * @param text - SQL строка
 * @param params - параметры запроса
 */
export const query = async <T = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('SQL запрос:', { text: text.slice(0, 100), duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
};

/** Проверить подключение к БД */
export const testConnection = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('✅ Подключение к PostgreSQL успешно');
  } finally {
    client.release();
  }
};
