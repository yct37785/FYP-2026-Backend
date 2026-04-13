import { Request, Response, NextFunction } from 'express';
import { NoteService } from '@services/noteService';

export class NoteController {
  static async createNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          error: 'title and content are required',
        });
      }

      const id = await NoteService.createNote({ title, content });

      return res.status(201).json({
        message: 'Note created',
        id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNote(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.query.id);

      if (!req.query.id || Number.isNaN(id)) {
        return res.status(400).json({
          error: 'valid id query parameter is required',
        });
      }

      const note = await NoteService.getNoteById(id);

      if (!note) {
        return res.status(404).json({
          error: 'Note not found',
        });
      }

      return res.status(200).json(note);
    } catch (error) {
      next(error);
    }
  }
}