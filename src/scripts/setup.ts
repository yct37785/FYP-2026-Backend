import { Db } from '@config/db';
import { env } from '@config/env';
import { AuthService } from '@services/authService';

async function runSetup() {
  const connection = await Db.createRootConnection();

  const schemaStatements: string[] = [
    `DROP DATABASE IF EXISTS \`${env.dbName}\``,
    `CREATE DATABASE \`${env.dbName}\``,
    `USE \`${env.dbName}\``,

    `
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
    `,
  ];

  try {
    console.log(`Resetting database: ${env.dbName}`);

    await Db.closePool();

    for (const statement of schemaStatements) {
      await connection.query(statement);
    }

    await connection.end();

    await Db.resetPool();

    await AuthService.register({
      name: 'John Tan',
      email: 'john@example.com',
      password: 'password123',
    });

    console.log('Setup completed successfully.');
    console.log('Seed user: john@example.com / password123');
  } catch (error) {
    try {
      await connection.end();
    } catch {
      // ignore
    }

    console.error('Setup failed:', error);
    process.exit(1);
  } finally {
    await Db.closePool();
  }
}

runSetup();