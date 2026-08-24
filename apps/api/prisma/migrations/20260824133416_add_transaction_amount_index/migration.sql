-- CreateIndex
CREATE INDEX "transactions_user_id_amount_idx" ON "transactions"("user_id", "amount");
