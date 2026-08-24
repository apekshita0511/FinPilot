import { Router } from 'express';

import * as transactionController from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from '../validation/transaction.validation';

export const transactionRouter = Router();

transactionRouter.use(requireAuth);

transactionRouter.get('/', validateQuery(listTransactionsQuerySchema), transactionController.list);
transactionRouter.post('/', validateBody(createTransactionSchema), transactionController.create);
transactionRouter.get('/:id', transactionController.get);
transactionRouter.patch('/:id', validateBody(updateTransactionSchema), transactionController.update);
transactionRouter.delete('/:id', transactionController.remove);
