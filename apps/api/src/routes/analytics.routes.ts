import { Router } from 'express';

import * as analyticsController from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { monthQuerySchema } from '../validation/analytics.validation';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get('/summary', validateQuery(monthQuerySchema), analyticsController.summary);
analyticsRouter.get('/spending-by-category', validateQuery(monthQuerySchema), analyticsController.spendingByCategory);
