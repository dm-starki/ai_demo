// ============================================================
// Скрипт инициализации базы данных
// Запуск: yarn db:init
// ============================================================

import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';
import { dbConfig, bcryptConfig } from '../config.js';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Подключение от имени суперпользователя postgres для создания БД */
const adminClient = new Client({
  host: dbConfig.host,
  port: dbConfig.port,
  database: 'postgres',
  user: 'postgres',
  password: 'Change127',
});

const main = async () => {
  console.log('🚀 Инициализация базы данных...\n');

  // --- Шаг 1: Проверка/создание БД и пользователя ---
  await adminClient.connect();
  console.log('✅ Подключено к postgres как superuser');

  // Создаём/обновляем пользователя БД
  const userExists = await adminClient.query(
    "SELECT 1 FROM pg_roles WHERE rolname = 'chat_cline_sonnet'"
  );
  if (userExists.rowCount === 0) {
    await adminClient.query(
      "CREATE USER chat_cline_sonnet WITH PASSWORD 'chat_pass_2024'"
    );
    console.log('✅ Пользователь chat_cline_sonnet создан');
  } else {
    await adminClient.query(
      "ALTER USER chat_cline_sonnet WITH PASSWORD 'chat_pass_2024'"
    );
    console.log('✅ Пароль пользователя chat_cline_sonnet обновлён');
  }

  // Проверяем/создаём базу данных
  const dbExists = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = 'chat_cline_sonnet'"
  );
  if (dbExists.rowCount === 0) {
    await adminClient.query(
      "CREATE DATABASE chat_cline_sonnet OWNER chat_cline_sonnet ENCODING 'UTF8'"
    );
    console.log('✅ База данных chat_cline_sonnet создана');
  } else {
    console.log('ℹ️  База данных chat_cline_sonnet уже существует, очищаем содержимое');
  }

  // Выдаём все привилегии на БД
  await adminClient.query(
    'GRANT ALL PRIVILEGES ON DATABASE chat_cline_sonnet TO chat_cline_sonnet'
  );

  await adminClient.end();
  console.log('✅ Разрыв соединения с postgres\n');

  // --- Шаг 2: Применяем схему БД ---
  const dbClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    database: 'chat_cline_sonnet',
    user: 'postgres',
    password: 'Change127',
  });

  await dbClient.connect();
  console.log('✅ Подключено к chat_cline_sonnet');

  // Читаем и выполняем init_db.sql
  const sqlPath = join(__dirname, '../../sql/init_db.sql');
  const initSql = readFileSync(sqlPath, 'utf-8');
  await dbClient.query(initSql);
  console.log('✅ Схема базы данных создана');

  // Выдаём права на схему
  await dbClient.query(
    'GRANT ALL PRIVILEGES ON SCHEMA public TO chat_cline_sonnet'
  );
  await dbClient.query(
    'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chat_cline_sonnet'
  );
  await dbClient.query(
    'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chat_cline_sonnet'
  );

  // --- Шаг 3: Создаём тестовых пользователей ---
  console.log('\n👤 Создание тестовых пользователей...');

  const adminPassword = await bcrypt.hash('1234', bcryptConfig.rounds);
  const userPassword = await bcrypt.hash('1234', bcryptConfig.rounds);

  // Пользователь-администратор
  await dbClient.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET password = $2, role = 'admin', updated_at = NOW()`,
    ['a@a.ru', adminPassword]
  );
  console.log('✅ Администратор a@a.ru создан');

  // Обычный пользователь
  await dbClient.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'user')
     ON CONFLICT (email) DO UPDATE SET password = $2, role = 'user', updated_at = NOW()`,
    ['u@u.ru', userPassword]
  );
  console.log('✅ Пользователь u@u.ru создан');

  await dbClient.end();

  console.log('\n✅ Инициализация базы данных завершена успешно!');
  console.log('   Тестовые пользователи:');
  console.log('   • a@a.ru / 1234 (администратор)');
  console.log('   • u@u.ru / 1234 (пользователь)');
  process.exit(0);
};

main().catch((err) => {
  console.error('❌ Ошибка инициализации БД:', err);
  process.exit(1);
});
