import bcrypt from 'bcrypt';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Db } from '@config/db';
import type { LoginInput, RegisterInput, UserRole } from '@mytypes/auth';
import { signToken } from '@utils/jwt';
import { ERR_MSGS } from '@const/errorMessages';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'deactivated';
}

export class AuthService {
  static async register(data: RegisterInput) {
    const pool = Db.getPool();
    const { name, email, password } = data;

    const [existingUsers] = await pool.execute<UserRow[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new Error(ERR_MSGS.AUTH.EMAIL_ALREADY_REGISTERED);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
      `,
      [name, email, passwordHash, 'user']
    );

    const userId = userResult.insertId;
    const role: UserRole = 'user';

    const token = signToken({
      userId,
      email,
      role,
    });

    return {
      token,
      user: {
        id: userId,
        name,
        email,
        role,
      },
    };
  }

  static async login(data: LoginInput) {
    const pool = Db.getPool();
    const { email, password } = data;

    const [rows] = await pool.execute<UserRow[]>(
      `
      SELECT id, name, email, password_hash, role, status
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.AUTH.INVALID_EMAIL_OR_PASSWORD);
    }

    const user = rows[0];

    if (user.status === 'suspended') {
      throw new Error(ERR_MSGS.AUTH.ACCOUNT_SUSPENDED);
    }

    if (user.status === 'deactivated') {
      throw new Error(ERR_MSGS.AUTH.ACCOUNT_DEACTIVATED);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new Error(ERR_MSGS.AUTH.INVALID_EMAIL_OR_PASSWORD);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  static async getCurrentUser(userId: number) {
    const pool = Db.getPool();

    const [rows] = await pool.execute<UserRow[]>(
      `
      SELECT id, name, email, password_hash, role, status
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.AUTH.USER_NOT_FOUND);
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