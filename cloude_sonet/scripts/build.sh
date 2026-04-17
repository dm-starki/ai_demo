#!/usr/bin/env bash
# Скрипт сборки проекта для продакшена
# Собирает бэкенд и фронтенд
# Использование: yarn build (из корневого каталога)

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "╔════════════════════════════════════════╗"
echo "║     AI Chat — сборка для продакшена   ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Устанавливаем зависимости
echo "[build] Установка зависимостей бэкенда..."
cd "$ROOT_DIR/back" && yarn install --frozen-lockfile 2>/dev/null || yarn install

echo "[build] Установка зависимостей фронтенда..."
cd "$ROOT_DIR/front" && yarn install --frozen-lockfile 2>/dev/null || yarn install

# Сборка бэкенда
echo "[build] Сборка бэкенда..."
cd "$ROOT_DIR/back" && node node_modules/.bin/tsc
echo "[build] ✓ Бэкенд собран в back/dist/"

# Сборка фронтенда
echo "[build] Сборка фронтенда..."
cd "$ROOT_DIR/front" && node ../node_modules/.bin/vite build
echo "[build] ✓ Фронтенд собран в front/dist/"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  ✓ Сборка завершена успешно!           ║"
echo "╠════════════════════════════════════════╣"
echo "║  Запуск: cd back && node dist/index.js ║"
echo "╚════════════════════════════════════════╝"
