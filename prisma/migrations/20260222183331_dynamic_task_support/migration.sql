-- AlterTable
ALTER TABLE "task_executions" ADD COLUMN     "output" JSONB;

-- AlterTable
ALTER TABLE "workflow_executions" ADD COLUMN     "input" JSONB;
