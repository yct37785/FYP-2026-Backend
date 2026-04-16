import mysql, { Pool } from 'mysql2/promise';
import { env } from '@config/env';

export class Db {
  private static pool: Pool | null = null;

  static getPool(): Pool {
    if (!Db.pool) {
      Db.pool = mysql.createPool({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        waitForConnections: true,
        connectionLimit: 10,
      });
    }

    return Db.pool;
  }

  static async closePool(): Promise<void> {
    if (Db.pool) {
      await Db.pool.end();
      Db.pool = null;
    }
  }

  static async resetPool(): Promise<Pool> {
    await Db.closePool();
    return Db.getPool();
  }

  static async createRootConnection() {
    return mysql.createConnection({
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
    });
  }
}

export const db = Db.getPool();