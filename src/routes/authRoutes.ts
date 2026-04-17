import { Router } from 'express';
import { AuthService } from '@services/authService';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: ERR_MSGS.AUTH.NAME_EMAIL_PASSWORD_REQUIRED,
      });
    }

    const result = await AuthService.register({ name, email, password, role: 'user' });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: ERR_MSGS.AUTH.EMAIL_PASSWORD_REQUIRED,
      });
    }

    const result = await AuthService.login({ email, password });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;