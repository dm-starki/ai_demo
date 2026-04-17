#!/usr/bin/env bash
# Скрипт очистки директорий build и node_modules
# Использование: yarn clean (из корневого каталога)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[clean] Очистка проекта AI Chat..."

# Удаление build директорий
echo "[clean] Удаление бэкенд dist/..."
rm -rf "$ROOT_DIR/back/dist"

echo "[clean] Удаление фронтенд dist/..."
rm -rf "$ROOT_DIR/front/dist"

# Удаление node_modules
echo "[clean] Удаление бэкенд node_modules/..."
rm -rf "$ROOT_DIR/back/node_modules"

echo "[clean] Удаление фронтенд node_modules/..."
rm -rf "$ROOT_DIR/front/node_modules"

# Удаление root node_modules (если есть)
rm -rf "$ROOT_DIR/node_modules"

# Удаление логов и PID файлов
rm -f "$ROOT_DIR/.back.log" "$ROOT_DIR/.front.log" "$ROOT_DIR/.pids"

echo "[clean] ✓ Очистка завершена"
echo "[clean] Для переустановки зависимостей: yarn install:all"
