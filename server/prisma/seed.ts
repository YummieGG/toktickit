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
  console.log('Start seeding database for Lab 2...');

  // 1. Seed Categories (4 categories)
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
    console.log(`Upserted Category: ${category.name} (id: ${category.id})`);
  }

  // 2. Seed Related Systems (6 systems from specification.md)
  const relatedSystems = [
    'Email',
    'Campus Wi-Fi',
    'VPN',
    'LEB2 App',
    'Grade Submission App',
    'Printer'
  ];

  console.log('Seeding related systems...');
  for (const systemName of relatedSystems) {
    const system = await prisma.relatedSystem.upsert({
      where: { name: systemName },
      update: { isActive: true },
      create: { name: systemName, isActive: true },
    });
    console.log(`Upserted Related System: ${system.name} (id: ${system.id})`);
  }

  // 3. Seed Requester Users (4 active, 1 inactive)
  const requesters = [
    { name: 'Somchai Prasert', email: 'somchai.p@toktickit.local', isActive: true },
    { name: 'Suda Srisawat', email: 'suda.s@toktickit.local', isActive: true },
    { name: 'Anan Sukjai', email: 'anan.s@toktickit.local', isActive: true },
    { name: 'Kanda Meechai', email: 'kanda.m@toktickit.local', isActive: true },
    { name: 'Wichai Retired', email: 'wichai.r@toktickit.local', isActive: false },
  ];

  console.log('Seeding requesters...');
  for (const req of requesters) {
    const requester = await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { name: req.name, isActive: req.isActive },
      create: { name: req.name, email: req.email, isActive: req.isActive },
    });
    console.log(`Upserted Requester: ${requester.name} (${requester.isActive ? 'Active' : 'Inactive'}, id: ${requester.id})`);
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
