import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { UserCategoryItem } from '@mytypes/userCategory';

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

interface UserCategoryRow extends RowDataPacket {
  id: number;
  category_id: number;
  category_name: string;
  created_at: Date;
}

export class UserCategoryService {
  static async getMyCategories(userId: number): Promise<UserCategoryItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<UserCategoryRow[]>(
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

  static async addCategoryToUser(userId: number, categoryId: number) {
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
      throw new Error(ERR_MSGS.USER_CATEGORY.CATEGORY_NOT_FOUND);
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
      throw new Error(ERR_MSGS.USER_CATEGORY.USER_CATEGORY_ALREADY_EXISTS);
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

  static async removeCategoryFromUser(userId: number, categoryId: number) {
    const pool = Db.getPool();

    const [result] = await pool.execute<ResultSetHeader>(
      `
      DELETE FROM user_categories
      WHERE user_id = ? AND category_id = ?
      `,
      [userId, categoryId]
    );

    if (result.affectedRows === 0) {
      throw new Error(ERR_MSGS.USER_CATEGORY.USER_CATEGORY_NOT_FOUND);
    }

    return {
      message: 'Category removed from user preferences',
    };
  }
}