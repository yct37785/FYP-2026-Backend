import { RowDataPacket } from 'mysql2';
import { Db } from '@config/db';

export interface CategoryItem {
  id: number;
  name: string;
}

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

export class CategoryService {
  static async getCategories(): Promise<CategoryItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<CategoryRow[]>(
      `
      SELECT
        id,
        name
      FROM category
      ORDER BY name ASC
      `
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
    }));
  }
}