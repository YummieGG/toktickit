import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { hashPassword, validatePassword } from '../src/lib/password';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/toktickit_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const initialUsers = [
  { name: 'Somchai Prasert', email: 'somchai.p@toktickit.local', role: 'REQUESTER', isActive: true },
  { name: 'Suda Srisawat', email: 'suda.s@toktickit.local', role: 'REQUESTER', isActive: true },
  { name: 'Anan Sukjai', email: 'anan.s@toktickit.local', role: 'REQUESTER', isActive: true },
  { name: 'Kanda Meechai', email: 'kanda.m@toktickit.local', role: 'REQUESTER', isActive: true },
  { name: 'Wichai Retired', email: 'wichai.r@toktickit.local', role: 'REQUESTER', isActive: false },
  { name: 'Narin Support', email: 'narin.staff@toktickit.local', role: 'IT_STAFF', isActive: true },
  { name: 'Pimchanok Support', email: 'pimchanok.staff@toktickit.local', role: 'IT_STAFF', isActive: true },
  { name: 'Chaiwat Support', email: 'chaiwat.staff@toktickit.local', role: 'IT_STAFF', isActive: true },
  { name: 'Somsak Former Support', email: 'somsak.staff@toktickit.local', role: 'IT_STAFF', isActive: false },
  { name: 'Araya Administrator', email: 'araya.admin@toktickit.local', role: 'ADMINISTRATOR', isActive: true },
] as const;

const categories = ['Account and Access', 'Hardware', 'Software', 'Network'];
const relatedSystems = ['Email', 'Campus Wi-Fi', 'VPN', 'LEB2 App', 'Grade Submission App', 'Printer'];

async function getInitialPassword(): Promise<string> {
  const value = process.env.SEED_INITIAL_PASSWORD;
  if (!value || validatePassword(value)) {
    throw new Error('SEED_INITIAL_PASSWORD is missing or does not meet the password policy');
  }
  return value;
}

export async function main(): Promise<void> {
  // Validate and derive every password before opening the write transaction.
  // Each account gets a fresh salt, including legacy rows being backfilled.
  const initialPassword = await getInitialPassword();
  const legacyUsers = await prisma.user.findMany({
    where: { passwordHash: null },
    select: { id: true },
  });
  const legacyHashes = new Map<number, string>();
  for (const user of legacyUsers) {
    legacyHashes.set(user.id, await hashPassword(initialPassword));
  }

  const initialHashes = new Map<string, string>();
  for (const user of initialUsers) {
    initialHashes.set(user.email, await hashPassword(initialPassword));
  }

  await prisma.$transaction(async (transaction: any) => {
    for (const categoryName of categories) {
      await transaction.category.upsert({
        where: { name: categoryName },
        update: { isActive: true },
        create: { name: categoryName, isActive: true },
      });
    }

    for (const systemName of relatedSystems) {
      await transaction.relatedSystem.upsert({
        where: { name: systemName },
        update: { isActive: true },
        create: { name: systemName, isActive: true },
      });
    }

    for (const user of initialUsers) {
      await transaction.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
        create: {
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          passwordHash: initialHashes.get(user.email)!,
          mustChangePassword: true,
        },
      });
    }

    for (const [id, passwordHash] of legacyHashes) {
      await transaction.user.updateMany({
        where: { id, passwordHash: null },
        data: { passwordHash, mustChangePassword: true },
      });
    }
  });

  console.log(`Seeded ${initialUsers.length} deterministic users and preserved existing password hashes.`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error instanceof Error ? error.message : 'Unexpected error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
