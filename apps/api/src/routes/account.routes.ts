import { Router } from 'express';

import * as accountController from '../controllers/account.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createAccountSchema, updateAccountSchema } from '../validation/account.validation';

export const accountRouter = Router();

accountRouter.use(requireAuth);

accountRouter.get('/', accountController.list);
accountRouter.post('/', validateBody(createAccountSchema), accountController.create);
accountRouter.get('/:id', accountController.get);
accountRouter.patch('/:id', validateBody(updateAccountSchema), accountController.update);
accountRouter.delete('/:id', accountController.archive);
