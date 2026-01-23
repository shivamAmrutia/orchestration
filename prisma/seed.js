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

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning up existing data...');
  await prisma.taskDependency.deleteMany({});
  await prisma.tasks.deleteMany({});
  await prisma.workflows.deleteMany({});
  console.log('✅ Cleaned up existing data');

  // Create a CI pipeline workflow
  const workflow = await prisma.workflows.create({
    data: {
      name: 'ci_pipeline',
      description: 'CI/CD Pipeline with build, test, and deploy tasks',
    },
  });

  console.log(`✅ Created workflow: ${workflow.name} (${workflow.id})`);

  // Create tasks
  const buildTask = await prisma.tasks.create({
    data: {
      workflowId: workflow.id,
      name: 'build',
      type: 'build',
      config: {
        command: 'npm run build',
        timeout: 300000,
      },
    },
  });

  const testTask = await prisma.tasks.create({
    data: {
      workflowId: workflow.id,
      name: 'test',
      type: 'test',
      config: {
        command: 'npm test',
        timeout: 60000,
      },
    },
  });

  const deployTask = await prisma.tasks.create({
    data: {
      workflowId: workflow.id,
      name: 'deploy',
      type: 'deploy',
      config: {
        command: 'npm run deploy',
        environment: 'production',
      },
    },
  });

  console.log(`✅ Created tasks: build, test, deploy`);

  // Create task dependencies
  // test depends on build (test runs after build completes)
  await prisma.taskDependency.create({
    data: {
      taskId: testTask.id,
      dependsOnTaskId: buildTask.id,
    },
  });

  // deploy depends on test (deploy runs after test completes)
  await prisma.taskDependency.create({
    data: {
      taskId: deployTask.id,
      dependsOnTaskId: testTask.id,
    },
  });

  console.log('✅ Created task dependencies: build → test → deploy');

  console.log('🎉 Seeding completed!');
  console.log(`\nWorkflow ID: ${workflow.id}`);
  console.log(`You can now run: WORKFLOW_ID=${workflow.id} node src/index.js`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
