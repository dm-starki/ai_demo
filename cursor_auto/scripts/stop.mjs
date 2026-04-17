import { execSync } from 'node:child_process';

const ports = [3101, 3102, 3103];
for (const port of ports) {
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9 2>/dev/null`, { shell: '/bin/bash' });
    console.log('Остановлены процессы на порту', port);
  } catch {
    console.log('Порт', port, '— процессов не найдено');
  }
}
