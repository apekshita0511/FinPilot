import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { env } from './lib/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { accountRouter } from './routes/account.routes';
import { authRouter } from './routes/auth.routes';
import { budgetRouter } from './routes/budget.routes';
import { categoryRouter } from './routes/category.routes';
import { healthRouter } from './routes/health.routes';
import { importRouter } from './routes/import.routes';
import { transactionRouter } from './routes/transaction.routes';
import { transferRouter } from './routes/transfer.routes';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/accounts', accountRouter);
  app.use('/api/categories', categoryRouter);
  app.use('/api/transactions', transactionRouter);
  app.use('/api/transfers', transferRouter);
  app.use('/api/budgets', budgetRouter);
  app.use('/api/imports', importRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
