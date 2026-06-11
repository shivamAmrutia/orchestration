import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function main() {
  console.log('🌱 Seeding database...');

  console.log('🧹 Cleaning up existing data...');
  await prisma.taskExecution.deleteMany({});
  await prisma.workflowExecution.deleteMany({});
  await prisma.taskDependency.deleteMany({});
  await prisma.tasks.deleteMany({});
  await prisma.workflows.deleteMany({});
  console.log('✅ Cleaned up existing data');

  const workflow = await prisma.workflows.create({
    data: {
      name: 'demo_io_pipeline',
      description: 'Sample DAG using registered IO_ECHO tasks',
    },
  });

  console.log(`✅ Created workflow: ${workflow.name} (${workflow.id})`);

  const buildTask = await prisma.tasks.create({
    data: {
      workflowId: workflow.id,
      name: 'build',
      type: 'IO_ECHO',
      config: { emit: { stage: 'build', ok: true } },
    },
  });

  const testTask = await prisma.tasks.create({
    data: {
      workflowId: workflow.id,
      name: 'test',
      type: 'IO_ECHO',
      config: { emit: { stage: 'test', ok: true } },
    },
  });

  const deployTask = await prisma.tasks.create({
    data: {
      workflowId: workflow.id,
      name: 'deploy',
      type: 'IO_ECHO',
      config: { emit: { stage: 'deploy', ok: true } },
    },
  });

  console.log('✅ Created tasks: build, test, deploy (IO_ECHO)');

  await prisma.taskDependency.create({
    data: {
      taskId: testTask.id,
      dependsOnTaskId: buildTask.id,
    },
  });

  await prisma.taskDependency.create({
    data: {
      taskId: deployTask.id,
      dependsOnTaskId: testTask.id,
    },
  });

  console.log('✅ Created task dependencies: build → test → deploy');

  const port = process.env.PORT || 3000;
  console.log('🎉 Seeding completed!');
  console.log(`\nWorkflow ID: ${workflow.id}`);
  console.log(`Trigger via API: POST http://localhost:${port}/api/workflows/${workflow.id}/run`);
  console.log('Run IO tests: npm run test:io');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
