import { Router } from 'express';

import * as budgetController from '../controllers/budget.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { createBudgetSchema, listBudgetsQuerySchema, updateBudgetSchema } from '../validation/budget.validation';

export const budgetRouter = Router();

budgetRouter.use(requireAuth);

budgetRouter.get('/', validateQuery(listBudgetsQuerySchema), budgetController.list);
budgetRouter.post('/', validateBody(createBudgetSchema), budgetController.create);
budgetRouter.get('/:id', budgetController.get);
budgetRouter.patch('/:id', validateBody(updateBudgetSchema), budgetController.update);
budgetRouter.delete('/:id', budgetController.remove);
