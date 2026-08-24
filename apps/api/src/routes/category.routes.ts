import { Router } from 'express';

import * as categoryController from '../controllers/category.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../validation/category.validation';

export const categoryRouter = Router();

categoryRouter.use(requireAuth);

categoryRouter.get('/', categoryController.list);
categoryRouter.post('/', validateBody(createCategorySchema), categoryController.create);
categoryRouter.patch('/:id', validateBody(updateCategorySchema), categoryController.update);
categoryRouter.delete('/:id', categoryController.remove);
