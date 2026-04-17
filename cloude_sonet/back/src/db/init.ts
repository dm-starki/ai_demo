#!/usr/bin/env tsx
// Скрипт инициализации базы данных
// Запуск: yarn db:init из корневого каталога
// 1. Создаёт БД и пользователя если не существуют
// 2. Применяет схему из init_db.sql
// 3. Создаёт тестовых пользователей

import { config as loadDotenv } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotenv({ path: join(__dirname, '../../.env') })

const { Client } = pg

const DB_NAME = process.env.DB_NAME ?? 'cursor_sonnet'
const DB_USER = process.env.DB_USER ?? 'cursor_sonnet'
const DB_PASSWORD = process.env.DB_PASSWORD ?? 'cursor_sonnet_pass'
const ADMIN_PASSWORD = process.env.POSTGRES_ADMIN_PASSWORD ?? 'Change127'
const DB_HOST = process.env.DB_HOST ?? 'localhost'
const DB_PORT = parseInt(process.env.DB_PORT ?? '5432', 10)

const log = (msg: string) => console.log(`[db:init] ${msg}`)
const err = (msg: string) => console.error(`[db:init] ОШИБКА: ${msg}`)

// Подключение под суперпользователем postgres
const createAdminClient = (database = 'postgres') => new Client({
  host: DB_HOST,
  port: DB_PORT,
  database,
  user: 'postgres',
  password: ADMIN_PASSWORD,
})

const initDb = async () => {
  log('Запуск инициализации базы данных...')

  // Шаг 1: Создаём пользователя и БД под суперпользователем
  const adminClient = createAdminClient()
  await adminClient.connect()

  try {
    // Проверяем/создаём пользователя
    const userExists = await adminClient.query(
      `SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1`,
      [DB_USER]
    )
    if (userExists.rowCount === 0) {
      await adminClient.query(
        `CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}'`
      )
      log(`Создан пользователь БД: ${DB_USER}`)
    } else {
      await adminClient.query(
        `ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}'`
      )
      log(`Пользователь ${DB_USER} уже существует, пароль обновлён`)
    }

    // Проверяем/создаём базу данных
    const dbExists = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    )
    if (dbExists.rowCount === 0) {
      await adminClient.query(
        `CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}`
      )
      log(`Создана база данных: ${DB_NAME}`)
    } else {
      log(`База данных ${DB_NAME} уже существует`)
    }

    // Даём права
    await adminClient.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER}`
    )
  } finally {
    await adminClient.end()
  }

  // Шаг 2: Подключаемся к нашей БД под суперпользователем
  const dbAdminClient = createAdminClient(DB_NAME)
  await dbAdminClient.connect()

  try {
    // Очищаем существующие таблицы (DROP SCHEMA + CREATE)
    log('Очистка схемы базы данных...')
    await dbAdminClient.query('DROP SCHEMA public CASCADE')
    await dbAdminClient.query('CREATE SCHEMA public')
    await dbAdminClient.query(`GRANT ALL ON SCHEMA public TO ${DB_USER}`)
    await dbAdminClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER}`)
    await dbAdminClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER}`)

    // Применяем схему из SQL файла
    log('Применение схемы из init_db.sql...')
    const sqlPath = join(__dirname, '../../sql/init_db.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    // Разбиваем по блокам (PL/pgSQL блоки $$ нельзя разбивать по ";")
    await dbAdminClient.query(sql)
    log('Схема применена успешно')

    // Шаг 3: Создаём тестовых пользователей с правильными bcrypt хэшами
    log('Создание тестовых пользователей...')

    const saltRounds = 10
    const adminHash = await bcrypt.hash('1234', saltRounds)
    const userHash = await bcrypt.hash('1234', saltRounds)

    // Обновляем хэши паролей тестовых пользователей
    await dbAdminClient.query(
      `UPDATE users SET password = $1 WHERE email = 'a@a.ru'`,
      [adminHash]
    )
    await dbAdminClient.query(
      `UPDATE users SET password = $1 WHERE email = 'u@u.ru'`,
      [userHash]
    )

    log('Тестовые пользователи созданы:')
    log('  a@a.ru / 1234 — администратор')
    log('  u@u.ru / 1234 — пользователь')

  } finally {
    await dbAdminClient.end()
  }

  log('✓ Инициализация базы данных завершена успешно!')
}

initDb().catch((e) => {
  err(String(e))
  process.exit(1)
})
