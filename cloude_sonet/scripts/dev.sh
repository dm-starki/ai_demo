#!/usr/bin/env bash
# Скрипт запуска проекта в режиме разработки
# Использование: yarn dev (из корневого каталога)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BACK_LOG="$ROOT_DIR/.back.log"
FRONT_LOG="$ROOT_DIR/.front.log"
PID_FILE="$ROOT_DIR/.pids"

# ── Очистка предыдущих процессов ─────────────────────────────────────────────
# Убиваем прошлые экземпляры по сохранённым PID-ам
if [ -f "$PID_FILE" ]; then
  while IFS= read -r pid; do
    kill "$pid" 2>/dev/null || true
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi
# Дополнительно убиваем по имени, чтобы не осталось осиротевших процессов
pkill -f "tsx.*src/index.ts"   2>/dev/null || true
pkill -f "node.*\.bin/vite"    2>/dev/null || true
# Убиваем tail-процессы от предыдущих запусков (главная причина дублирования)
pkill -f "tail.*\.back\.log"   2>/dev/null || true
pkill -f "tail.*\.front\.log"  2>/dev/null || true
sleep 1

echo "╔════════════════════════════════════════╗"
echo "║     AI Chat — режим разработки         ║"
echo "╠════════════════════════════════════════╣"
echo "║  Фронтенд: http://localhost:3401       ║"
echo "║  REST API: http://localhost:3402       ║"
echo "║  Сокеты:   http://localhost:3403       ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Проверяем node_modules
if [ ! -d "$ROOT_DIR/back/node_modules" ]; then
  echo "[dev] Устанавливаем зависимости бэкенда..."
  cd "$ROOT_DIR/back" && yarn install
fi
if [ ! -d "$ROOT_DIR/node_modules/vite" ]; then
  echo "[dev] Устанавливаем зависимости фронтенда..."
  cd "$ROOT_DIR/front" && yarn install
fi

# Очищаем лог-файлы от прошлой сессии
> "$BACK_LOG"
> "$FRONT_LOG"

cleanup() {
  echo ""
  echo "[dev] Остановка сервисов..."
  if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid; do
      kill "$pid" 2>/dev/null || true
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
  exit 0
}
trap cleanup INT TERM

# ── Бэкенд ───────────────────────────────────────────────────────────────────
echo "[dev] Запуск бэкенда (порт 3402, сокеты 3403)..."
cd "$ROOT_DIR/back"
node "$ROOT_DIR/back/node_modules/.bin/tsx" watch src/index.ts \
  < /dev/null > "$BACK_LOG" 2>&1 &
BACK_PID=$!
echo $BACK_PID >> "$PID_FILE"

sleep 3

# ── Фронтенд ─────────────────────────────────────────────────────────────────
# < /dev/null — отключаем stdin чтобы Vite не ждал интерактивных команд
# и не получал SIGHUP при отсутствии TTY-ввода
echo "[dev] Запуск фронтенда (порт 3401)..."
cd "$ROOT_DIR/front"
node "$ROOT_DIR/node_modules/.bin/vite" \
  < /dev/null > "$FRONT_LOG" 2>&1 &
FRONT_PID=$!
echo $FRONT_PID >> "$PID_FILE"

echo ""
echo "[dev] Сервисы запущены. Ctrl+C — остановка."
echo ""

# ── Логи ─────────────────────────────────────────────────────────────────────
# Два отдельных tail — один файл на каждый, без дублирования строк
tail -f "$BACK_LOG" &
TAIL_BACK=$!
echo $TAIL_BACK >> "$PID_FILE"

tail -f "$FRONT_LOG" &
TAIL_FRONT=$!
echo $TAIL_FRONT >> "$PID_FILE"

wait $BACK_PID $FRONT_PID
