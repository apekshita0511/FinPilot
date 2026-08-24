import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../middleware/errorHandler';
import * as importService from '../services/import.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — generous for a personal-finance CSV export
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      cb(new ApiError(422, 'Only .csv files are supported'));
      return;
    }
    cb(null, true);
  },
});

export const uploadMiddleware = upload.single('file');

export const importTransactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'A CSV file is required (multipart field name: "file")');
  }

  const accountId = z.string().uuid().safeParse(req.body?.accountId);
  if (!accountId.success) {
    throw new ApiError(422, 'accountId is required and must be a valid account id');
  }

  const result = await importService.importTransactionsFromCsv(
    req.userId,
    accountId.data,
    req.file.originalname,
    req.file.buffer,
  );

  res.status(201).json(result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const importBatches = await importService.listImportBatches(req.userId);
  res.json({ importBatches });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const importBatch = await importService.getImportBatch(req.userId, req.params.id as string);
  res.json({ importBatch });
});
