export type AccountType = 'BANK' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT' | 'OTHER';

export type CategoryType = 'INCOME' | 'EXPENSE';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export type TransactionSource = 'MANUAL' | 'IMPORT';

export type ImportBatchStatus = 'COMPLETED' | 'FAILED';
