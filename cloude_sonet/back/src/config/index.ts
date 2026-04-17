// Модуль конфигурации бэкенда
// Читает переменные окружения из .env и экспортирует типизированный объект конфигурации

import { config as loadDotenv } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Загружаем .env из папки back/
loadDotenv({ path: join(__dirname, '../../.env') })

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Переменная окружения ${name} обязательна`)
  return value
}

const optional = (name: string, defaultValue: string): string =>
  process.env[name] ?? defaultValue

export const config = {
  // Настройки сервера
  server: {
    host: optional('HOST', '0.0.0.0'),
    port: parseInt(optional('PORT', '3402'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
    isDev: optional('NODE_ENV', 'development') === 'development',
  },

  // Настройки Socket.io
  socket: {
    port: parseInt(optional('SOCKET_PORT', '3403'), 10),
  },

  // Настройки подключения к PostgreSQL
  db: {
    host: optional('DB_HOST', 'localhost'),
    port: parseInt(optional('DB_PORT', '5432'), 10),
    name: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    poolMax: parseInt(optional('DB_POOL_MAX', '10'), 10),
  },

  // Настройки JWT
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpires: optional('JWT_ACCESS_EXPIRES', '1h'),
    refreshExpires: optional('JWT_REFRESH_EXPIRES', '7d'),
  },

  // Настройки CORS
  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:3401'),
  },

  // Настройки администратора PostgreSQL (для db:init)
  postgres: {
    adminPassword: optional('POSTGRES_ADMIN_PASSWORD', ''),
  },
} as const

export type Config = typeof config
