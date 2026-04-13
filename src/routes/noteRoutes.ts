import { Router } from 'express';
import { NoteController } from '@controllers/noteController';
import { authMiddleware } from '@middlewares/authMiddleware';

const router = Router();

router.get('/note', authMiddleware, NoteController.getNote);
router.post('/note', authMiddleware, NoteController.createNote);

export default router;