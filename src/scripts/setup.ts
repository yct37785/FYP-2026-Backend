import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ResultSetHeader } from 'mysql2';
import { Db } from '@config/db';
import { env } from '@config/env';
import { categoryNames } from '@const/categories';
import type { UserRole } from '@mytypes/user';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const createFixedSetupToken = (payload: {
  userId: number;
  email: string;
  role: UserRole;
}) => {
  return jwt.sign(payload, env.jwtSecret, {
    noTimestamp: true,
  });
};

async function runSetup() {
  const rootConnection = await Db.createRootConnection();

  const schemaResetStatements: string[] = [
    `DROP DATABASE IF EXISTS \`${env.dbName}\``,
    `CREATE DATABASE \`${env.dbName}\``,
  ];

  const tableStatements: string[] = [
    `
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user', 'organizer', 'admin') NOT NULL DEFAULT 'user',
      status ENUM('active', 'suspended', 'deactivated') NOT NULL DEFAULT 'active',
      credits DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
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
    CREATE TABLE user_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_user_categories_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_user_categories_category
        FOREIGN KEY (category_id) REFERENCES category(id)
        ON DELETE CASCADE,

      CONSTRAINT uq_user_category UNIQUE (user_id, category_id)
    )
    `,

    `
    CREATE TABLE event (
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
      pax INT NOT NULL DEFAULT 1,
      source ENUM('INTERNAL', 'EXTERNAL') NOT NULL DEFAULT 'INTERNAL',
      source_name VARCHAR(191) NULL,
      external_event_id VARCHAR(191) NULL,
      is_suspended BOOLEAN NOT NULL DEFAULT false,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      CONSTRAINT fk_event_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_event_category
        FOREIGN KEY (category_id) REFERENCES category(id)
        ON DELETE RESTRICT,

      INDEX idx_event_category_starts_at_is_suspended (category_id, starts_at, is_suspended),
      UNIQUE KEY uq_event_source_external (source_name, external_event_id)
    )
    `,
  ];

  try {
    console.log(`Resetting database: ${env.dbName}`);

    // 1) close app pool before dropping schema
    await Db.closePool();

    // 2) drop + create database using root connection
    for (const statement of schemaResetStatements) {
      await rootConnection.query(statement);
    }

    await rootConnection.end();

    // 3) recreate app pool so it points to the fresh schema
    const pool = await Db.resetPool();

    // 4) create tables using app pool
    for (const statement of tableStatements) {
      await pool.query(statement);
    }

    // 5) seed categories
    for (const categoryName of categoryNames) {
      await pool.execute(
        `INSERT INTO category (name) VALUES (?)`,
        [categoryName]
      );
    }

    // 6) seed users
    const seedUsers = [
      {
        name: 'John Tan',
        email: 'john@example.com',
        password: 'password123',
        role: 'user' as const,
        credits: 100.0,
      },
      {
        name: 'Olivia Organizer',
        email: 'organizer@example.com',
        password: 'password123',
        role: 'organizer' as const,
        credits: 100.0,
      },
      {
        name: 'Adam Admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin' as const,
        credits: 100.0,
      },
    ];

    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      const [result] = await pool.execute<ResultSetHeader>(
        `
        INSERT INTO users (name, email, password_hash, role, credits)
        VALUES (?, ?, ?, ?, ?)
        `,
        [user.name, user.email, passwordHash, user.role]
      );

      const token = createFixedSetupToken({
        userId: result.insertId,
        email: user.email,
        role: user.role,
      });

      console.log('----------------------------------------');
      console.log(`Role: ${user.role}`);
      console.log(`Token: ${token}`);
    }

    console.log('----------------------------------------');
    console.log('Setup completed successfully.');
  } catch (error) {
    try {
      await rootConnection.end();
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