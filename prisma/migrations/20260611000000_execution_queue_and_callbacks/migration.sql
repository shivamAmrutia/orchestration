-- AlterTable
ALTER TABLE "workflow_executions" ADD COLUMN "callbackUrl" TEXT;

-- CreateTable
CREATE TABLE "execution_jobs" (
    "id" TEXT NOT NULL,
    "workflowExecutionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "execution_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "execution_jobs_workflowExecutionId_key" ON "execution_jobs"("workflowExecutionId");

-- CreateIndex
CREATE INDEX "execution_jobs_status_createdAt_idx" ON "execution_jobs"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "execution_jobs" ADD CONSTRAINT "execution_jobs_workflowExecutionId_fkey" FOREIGN KEY ("workflowExecutionId") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
