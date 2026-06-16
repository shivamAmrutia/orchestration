import prisma from "../../prisma/client.js";

export const JobStatus = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
});

export async function enqueueExecution(workflowExecutionId) {
  return prisma.executionJob.create({
    data: {
      workflowExecutionId,
      status: JobStatus.PENDING
    }
  });
}

export async function claimNextJob() {
  return prisma.$transaction(async (tx) => {
    const job = await tx.executionJob.findFirst({
      where: { status: JobStatus.PENDING },
      orderBy: { createdAt: "asc" }
    });

    if (!job) return null;

    return tx.executionJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PROCESSING,
        startedAt: new Date()
      }
    });
  });
}

export async function completeJob(jobId) {
  return prisma.executionJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.COMPLETED,
      finishedAt: new Date()
    }
  });
}

export async function failJob(jobId, errorMessage) {
  return prisma.executionJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.FAILED,
      finishedAt: new Date(),
      error: errorMessage
    }
  });
}
