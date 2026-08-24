import { Router } from 'express';

import * as transferController from '../controllers/transfer.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createTransferSchema } from '../validation/transfer.validation';

export const transferRouter = Router();

transferRouter.use(requireAuth);

transferRouter.get('/', transferController.list);
transferRouter.post('/', validateBody(createTransferSchema), transferController.create);
transferRouter.get('/:id', transferController.get);
