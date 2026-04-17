import { getConfig } from './config.js';
import { createPool } from './db/pool.js';
import { createJwtHelpers } from './auth/jwt.js';
import { buildRestServer } from './http/server.js';
import { startSocketServer } from './socket/server.js';

const main = async () => {
  const cfg = getConfig();
  const pool = createPool(cfg);
  const jwt = createJwtHelpers(cfg);
  await buildRestServer({ cfg, pool, jwt });
  await startSocketServer({ cfg, pool, jwt });
  console.log(`REST :${cfg.restPort}, WebSocket :${cfg.socketPort}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
