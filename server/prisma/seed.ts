import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding database...');

  // 1. Seed Categories
  const categories = [
    'Account and Access',
    'Hardware',
    'Software',
    'Network'
  ];

  console.log('Seeding categories...');
  for (const categoryName of categories) {
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: { isActive: true },
      create: { name: categoryName, isActive: true },
    });
    console.log(`Upserted Category: ${category.name}`);
  }

  // 2. Seed Related Systems
  const relatedSystems = [
    'ERP System',
    'HRMS',
    'Email Server',
    'VPN',
    'Intranet Portal',
    'CRM System'
  ];

  console.log('Seeding related systems...');
  for (const systemName of relatedSystems) {
    const system = await prisma.relatedSystem.upsert({
      where: { name: systemName },
      update: { isActive: true },
      create: { name: systemName, isActive: true },
    });
    console.log(`Upserted Related System: ${system.name}`);
  }

  // 3. Seed Requester Users (4 active, 1 inactive)
  const requesters = [
    { name: 'Alice Smith', email: 'alice.s@company.com', isActive: true },
    { name: 'Bob Jones', email: 'bob.j@company.com', isActive: true },
    { name: 'Charlie Brown', email: 'charlie.b@company.com', isActive: true },
    { name: 'Diana Prince', email: 'diana.p@company.com', isActive: true },
    { name: 'Eve Inactive', email: 'eve.i@company.com', isActive: false },
  ];

  console.log('Seeding requesters...');
  for (const req of requesters) {
    const requester = await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { name: req.name, isActive: req.isActive },
      create: { name: req.name, email: req.email, isActive: req.isActive },
    });
    console.log(`Upserted Requester: ${requester.name} (${requester.isActive ? 'Active' : 'Inactive'})`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
