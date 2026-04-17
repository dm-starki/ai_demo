#!/usr/bin/env bash
# Скрипт остановки всех сервисов
# Использование: yarn stop (из корневого каталога)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/.pids"

echo "[stop] Остановка сервисов AI Chat..."

if [ -f "$PID_FILE" ]; then
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      echo "[stop] Остановлен процесс $pid"
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
else
  echo "[stop] Файл PID не найден, ищем процессы по портам..."
fi

# Дополнительно — убиваем по портам (на случай если PID файл не найден)
for PORT in 3401 3402 3403; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    kill $PID 2>/dev/null && echo "[stop] Освобождён порт $PORT (PID: $PID)"
  fi
done

echo "[stop] ✓ Все сервисы остановлены"
