import { Db } from '@config/db';
import { env } from '@config/env';
import { AuthService } from '@services/authService';
import { categoryNames } from '@const/categories';

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

    `
  CREATE TABLE category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
  `,

    `
  CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT NOT NULL,
    banner_url VARCHAR(255) NULL,
    category_id INT NOT NULL,
    venue VARCHAR(191) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    source ENUM('INTERNAL', 'EXTERNAL') NOT NULL DEFAULT 'INTERNAL',
    source_name VARCHAR(191) NULL,
    external_event_id VARCHAR(191) NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'REMOVED') NOT NULL DEFAULT 'PUBLISHED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_owner
      FOREIGN KEY (owner_id) REFERENCES users(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_events_category
      FOREIGN KEY (category_id) REFERENCES category(id)
      ON DELETE RESTRICT,

    INDEX idx_events_category_starts_at_status (category_id, starts_at, status),
    UNIQUE KEY uq_events_source_external (source_name, external_event_id)
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

    // seed users
    await AuthService.register({
      name: 'John Tan',
      email: 'john@example.com',
      password: 'password123',
    });

    // seed categories
    for (const categoryName of categoryNames) {
      await connection.execute(
        `INSERT INTO category (name) VALUES (?)`,
        [categoryName]
      );
    }

    console.log('Setup completed successfully.');
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