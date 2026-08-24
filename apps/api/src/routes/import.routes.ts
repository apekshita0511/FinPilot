import { Router } from 'express';

import * as importController from '../controllers/import.controller';
import { requireAuth } from '../middleware/auth';

export const importRouter = Router();

importRouter.use(requireAuth);

importRouter.get('/', importController.list);
importRouter.post('/transactions', importController.uploadMiddleware, importController.importTransactions);
importRouter.get('/:id', importController.get);
