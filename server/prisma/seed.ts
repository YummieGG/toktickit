import { PrismaClient, type Prisma, type RequestedPriority, type TicketStatus, type UserRole } from '../generated/prisma';
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
] satisfies ReadonlyArray<{
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}>;

const categories = ['Account and Access', 'Hardware', 'Software', 'Network'];
const relatedSystems = ['Email', 'Campus Wi-Fi', 'VPN', 'LEB2 App', 'Grade Submission App', 'Printer'];

const seedTickets = [
  {
    ticketNumber: 'TK-SEED-001',
    summary: 'Unable to access campus email',
    description: 'The requester receives an authentication error when opening the campus email service.',
    requesterEmail: 'somchai.p@toktickit.local',
    categoryName: 'Account and Access',
    relatedSystemName: 'Email',
    requestedPriority: 'HIGH',
    itPriority: 'CRITICAL',
    currentStatus: 'NEW',
    ownerEmail: null,
    ticketDate: '2026-09-01T08:00:00.000Z',
  },
  {
    ticketNumber: 'TK-SEED-002',
    summary: 'Laptop does not start after update',
    description: 'The device shows a blank screen after the latest operating system update.',
    requesterEmail: 'suda.s@toktickit.local',
    categoryName: 'Hardware',
    relatedSystemName: null,
    requestedPriority: 'MEDIUM',
    itPriority: 'HIGH',
    currentStatus: 'OPEN',
    ownerEmail: 'narin.staff@toktickit.local',
    ticketDate: '2026-09-02T09:15:00.000Z',
  },
  {
    ticketNumber: 'TK-SEED-003',
    summary: 'VPN disconnects during class',
    description: 'The VPN connection drops every few minutes while the requester is on campus Wi-Fi.',
    requesterEmail: 'anan.s@toktickit.local',
    categoryName: 'Network',
    relatedSystemName: 'VPN',
    requestedPriority: 'HIGH',
    itPriority: 'MEDIUM',
    currentStatus: 'IN_PROGRESS',
    ownerEmail: 'pimchanok.staff@toktickit.local',
    ticketDate: '2026-09-03T10:30:00.000Z',
  },
  {
    ticketNumber: 'TK-SEED-004',
    summary: 'Grade submission page needs requester input',
    description: 'The support team is waiting for a screenshot and the course section name.',
    requesterEmail: 'kanda.m@toktickit.local',
    categoryName: 'Software',
    relatedSystemName: 'Grade Submission App',
    requestedPriority: 'LOW',
    itPriority: 'MEDIUM',
    currentStatus: 'WAITING_FOR_REQUESTER',
    ownerEmail: 'chaiwat.staff@toktickit.local',
    ticketDate: '2026-09-04T11:45:00.000Z',
  },
  {
    ticketNumber: 'TK-SEED-005',
    summary: 'Printer queue configuration corrected',
    description: 'The department printer was configured with the correct driver and is ready for confirmation.',
    requesterEmail: 'somchai.p@toktickit.local',
    categoryName: 'Hardware',
    relatedSystemName: 'Printer',
    requestedPriority: 'MEDIUM',
    itPriority: 'HIGH',
    currentStatus: 'RESOLVED',
    ownerEmail: 'narin.staff@toktickit.local',
    ticketDate: '2026-09-05T13:00:00.000Z',
    problemAppearsResolvedAt: '2026-09-06T08:00:00.000Z',
  },
  {
    ticketNumber: 'TK-SEED-006',
    summary: 'Shared mailbox permissions restored',
    description: 'The shared mailbox permissions were repaired and the requester confirmed access.',
    requesterEmail: 'suda.s@toktickit.local',
    categoryName: 'Account and Access',
    relatedSystemName: 'Email',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    currentStatus: 'CLOSED',
    ownerEmail: 'araya.admin@toktickit.local',
    ticketDate: '2026-09-06T14:20:00.000Z',
    problemAppearsResolvedAt: '2026-09-07T09:00:00.000Z',
  },
  {
    ticketNumber: 'TK-SEED-007',
    summary: 'Wi-Fi issue returned after initial fix',
    description: 'The requester reopened the ticket after the connection problem returned the next day.',
    requesterEmail: 'anan.s@toktickit.local',
    categoryName: 'Network',
    relatedSystemName: 'Campus Wi-Fi',
    requestedPriority: 'CRITICAL',
    itPriority: 'CRITICAL',
    currentStatus: 'REOPENED',
    ownerEmail: 'pimchanok.staff@toktickit.local',
    ticketDate: '2026-09-07T15:10:00.000Z',
  },
  {
    ticketNumber: 'TK-SEED-008',
    summary: 'Duplicate software request cancelled',
    description: 'This request duplicated an existing software installation ticket and was cancelled.',
    requesterEmail: 'kanda.m@toktickit.local',
    categoryName: 'Software',
    relatedSystemName: 'LEB2 App',
    requestedPriority: 'LOW',
    itPriority: 'LOW',
    currentStatus: 'CANCELLED',
    ownerEmail: null,
    ticketDate: '2026-09-08T16:25:00.000Z',
  },
] satisfies ReadonlyArray<{
  ticketNumber: string;
  summary: string;
  description: string;
  requesterEmail: string;
  categoryName: string;
  relatedSystemName: string | null;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  currentStatus: TicketStatus;
  ownerEmail: string | null;
  ticketDate: string;
  problemAppearsResolvedAt?: string;
}>;

const seedEntries = [
  { ticketNumber: 'TK-SEED-001', type: 'comment', authorEmail: 'somchai.p@toktickit.local', content: 'I can reproduce the sign-in error on the campus email service.' },
  { ticketNumber: 'TK-SEED-002', type: 'note', authorEmail: 'narin.staff@toktickit.local', content: 'Check the device recovery partition before reinstalling the operating system.' },
  { ticketNumber: 'TK-SEED-003', type: 'comment', authorEmail: 'pimchanok.staff@toktickit.local', content: 'We are checking the wireless access point logs and VPN gateway logs.' },
  { ticketNumber: 'TK-SEED-004', type: 'note', authorEmail: 'chaiwat.staff@toktickit.local', content: 'Waiting for the requester to provide the course section and screenshot.' },
  { ticketNumber: 'TK-SEED-005', type: 'comment', authorEmail: 'somchai.p@toktickit.local', content: 'The printer is working from my workstation now.' },
  { ticketNumber: 'TK-SEED-006', type: 'note', authorEmail: 'araya.admin@toktickit.local', content: 'Closure confirmed after requester validation.' },
] as const;

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

  await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    const categoryIds = new Map<string, number>();
    for (const categoryName of categories) {
      const category = await transaction.category.upsert({
        where: { name: categoryName },
        update: { isActive: true },
        create: { name: categoryName, isActive: true },
      });
      categoryIds.set(categoryName, category.id);
    }

    const relatedSystemIds = new Map<string, number>();
    for (const systemName of relatedSystems) {
      const relatedSystem = await transaction.relatedSystem.upsert({
        where: { name: systemName },
        update: { isActive: true },
        create: { name: systemName, isActive: true },
      });
      relatedSystemIds.set(systemName, relatedSystem.id);
    }

    const userIds = new Map<string, number>();
    for (const user of initialUsers) {
      const seededUser = await transaction.user.upsert({
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
      userIds.set(user.email, seededUser.id);
    }

    for (const [id, passwordHash] of legacyHashes) {
      await transaction.user.updateMany({
        where: { id, passwordHash: null },
        data: { passwordHash, mustChangePassword: true },
      });
    }

    const ticketIds = new Map<string, number>();
    for (const [index, ticket] of seedTickets.entries()) {
      const ticketDate = new Date(ticket.ticketDate);
      const seededTicket = await transaction.ticket.upsert({
        where: { ticketNumber: ticket.ticketNumber },
        // Preserve any workflow changes made to an existing local fixture.
        update: {},
        create: {
          ticketNumber: ticket.ticketNumber,
          summary: ticket.summary,
          description: ticket.description,
          requestedPriority: ticket.requestedPriority,
          itPriority: ticket.itPriority,
          currentStatus: ticket.currentStatus,
          ticketDate,
          createdAt: ticketDate,
          updatedAt: new Date(ticketDate.getTime() + (index + 1) * 60 * 60 * 1000),
          problemAppearsResolvedAt: ticket.problemAppearsResolvedAt ? new Date(ticket.problemAppearsResolvedAt) : null,
          requesterId: userIds.get(ticket.requesterEmail)!,
          ownerId: ticket.ownerEmail ? userIds.get(ticket.ownerEmail)! : null,
          categoryId: categoryIds.get(ticket.categoryName)!,
          relatedSystemId: ticket.relatedSystemName ? relatedSystemIds.get(ticket.relatedSystemName)! : null,
        },
      });
      ticketIds.set(ticket.ticketNumber, seededTicket.id);
    }

    for (const [index, entry] of seedEntries.entries()) {
      const ticketId = ticketIds.get(entry.ticketNumber)!;
      const authorId = userIds.get(entry.authorEmail)!;
      const createdAt = new Date(`2026-09-${String(10 + index).padStart(2, '0')}T09:00:00.000Z`);
      if (entry.type === 'comment') {
        const existing = await transaction.publicComment.findFirst({
          where: { ticketId, authorId, content: entry.content },
          select: { id: true },
        });
        if (!existing) {
          await transaction.publicComment.create({ data: { ticketId, authorId, content: entry.content, createdAt } });
        }
      } else {
        const existing = await transaction.internalNote.findFirst({
          where: { ticketId, authorId, content: entry.content },
          select: { id: true },
        });
        if (!existing) {
          await transaction.internalNote.create({ data: { ticketId, authorId, content: entry.content, createdAt } });
        }
      }
    }
  });

  console.log(`Seeded ${initialUsers.length} deterministic users and ${seedTickets.length} workflow tickets; preserved existing password hashes and ticket changes.`);
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
