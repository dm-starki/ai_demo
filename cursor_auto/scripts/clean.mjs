import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const paths = [
  join(root, 'back', 'node_modules'),
  join(root, 'back', 'build'),
  join(root, 'front', 'node_modules'),
  join(root, 'front', 'build'),
  join(root, 'front', 'dist'),
  join(root, 'node_modules'),
];

for (const p of paths) {
  try {
    rmSync(p, { recursive: true, force: true });
    console.log('Удалено:', p);
  } catch (e) {
    console.warn('Пропуск:', p, e?.message ?? e);
  }
}
