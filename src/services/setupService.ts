import bcrypt from 'bcrypt';
import { createRootConnection } from '@config/db';
import { env } from '@config/env';

export class SetupService {
  static async resetDatabase() {
    const connection = await createRootConnection();

    try {
      await connection.query(`DROP DATABASE IF EXISTS \`${env.dbName}\``);
      await connection.query(`CREATE DATABASE \`${env.dbName}\``);
      await connection.query(`USE \`${env.dbName}\``);

      await connection.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('user', 'organizer', 'admin') NOT NULL DEFAULT 'user',
          status ENUM('active', 'suspended', 'deactivated') NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      const passwordHash = await bcrypt.hash('password123', 10);

      await connection.execute(
        `
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?)
        `,
        ['John Tan', 'john@example.com', passwordHash, 'user', 'active']
      );

      return {
        message: 'Database setup completed successfully',
        database: env.dbName,
        seededUser: {
          name: 'John Tan',
          email: 'john@example.com',
          password: 'password123',
          role: 'user',
        },
      };
    } finally {
      await connection.end();
    }
  }
}