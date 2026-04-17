import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type {
  MeCategoryItem,
  UpdateMyProfileInput,
  UserGender,
  UserProfile,
  UserRole,
  UserStatus,
} from '@mytypes/user';

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

interface MeCategoryRow extends RowDataPacket {
  id: number;
  category_id: number;
  category_name: string;
  created_at: Date;
}

interface MeProfileRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  credits: number;
  profile_pic_url: string | null;
  description: string | null;
  gender: UserGender | null;
  age: number | null;
  created_at: Date;
  updated_at: Date;
}

const mapProfileRow = (row: MeProfileRow): UserProfile => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  credits: Number(row.credits),
  profilePicUrl: row.profile_pic_url,
  description: row.description,
  gender: row.gender,
  age: row.age,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class MeService {
  static async getMyProfile(userId: number): Promise<UserProfile> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<MeProfileRow[]>(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        credits,
        profile_pic_url,
        description,
        gender,
        age,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.AUTH.USER_NOT_FOUND);
    }

    return mapProfileRow(rows[0]);
  }

  static async updateMyProfile(
    userId: number,
    data: UpdateMyProfileInput
  ): Promise<UserProfile> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<MeProfileRow[]>(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        credits,
        profile_pic_url,
        description,
        gender,
        age,
        created_at,
        updated_at
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

    const nextName = data.name ?? user.name;
    const nextProfilePicUrl =
      data.profilePicUrl !== undefined ? data.profilePicUrl : user.profile_pic_url;
    const nextDescription =
      data.description !== undefined ? data.description : user.description;
    const nextGender =
      data.gender !== undefined ? data.gender : user.gender;
    const nextAge =
      data.age !== undefined ? data.age : user.age;

    await pool.execute<ResultSetHeader>(
      `
      UPDATE users
      SET
        name = ?,
        profile_pic_url = ?,
        description = ?,
        gender = ?,
        age = ?
      WHERE id = ?
      `,
      [
        nextName,
        nextProfilePicUrl,
        nextDescription,
        nextGender,
        nextAge,
        userId,
      ]
    );

    const [updatedRows] = await pool.execute<MeProfileRow[]>(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        credits,
        profile_pic_url,
        description,
        gender,
        age,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    return mapProfileRow(updatedRows[0]);
  }

  static async getMyCategories(userId: number): Promise<MeCategoryItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<MeCategoryRow[]>(
      `
      SELECT
        uc.id,
        c.id AS category_id,
        c.name AS category_name,
        uc.created_at
      FROM user_categories uc
      INNER JOIN category c ON c.id = uc.category_id
      WHERE uc.user_id = ?
      ORDER BY c.name ASC
      `,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      createdAt: row.created_at,
    }));
  }

  static async addMyCategory(userId: number, categoryId: number) {
    const pool = Db.getPool();

    const [categoryRows] = await pool.execute<CategoryRow[]>(
      `
      SELECT id, name
      FROM category
      WHERE id = ?
      LIMIT 1
      `,
      [categoryId]
    );

    if (categoryRows.length === 0) {
      throw new Error(ERR_MSGS.ME.CATEGORY_NOT_FOUND);
    }

    const [existingRows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT id
      FROM user_categories
      WHERE user_id = ? AND category_id = ?
      LIMIT 1
      `,
      [userId, categoryId]
    );

    if (existingRows.length > 0) {
      throw new Error(ERR_MSGS.ME.CATEGORY_ALREADY_EXISTS);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO user_categories (user_id, category_id)
      VALUES (?, ?)
      `,
      [userId, categoryId]
    );

    return {
      id: result.insertId,
      categoryId,
      categoryName: categoryRows[0].name,
    };
  }

  static async removeMyCategory(userId: number, categoryId: number) {
    const pool = Db.getPool();

    const [result] = await pool.execute<ResultSetHeader>(
      `
      DELETE FROM user_categories
      WHERE user_id = ? AND category_id = ?
      `,
      [userId, categoryId]
    );

    if (result.affectedRows === 0) {
      throw new Error(ERR_MSGS.ME.CATEGORY_PREFERENCE_NOT_FOUND);
    }

    return {
      message: 'Category removed from user preferences',
    };
  }
}