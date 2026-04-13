import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '@config/db';
import { CreateNoteInput, Note } from '@mytypes/note';

interface NoteRow extends Note, RowDataPacket {}

export class NoteService {
  static async createNote(data: CreateNoteInput): Promise<number> {
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO notes (title, content) VALUES (?, ?)',
      [data.title, data.content]
    );

    return result.insertId;
  }

  static async getNoteById(id: number): Promise<Note | null> {
    const [rows] = await db.execute<NoteRow[]>(
      'SELECT id, title, content, created_at FROM notes WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }
}