import bcrypt from 'bcrypt';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { db } from '@config/db';
import { LoginInput, RegisterInput } from '@mytypes/auth';
import { signToken } from '@utils/jwt';

interface RoleRow extends RowDataPacket {
  id: number;
  name: string;
}

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  status: 'active' | 'suspended' | 'deactivated';
}

export class AuthService {
  static async register(data: RegisterInput) {
    const { name, email, password } = data;

    const [existingUsers] = await db.execute<UserRow[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new Error('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await db.execute<ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    const userId = userResult.insertId;

    const [roleRows] = await db.execute<RoleRow[]>(
      'SELECT id, name FROM roles WHERE name = ? LIMIT 1',
      ['user']
    );

    if (roleRows.length === 0) {
      throw new Error('Default role "user" not found');
    }

    const userRoleId = roleRows[0].id;

    await db.execute(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [userId, userRoleId]
    );

    const token = signToken({
      userId,
      email,
      role: 'user',
    });

    return {
      token,
      user: {
        id: userId,
        name,
        email,
        role: 'user',
      },
    };
  }

  static async login(data: LoginInput) {
    const { email, password } = data;

    const [rows] = await db.execute<UserRow[]>(
      `
      SELECT u.id, u.name, u.email, u.password_hash, u.status
      FROM users u
      WHERE u.email = ?
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = rows[0];

    if (user.status !== 'active') {
      throw new Error(`Account is ${user.status}`);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const [roleRows] = await db.execute<RoleRow[]>(
      `
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
      LIMIT 1
      `,
      [user.id]
    );

    if (roleRows.length === 0) {
      throw new Error('User role not found');
    }

    const role = roleRows[0].name;

    const token = signToken({
      userId: user.id,
      email: user.email,
      role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
      },
    };
  }

  static async getCurrentUser(userId: number) {
    const [rows] = await db.execute<
      (UserRow & { role: string })[]
    >(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.password_hash,
        u.status,
        r.name AS role
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error('User not found');
    }

    const user = rows[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
    };
  }
}