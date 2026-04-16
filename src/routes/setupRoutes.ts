import { Router } from 'express';
import { SetupController } from '@controllers/setupController';

const router = Router();

router.post('/', SetupController.setup);

export default router;