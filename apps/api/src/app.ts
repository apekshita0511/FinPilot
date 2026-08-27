import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { env } from './lib/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { accountRouter } from './routes/account.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { authRouter } from './routes/auth.routes';
import { budgetRouter } from './routes/budget.routes';
import { categoryRouter } from './routes/category.routes';
import { healthRouter } from './routes/health.routes';
import { transactionRouter } from './routes/transaction.routes';

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
  app.use('/api/budgets', budgetRouter);
  app.use('/api/analytics', analyticsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Vercel detects this default export and runs the whole Express app as one
// serverless function. server.ts uses the same factory for local dev.
export default createApp();
