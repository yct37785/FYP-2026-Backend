import bcrypt from 'bcrypt';
import { ResultSetHeader } from 'mysql2';
import { Db } from '@config/db';
import { env } from '@config/env';
import { seedCategories, seedUsers } from './seedUsers';
import { generateSeedEvents } from './seedEvents';
import { schemaResetStatements, tableStatements } from './tableStatements';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@mytypes/user';

export const createFixedSetupToken = (payload: {
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
    for (const categoryName of seedCategories) {
      await pool.execute(
        `INSERT INTO category (name) VALUES (?)`,
        [categoryName]
      );
    }

    // 6) seed users
    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      const [result] = await pool.execute<ResultSetHeader>(
        `
        INSERT INTO users (name, email, password_hash, role, credits)
        VALUES (?, ?, ?, ?, ?)
        `,
        [user.name, user.email, passwordHash, user.role, user.credits]
      );

      const token = createFixedSetupToken({
        userId: result.insertId,
        email: user.email,
        role: user.role,
      });

      console.log('----------------------------------------');
      console.log(`Role: ${user.role}`);
      console.log(`Email: ${user.email}`);
      console.log(`Token: ${token}`);
    }

    // 7) seed events (hardcoded seeded organizer ID)
    const seedEvents = generateSeedEvents(20, {
      ownerId: 3,
      categoryCount: seedCategories.length,
    });

    for (const event of seedEvents) {
      await pool.execute(
        `
        INSERT INTO event (
          owner_id,
          title,
          description,
          banner_url,
          category_id,
          venue,
          address,
          city,
          starts_at,
          ends_at,
          price,
          pax,
          source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          event.ownerId,
          event.title,
          event.description,
          event.bannerUrl,
          event.categoryId,
          event.venue,
          event.address,
          event.city,
          event.startsAt,
          event.endsAt,
          event.price,
          event.pax,
          event.source,
        ]
      );
    }

    console.log('----------------------------------------');
    console.log(`Seeded ${seedEvents.length} events for owner_id=3`);

    // 8) seed one confirmed booking for the hard coded events
    await pool.execute(
      `
      INSERT INTO booking (user_id, event_id, credits_spent)
      VALUES (?, ?, ?)
      `,
      [2, 1, 15]
    );
    await pool.execute(
      `
      INSERT INTO booking (user_id, event_id, credits_spent)
      VALUES (?, ?, ?)
      `,
      [1, 1, 0]
    );

    console.log('----------------------------------------');
    console.log('Seeded bookings.');

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