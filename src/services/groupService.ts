import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { UserRole } from '@mytypes/user';
import type { GroupItem } from '@mytypes/group';

interface GroupRow extends RowDataPacket {
  id: number;
  owner_id: number;
  owner_name: string;
  category_id: number | null;
  category_name: string | null;
  name: string;
  description: string;
  member_count: number;
  is_member: number;
  created_at: Date;
  updated_at: Date;
}

interface CategoryRow extends RowDataPacket {
  id: number;
}

interface MembershipRow extends RowDataPacket {
  id: number;
}

interface GroupOwnerRow extends RowDataPacket {
  owner_id: number;
}

interface CreateGroupInput {
  ownerId: number;
  name: string;
  description: string;
  categoryId?: number | null;
}

interface GetGroupsInput {
  userId: number;
  categoryId?: number;
}

const mapGroupRow = (row: GroupRow): GroupItem => ({
  id: row.id,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  categoryId: row.category_id,
  categoryName: row.category_name,
  name: row.name,
  description: row.description,
  memberCount: Number(row.member_count),
  isMember: Boolean(row.is_member),
  isOwner: Boolean(row.is_member && row.owner_id),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const GROUP_SELECT = `
  SELECT
    g.id,
    g.owner_id,
    u.name AS owner_name,
    g.category_id,
    c.name AS category_name,
    g.name,
    g.description,
    COALESCE(member_counts.member_count, 0) AS member_count,
    CASE WHEN my_member.id IS NULL THEN 0 ELSE 1 END AS is_member,
    g.created_at,
    g.updated_at
  FROM \`groups\` g
  INNER JOIN users u ON u.id = g.owner_id
  LEFT JOIN category c ON c.id = g.category_id
  LEFT JOIN (
    SELECT group_id, COUNT(*) AS member_count
    FROM group_members
    GROUP BY group_id
  ) member_counts ON member_counts.group_id = g.id
  LEFT JOIN group_members my_member
    ON my_member.group_id = g.id AND my_member.user_id = ?
`;

export class GroupService {
  private static async ensureCategory(categoryId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<CategoryRow[]>(
      `
      SELECT id
      FROM category
      WHERE id = ?
      LIMIT 1
      `,
      [categoryId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.ME.CATEGORY_NOT_FOUND);
    }
  }

  static async getGroups(filters: GetGroupsInput): Promise<GroupItem[]> {
    const pool = Db.getPool();
    const conditions: string[] = [];
    const values: Array<number> = [filters.userId];

    if (filters.categoryId !== undefined) {
      conditions.push('g.category_id = ?');
      values.push(filters.categoryId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute<GroupRow[]>(
      `
      ${GROUP_SELECT}
      ${whereClause}
      ORDER BY g.created_at DESC, g.id DESC
      `,
      values
    );

    return rows.map((row) => ({
      ...mapGroupRow(row),
      isOwner: row.owner_id === filters.userId,
    }));
  }

  static async getGroupById(groupId: number, userId: number): Promise<GroupItem> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<GroupRow[]>(
      `
      ${GROUP_SELECT}
      WHERE g.id = ?
      LIMIT 1
      `,
      [userId, groupId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.GROUP.GROUP_NOT_FOUND);
    }

    return {
      ...mapGroupRow(rows[0]),
      isOwner: rows[0].owner_id === userId,
    };
  }

  static async createGroup(data: CreateGroupInput): Promise<GroupItem> {
    const pool = Db.getPool();
    const categoryId = data.categoryId ?? null;

    if (categoryId !== null) {
      await GroupService.ensureCategory(categoryId);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO \`groups\` (owner_id, category_id, name, description)
        VALUES (?, ?, ?, ?)
        `,
        [data.ownerId, categoryId, data.name, data.description]
      );

      await connection.execute(
        `
        INSERT INTO group_members (group_id, user_id)
        VALUES (?, ?)
        `,
        [result.insertId, data.ownerId]
      );

      await connection.commit();

      return GroupService.getGroupById(result.insertId, data.ownerId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async deleteGroup(
    groupId: number,
    userId: number,
    role: UserRole
  ): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<GroupOwnerRow[]>(
      `
      SELECT owner_id
      FROM \`groups\`
      WHERE id = ?
      LIMIT 1
      `,
      [groupId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.GROUP.GROUP_NOT_FOUND);
    }

    if (rows[0].owner_id !== userId && role !== 'admin') {
      throw new Error(ERR_MSGS.GROUP.GROUP_NOT_OWNER);
    }

    await pool.execute(
      `
      DELETE FROM \`groups\`
      WHERE id = ?
      `,
      [groupId]
    );
  }

  static async joinGroup(groupId: number, userId: number): Promise<GroupItem> {
    const pool = Db.getPool();

    await GroupService.getGroupById(groupId, userId);

    const [existingRows] = await pool.execute<MembershipRow[]>(
      `
      SELECT id
      FROM group_members
      WHERE group_id = ? AND user_id = ?
      LIMIT 1
      `,
      [groupId, userId]
    );

    if (existingRows.length > 0) {
      throw new Error(ERR_MSGS.GROUP.ALREADY_MEMBER);
    }

    await pool.execute(
      `
      INSERT INTO group_members (group_id, user_id)
      VALUES (?, ?)
      `,
      [groupId, userId]
    );

    return GroupService.getGroupById(groupId, userId);
  }

  static async leaveGroup(groupId: number, userId: number): Promise<GroupItem> {
    const pool = Db.getPool();
    const group = await GroupService.getGroupById(groupId, userId);

    if (group.ownerId === userId) {
      throw new Error(ERR_MSGS.GROUP.OWNER_CANNOT_LEAVE);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `
      DELETE FROM group_members
      WHERE group_id = ? AND user_id = ?
      `,
      [groupId, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error(ERR_MSGS.GROUP.MEMBERSHIP_NOT_FOUND);
    }

    return GroupService.getGroupById(groupId, userId);
  }
}
