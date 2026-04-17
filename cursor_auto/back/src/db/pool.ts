import pg from 'pg';
import type { AppConfig } from '../config.js';

export const createPool = (cfg: AppConfig) =>
  new pg.Pool({ connectionString: cfg.databaseUrl, max: 20 });
