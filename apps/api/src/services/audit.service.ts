import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/**
 * Always called from inside the same DB transaction as the mutation it's
 * recording, so an audit entry can never exist without the mutation having
 * committed, and vice versa.
 */
export async function recordAudit(
  tx: Db,
  params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.auditEntry.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
