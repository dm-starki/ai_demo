// Модуль подключения к базе данных PostgreSQL
// Экспортирует пул соединений и вспомогательные функции

import pg from 'pg'
import { config } from '../config/index.js'

const { Pool } = pg

// Создаём пул соединений с PostgreSQL
export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: config.db.poolMax,
  // Таймаут ожидания соединения (30 секунд)
  connectionTimeoutMillis: 30_000,
  // Таймаут простоя соединения (10 секунд)
  idleTimeoutMillis: 10_000,
})

// Обработчик ошибок пула
pool.on('error', (err) => {
  console.error('Неожиданная ошибка соединения с БД:', err)
})

// Выполняет SQL запрос с параметрами
export const query = async <T extends pg.QueryResultRow = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> => {
  const client = await pool.connect()
  try {
    return await client.query<T>(sql, params)
  } finally {
    client.release()
  }
}

// Выполняет несколько запросов в транзакции
export const transaction = async <T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Проверка подключения к БД
export const checkConnection = async (): Promise<boolean> => {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}
